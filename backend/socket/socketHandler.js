const Message = require('../models/Message');
const User = require('../models/User');
const { sendPushNotification } = require('../config/firebase');

module.exports = (io) => {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return;

    onlineUsers.set(userId, socket.id);
    User.findByIdAndUpdate(userId, { socketId: socket.id, isOnline: true }).exec();
    io.emit('user_status', { userId, isOnline: true });

    socket.on('send_message', async (data) => {
      const { senderId, receiverId, text, fileUrl, fileType, replyTo } = data;

      const message = await Message.create({
        senderId,
        receiverId,
        text,
        fileUrl: fileUrl || '',
        fileType: fileType || 'text',
        replyTo: replyTo || null,
        delivered: onlineUsers.has(receiverId),
      });

      await message.populate('senderId', 'name profileImage');
      await message.populate('replyTo');

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', message);
        await Message.findByIdAndUpdate(message._id, { delivered: true });
      } else {
        const receiver = await User.findById(receiverId);
        if (receiver?.fcmToken) {
          const sender = await User.findById(senderId);
          await sendPushNotification({
            token: receiver.fcmToken,
            title: sender?.name || 'Chatzz',
            body: fileType === 'image' ? '📷 Photo' : fileType === 'file' ? '📎 File' : text,
            data: { senderId, receiverId, type: 'message' },
          });
        }
      }

      socket.emit('message_sent', message);
    });

    socket.on('typing', ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { senderId });
      }
    });

    socket.on('stop_typing', ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('stop_typing', { senderId });
      }
    });

    socket.on('mark_read', async ({ messageIds, receiverId }) => {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { read: true }
      );
      const senderSocketId = onlineUsers.get(receiverId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_read', { messageIds });
      }
    });

    socket.on('message_deleted_everyone', ({ messageId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_deleted_everyone', { messageId });
      }
    });

    socket.on('chat_request', ({ request, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat_request_received', request);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      User.findByIdAndUpdate(userId, { isOnline: false, socketId: '' }).exec();
      io.emit('user_status', { userId, isOnline: false });
    });
  });
};
