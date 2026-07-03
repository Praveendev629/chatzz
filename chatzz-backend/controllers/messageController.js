const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { sendPushNotification } = require('../config/firebase');

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      chatId: req.params.chatId,
      deletedFor: { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', '_id username profilePicture');

    res.status(200).json({ success: true, messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, messageType = 'text', content } = req.body;

    let fileUrl = null;
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      fileUrl = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    // Check if receiver blocked sender
    const receiver = await User.findById(receiverId);
    if (receiver?.blockedUsers?.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Cannot send message' });
    }

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      receiver: receiverId,
      messageType,
      content: content || '',
      fileUrl,
      fileName,
      fileSize,
      status: 'sent',
    });

    // Update chat's last message
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      $pull: { deletedFor: req.user._id },
    });

    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      '_id username profilePicture'
    );

    // Send push notification
    if (receiver?.fcmToken) {
      const preview =
        messageType === 'text'
          ? content?.substring(0, 100)
          : messageType === 'image'
          ? '📷 Image'
          : messageType === 'audio'
          ? '🎤 Voice message'
          : '📎 Document';

      await sendPushNotification({
        token: receiver.fcmToken,
        title: req.user.username,
        body: preview,
        data: {
          type: 'new_message',
          chatId,
          senderId: req.user._id.toString(),
          senderName: req.user.username,
        },
      });
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark messages as seen
// @route   PUT /api/messages/:chatId/seen
// @access  Private
const markSeen = async (req, res) => {
  try {
    await Message.updateMany(
      { chatId: req.params.chatId, receiver: req.user._id, status: { $ne: 'seen' } },
      { status: 'seen', seenAt: new Date() }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick reply from notification
// @route   POST /api/messages/reply
// @access  Private
const quickReply = async (req, res) => {
  try {
    const { chatId, receiverId, content } = req.body;

    if (!chatId || !receiverId || !content) {
      return res.status(400).json({ success: false, message: 'chatId, receiverId, and content are required' });
    }

    const receiver = await User.findById(receiverId);
    if (receiver?.blockedUsers?.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Cannot send message' });
    }

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      receiver: receiverId,
      messageType: 'text',
      content,
      status: 'sent',
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      $pull: { deletedFor: req.user._id },
    });

    const populatedMessage = await Message.findById(message._id).populate(
      'sender', '_id username profilePicture'
    );

    // Notify via socket if possible
    const io = req.app.get('io');
    if (io) {
      io.to(receiverId).emit('new_message', populatedMessage);
      await Message.findByIdAndUpdate(message._id, { status: 'delivered', deliveredAt: new Date() });
    }

    // Push notification
    if (receiver?.fcmToken) {
      await sendPushNotification({
        token: receiver.fcmToken,
        title: req.user.username,
        body: content.substring(0, 100),
        data: { type: 'new_message', chatId, senderId: req.user._id.toString() },
      });
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { deleteForEveryone } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (deleteForEveryone && message.sender.toString() === req.user._id.toString()) {
      message.deletedForEveryone = true;
      message.content = '';
      message.fileUrl = null;
    } else {
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
      }
    }

    await message.save();
    res.status(200).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMessages, sendMessage, markSeen, deleteMessage, quickReply };
