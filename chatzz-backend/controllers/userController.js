const User = require('../models/User');
const { sendPushNotification } = require('../config/firebase');

// @desc    Get all users (for search)
// @route   GET /api/users
// @access  Private
const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const currentUser = await User.findById(req.user._id);

    let query = {
      _id: { $ne: req.user._id },
      blockedUsers: { $ne: req.user._id }, // not blocked by them
    };

    // Exclude users current user has blocked
    if (currentUser.blockedUsers.length > 0) {
      query._id = { $ne: req.user._id, $nin: currentUser.blockedUsers };
    }

    // Exclude users who rejected chat request
    const rejectedUsers = currentUser.chatRequests
      .filter((r) => r.status === 'rejected')
      .map((r) => r.from);
    if (rejectedUsers.length > 0) {
      query._id.$nin = [...(query._id.$nin || []), ...rejectedUsers];
    }

    if (search) {
      query.username = { $regex: search, $options: 'i' };
    }

    const users = await User.find(query).select('_id username profilePicture about isOnline lastSeen');
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '_id username profilePicture about isOnline lastSeen'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if blocked
    const currentUser = await User.findById(req.user._id);
    if (currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(403).json({ success: false, message: 'User is blocked' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const updates = {};
    if (req.body.username) updates.username = req.body.username;
    if (req.body.about !== undefined) updates.about = req.body.about;
    if (req.body.settings) updates.settings = req.body.settings;

    if (req.file) {
      updates.profilePicture = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`;
    }

    // Check username uniqueness
    if (updates.username) {
      const exists = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-blockedUsers -chatRequests -__v');

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send chat request
// @route   POST /api/users/:id/request
// @access  Private
const sendChatRequest = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if blocked
    if (targetUser.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Cannot send request' });
    }

    // Check if request already exists
    const existing = targetUser.chatRequests.find(
      (r) => r.from.toString() === req.user._id.toString()
    );
    if (existing) {
      return res.status(400).json({ success: false, message: 'Request already sent' });
    }

    targetUser.chatRequests.push({ from: req.user._id, status: 'pending' });
    await targetUser.save();

    // Send push notification
    if (targetUser.fcmToken) {
      await sendPushNotification({
        token: targetUser.fcmToken,
        title: 'New Chat Request',
        body: `${req.user.username} wants to chat with you`,
        data: { type: 'chat_request', userId: req.user._id.toString() },
      });
    }

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(req.params.id).emit('chat_request', {
        from: {
          _id: req.user._id,
          username: req.user.username,
          profilePicture: req.user.profilePicture,
        },
      });
    }

    res.status(200).json({ success: true, message: 'Chat request sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Respond to chat request
// @route   PUT /api/users/request/:userId/respond
// @access  Private
const respondChatRequest = async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const currentUser = await User.findById(req.user._id);

    const requestIndex = currentUser.chatRequests.findIndex(
      (r) => r.from.toString() === req.params.userId
    );

    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (action === 'accept') {
      currentUser.chatRequests[requestIndex].status = 'accepted';
      await currentUser.save();

      // Create chat
      const Chat = require('../models/Chat');
      let chat = await Chat.findOne({
        participants: { $all: [req.user._id, req.params.userId] },
      });

      if (!chat) {
        chat = await Chat.create({ participants: [req.user._id, req.params.userId] });
      }

      // Notify requester
      if (req.app.get('io')) {
        req.app.get('io').to(req.params.userId).emit('request_accepted', {
          by: { _id: req.user._id, username: req.user.username },
          chatId: chat._id,
        });
      }

      res.status(200).json({ success: true, message: 'Request accepted', chatId: chat._id });
    } else {
      currentUser.chatRequests[requestIndex].status = 'rejected';
      await currentUser.save();
      res.status(200).json({ success: true, message: 'Request rejected' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block user
// @route   POST /api/users/:id/block
// @access  Private
const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.blockedUsers.includes(req.params.id)) {
      return res.status(400).json({ success: false, message: 'User already blocked' });
    }

    user.blockedUsers.push(req.params.id);
    await user.save();
    res.status(200).json({ success: true, message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unblock user
// @route   DELETE /api/users/:id/block
// @access  Private
const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== req.params.id);
    await user.save();
    res.status(200).json({ success: true, message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending chat requests
// @route   GET /api/users/requests
// @access  Private
const getChatRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'chatRequests.from',
      '_id username profilePicture about'
    );
    const pending = user.chatRequests.filter((r) => r.status === 'pending');
    res.status(200).json({ success: true, requests: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete account permanently
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all chats involving this user
    const Chat = require('../models/Chat');
    const Message = require('../models/Message');

    const chats = await Chat.find({ participants: userId });
    const chatIds = chats.map((c) => c._id);

    // Notify connected users via socket
    if (req.app.get('io')) {
      for (const chat of chats) {
        const otherId = chat.participants.find((p) => p.toString() !== userId.toString());
        if (otherId) {
          req.app.get('io').to(otherId.toString()).emit('user_deleted', {
            userId: userId.toString(),
            message: `${req.user.username} has deleted their account and is no longer available.`,
          });
        }
      }
    }

    // Delete messages
    await Message.deleteMany({ chatId: { $in: chatIds } });
    // Delete chats
    await Chat.deleteMany({ participants: userId });
    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserProfile,
  updateProfile,
  sendChatRequest,
  respondChatRequest,
  blockUser,
  unblockUser,
  getChatRequests,
  deleteAccount,
};
