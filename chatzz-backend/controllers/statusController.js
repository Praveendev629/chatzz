const Status = require('../models/Status');
const { sendPushNotification } = require('../config/firebase');

// @desc    Create a new status
// @route   POST /api/status
// @access  Private
const createStatus = async (req, res) => {
  try {
    const { content, mediaType, backgroundColor } = req.body;
    let mediaUrl = null;

    if (req.file) {
      mediaUrl = req.file.path;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await Status.create({
      user: req.user._id,
      content: content || '',
      mediaUrl,
      mediaType: req.file ? (req.file.mimetype?.startsWith('video') ? 'video' : 'image') : (mediaType || 'text'),
      backgroundColor: backgroundColor || '#1a1a2e',
      expiresAt,
    });

    const populated = await Status.findById(status._id).populate('user', '_id username profilePicture');

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all active statuses from users the current user can see
// @route   GET /api/status
// @access  Private
const getStatuses = async (req, res) => {
  try {
    const User = require('../models/User');
    const currentUser = await User.findById(req.user._id);

    // Get users who have accepted chat requests or are contacts
    const chatRequestUsers = currentUser.chatRequests
      .filter((r) => r.status === 'accepted')
      .map((r) => r.from);

    const Chat = require('../models/Chat');
    const chats = await Chat.find({ participants: req.user._id });
    const chatUsers = chats.flatMap((c) =>
      c.participants.filter((p) => p.toString() !== req.user._id.toString())
    );

    // Combine and deduplicate
    const visibleUserIds = [...new Set([...chatRequestUsers.map(String), ...chatUsers.map(String)])];

    // Also include own statuses
    visibleUserIds.push(req.user._id.toString());

    const statuses = await Status.find({
      user: { $in: visibleUserIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('user', '_id username profilePicture');

    res.status(200).json({ success: true, statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get statuses from a specific user
// @route   GET /api/status/user/:userId
// @access  Private
const getUserStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      user: req.params.userId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('user', '_id username profilePicture');

    res.status(200).json({ success: true, statuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark status as viewed
// @route   PUT /api/status/:id/view
// @access  Private
const viewStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    if (!status.viewedBy.includes(req.user._id)) {
      status.viewedBy.push(req.user._id);
      await status.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete own status
// @route   DELETE /api/status/:id
// @access  Private
const deleteStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Status.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Status deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createStatus, getStatuses, getUserStatuses, viewStatus, deleteStatus };
