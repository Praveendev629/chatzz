const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Call = require('../models/Call');
const { sendPushNotification } = require('../config/firebase');
const { deleteFromCloudinary } = require('../utils/cloudinaryCleanup');

const onlineUsers = new Map();
const viewingChatMap = new Map();
const activeCalls = new Map(); // callerId -> { callDocId, callerId, receiverId, startedAt }
const pendingCalls = new Map(); // receiverId -> { offer, caller, callType, callerId, timeout }

const socketHandler = (io) => {
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username profilePicture fcmToken');
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

    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit('user_online', { userId, isOnline: true });

    // ─── Deliver pending call offers ────────────────────────────────────────
    const pending = pendingCalls.get(userId);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingCalls.delete(userId);
      socket.emit('call_offer', {
        from: pending.callerId,
        offer: pending.offer,
        caller: pending.caller,
        callType: pending.callType,
      });
      console.log(`Delivering pending call to ${socket.user.username}`);
    }

    // ─── Viewing Chat (suppress notifications) ──────────────────────────────
    socket.on('viewing_chat', ({ chatId }) => {
      if (chatId) {
        viewingChatMap.set(userId, chatId);
      } else {
        viewingChatMap.delete(userId);
      }
    });

    // ─── Send Message ──────────────────────────────────────────────────────────
    socket.on('send_message', async (data) => {
      try {
        const { chatId, receiverId, messageType, content, fileUrl, fileName, tempId, replyTo } = data;

        let replyToContent = null;
        let replyToSender = null;

        // Handle reply-to message
        if (replyTo) {
          const repliedMessage = await Message.findById(replyTo).populate('sender', 'username');
          if (repliedMessage) {
            replyToContent = repliedMessage.content || repliedMessage.fileName || (repliedMessage.messageType === 'image' ? '📷 Image' : repliedMessage.messageType === 'audio' ? '🎤 Voice message' : '📎 Document');
            replyToSender = repliedMessage.sender?.username || 'Unknown';
          }
        }

        const message = await Message.create({
          chatId,
          sender: userId,
          receiver: receiverId,
          messageType: messageType || 'text',
          content: content || '',
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          replyTo: replyTo || null,
          replyToContent,
          replyToSender,
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

        // Deliver to receiver via socket
        const receiverOnline = onlineUsers.has(receiverId);
        if (receiverOnline) {
          io.to(receiverId).emit('new_message', populated);
          await Message.findByIdAndUpdate(message._id, {
            status: 'delivered',
            deliveredAt: new Date(),
          });
          socket.emit('message_delivered', { messageId: message._id });
        }

        // ── Push notification to receiver (skip if viewing this chat) ──
        const viewingChatId = viewingChatMap.get(receiverId);
        if (viewingChatId !== chatId) {
          const receiver = await User.findById(receiverId).select('fcmToken');
          if (receiver?.fcmToken) {
            const notifBody =
              messageType === 'text'
                ? content
                : messageType === 'image'
                ? '📷 sent a photo'
                : messageType === 'audio'
                ? '🎤 sent a voice message'
                : '📎 sent a file';

            await sendPushNotification({
              token: receiver.fcmToken,
              title: socket.user.username,
              body: notifBody,
              data: { type: 'message', chatId, senderId: userId, senderName: socket.user.username },
            }).catch((e) => console.warn('Push notification error:', e.message));
          }
        }
      } catch (err) {
        socket.emit('message_error', { error: err.message });
      }
    });

    // ─── Typing ────────────────────────────────────────────────────────────────
    socket.on('typing', ({ chatId, receiverId }) => {
      io.to(receiverId).emit('user_typing', { chatId, userId, username: socket.user.username });
    });

    socket.on('stop_typing', ({ chatId, receiverId }) => {
      io.to(receiverId).emit('user_stop_typing', { chatId, userId });
    });

    // ─── Mark Seen ─────────────────────────────────────────────────────────────
    socket.on('mark_seen', async ({ chatId, senderId }) => {
      await Message.updateMany(
        { chatId, receiver: userId, status: { $ne: 'seen' } },
        { status: 'seen', seenAt: new Date() }
      );
      io.to(senderId).emit('messages_seen', { chatId, seenBy: userId });
    });

    // ─── Delete Message ────────────────────────────────────────────────────────
    socket.on('delete_message', async ({ messageId, deleteForEveryone, chatId, receiverId }) => {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (deleteForEveryone && message.sender.toString() === userId) {
        // Delete file from Cloudinary before clearing the URL
        if (message.fileUrl) {
          deleteFromCloudinary(message.fileUrl).catch(() => {});
        }
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

    // ─── Chat request response ─────────────────────────────────────────────────
    socket.on('request_response', (data) => {
      const { to, accepted, chatId } = data;
      io.to(to).emit('request_responded', { accepted, chatId, by: userId });
    });

    // ─── CALL SIGNALING ────────────────────────────────────────────────────────

    // Outgoing call offer
    socket.on('call_offer', async ({ to, offer, caller, callType }) => {
      io.to(to).emit('call_offer', { from: userId, offer, caller, callType });
      console.log(`Call offer from ${socket.user.username} to ${to}`);

      // If receiver is offline, cache the offer for when they reconnect
      if (!onlineUsers.has(to)) {
        // Clear any previous pending call for this receiver
        const existing = pendingCalls.get(to);
        if (existing) clearTimeout(existing.timeout);

        const timeout = setTimeout(() => {
          pendingCalls.delete(to);
          console.log(`Pending call for ${to} expired`);
        }, 60000); // 60 second timeout

        pendingCalls.set(to, { offer, caller, callType, callerId: userId, timeout });
        console.log(`Cached pending call for ${to}`);
      }

      // Record call in database
      try {
        const callDoc = await Call.create({
          caller: userId,
          receiver: to,
          callType: callType || 'voice',
          status: 'missed',
          startedAt: new Date(),
        });
        activeCalls.set(userId, { callDocId: callDoc._id.toString(), callerId: userId, receiverId: to, startedAt: new Date() });
      } catch (err) {
        console.warn('Failed to create call record:', err.message);
      }

      // Send FCM push so the receiver gets notified even if app is in background/closed
      try {
        const receiver = await User.findById(to).select('fcmToken');
        if (receiver?.fcmToken) {
          await sendPushNotification({
            token: receiver.fcmToken,
            title: `Incoming ${callType === 'video' ? 'Video ' : ''}Call`,
            body: `${socket.user.username} is calling you`,
            data: {
              type: 'call',
              callerId: userId,
              callerName: socket.user.username,
              callerPic: socket.user.profilePicture || '',
            },
            android: { channelId: 'chatzz_calls', priority: 'high', ttl: 30000 },
          }).catch((e) => console.warn('Call push error:', e.message));
        }
      } catch (err) {
        console.warn('Call push notification error:', err.message);
      }
    });

    // Call answer
    socket.on('call_answer', async ({ to, answer }) => {
      io.to(to).emit('call_answer', { from: userId, answer });

      // Update call record: mark as answered
      const activeCall = activeCalls.get(to);
      if (activeCall) {
        try {
          await Call.findByIdAndUpdate(activeCall.callDocId, {
            status: 'answered',
            answeredAt: new Date(),
          });
        } catch (err) {
          console.warn('Failed to update call record (answer):', err.message);
        }
      }
    });

    // ICE candidate
    socket.on('call_ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('call_ice_candidate', { from: userId, candidate });
    });

    // End call
    socket.on('call_end', async ({ to }) => {
      io.to(to).emit('call_ended', { by: userId });
      console.log(`Call ended by ${socket.user.username}`);

      // Clean up pending call if exists
      const pending = pendingCalls.get(to);
      if (pending) { clearTimeout(pending.timeout); pendingCalls.delete(to); }
      const pending2 = pendingCalls.get(userId);
      if (pending2) { clearTimeout(pending2.timeout); pendingCalls.delete(userId); }

      // Update call record: mark as ended with duration
      const activeCall = activeCalls.get(to) || activeCalls.get(userId);
      if (activeCall) {
        try {
          const endedAt = new Date();
          const duration = Math.floor((endedAt - activeCall.startedAt) / 1000);
          await Call.findByIdAndUpdate(activeCall.callDocId, {
            status: 'ended',
            endedAt,
            duration,
          });
          activeCalls.delete(activeCall.callerId);
        } catch (err) {
          console.warn('Failed to update call record (end):', err.message);
        }
      }
    });

    // Reject call
    socket.on('call_reject', async ({ to }) => {
      io.to(to).emit('call_rejected', { by: userId });

      // Clean up pending call if exists
      const pending = pendingCalls.get(to);
      if (pending) { clearTimeout(pending.timeout); pendingCalls.delete(to); }

      // Update call record: mark as rejected
      const activeCall = activeCalls.get(to);
      if (activeCall) {
        try {
          await Call.findByIdAndUpdate(activeCall.callDocId, {
            status: 'rejected',
            endedAt: new Date(),
          });
          activeCalls.delete(activeCall.callerId);
        } catch (err) {
          console.warn('Failed to update call record (reject):', err.message);
        }
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);
      viewingChatMap.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() });
    });
  });

  return io;
};

module.exports = socketHandler;
