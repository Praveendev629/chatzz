const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username profilePicture');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.username} (${userId})`);

    // Store socket
    onlineUsers.set(userId, socket.id);

    // Join personal room
    socket.join(userId);

    // Update online status
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // Broadcast online status to contacts
    socket.broadcast.emit('user_online', { userId, isOnline: true });

    // ─── Events ───────────────────────────────────────────────────────────────

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, receiverId, messageType, content, fileUrl, fileName, tempId } = data;

        const message = await Message.create({
          chatId,
          sender: userId,
          receiver: receiverId,
          messageType: messageType || 'text',
          content: content || '',
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          status: 'sent',
        });

        const Chat = require('../models/Chat');
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        const populated = await Message.findById(message._id).populate(
          'sender',
          '_id username profilePicture'
        );

        // Confirm to sender
        socket.emit('message_sent', { tempId, message: populated });

        // Deliver to receiver
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverId).emit('new_message', populated);

          // Mark as delivered
          await Message.findByIdAndUpdate(message._id, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
          socket.emit('message_delivered', { messageId: message._id });
        }
      } catch (err) {
        socket.emit('message_error', { error: err.message });
      }
    });

    // Typing indicator
    socket.on('typing', ({ chatId, receiverId }) => {
      io.to(receiverId).emit('user_typing', {
        chatId,
        userId,
        username: socket.user.username,
      });
    });

    socket.on('stop_typing', ({ chatId, receiverId }) => {
      io.to(receiverId).emit('user_stop_typing', { chatId, userId });
    });

    // Mark messages as seen
    socket.on('mark_seen', async ({ chatId, senderId }) => {
      await Message.updateMany(
        { chatId, receiver: userId, status: { $ne: 'seen' } },
        { status: 'seen', seenAt: new Date() }
      );
      io.to(senderId).emit('messages_seen', { chatId, seenBy: userId });
    });

    // Delete message
    socket.on('delete_message', async ({ messageId, deleteForEveryone, chatId, receiverId }) => {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (deleteForEveryone && message.sender.toString() === userId) {
        message.deletedForEveryone = true;
        message.content = '';
        message.fileUrl = null;
        await message.save();
        io.to(receiverId).emit('message_deleted_everyone', { messageId, chatId });
        socket.emit('message_deleted_everyone', { messageId, chatId });
      } else {
        if (!message.deletedFor.includes(userId)) {
          message.deletedFor.push(userId);
          await message.save();
        }
        socket.emit('message_deleted_for_me', { messageId, chatId });
      }
    });

    // Chat request response
    socket.on('request_response', (data) => {
      const { to, accepted, chatId } = data;
      io.to(to).emit('request_responded', { accepted, chatId, by: userId });
    });

    // ─── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() });
    });
  });

  // Expose io to routes via app
  return io;
};

module.exports = socketHandler;
