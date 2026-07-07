const Status = require('../models/Status');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../utils/cloudinaryCleanup');

// @desc    Create status
// @route   POST /api/status
// @access  Private
const createStatus = async (req, res) => {
  try {
    const { mediaType, content, backgroundColor, mediaUrl: directMediaUrl } = req.body;

    let mediaUrl = directMediaUrl || null;
    if (!mediaUrl && req.file) {
      mediaUrl = req.file.path;
    }

    if (mediaType === 'text' && !content) {
      return res.status(400).json({ success: false, message: 'Content is required for text status' });
    }

    if ((mediaType === 'image' || mediaType === 'video') && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Media file is required' });
    }

    // Status expires after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await Status.create({
      user: req.user._id,
      mediaType,
      mediaUrl,
      content: content || '',
      backgroundColor: backgroundColor || '#E53935',
      expiresAt,
    });
    console.log(`Status created: ${status._id}, mediaType: ${mediaType}, mediaUrl: ${mediaUrl || 'none'}`);

    const populated = await Status.findById(status._id).populate('user', '_id username profilePicture');

    // Notify followers via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('new_status', { userId: req.user._id, username: req.user.username });
    }

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all active statuses
// @route   GET /api/status
// @access  Private
const getStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
      user: { $ne: req.user._id },
    })
      .populate('user', '_id username profilePicture')
      .sort({ createdAt: -1 });

    // Group by user
    const groupedByUser = {};
    statuses.forEach((status) => {
      const userId = status.user._id.toString();
      if (!groupedByUser[userId]) {
        groupedByUser[userId] = {
          user: status.user,
          statuses: [],
          hasUnviewed: false,
        };
      }
      groupedByUser[userId].statuses.push(status);

      // Check if current user has viewed this status
      const viewed = status.views.some(
        (v) => v.user.toString() === req.user._id.toString()
      );
      if (!viewed) {
        groupedByUser[userId].hasUnviewed = true;
      }
    });

    // Get user's own statuses
    const ownStatuses = await Status.find({
      user: req.user._id,
      expiresAt: { $gt: new Date() },
    }).populate('user', '_id username profilePicture').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      statuses: Object.values(groupedByUser),
      ownStatuses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View status (mark as viewed)
// @route   POST /api/status/:id/view
// @access  Private
const viewStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    // Check if already viewed
    const alreadyViewed = status.views.some(
      (v) => v.user.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      status.views.push({ user: req.user._id });
      await status.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get status viewers
// @route   GET /api/status/:id/viewers
// @access  Private
const getStatusViewers = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id)
      .populate('views.user', '_id username profilePicture');

    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    // Only the status owner can see viewers
    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, viewers: status.views });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete status
// @route   DELETE /api/status/:id
// @access  Private
const deleteStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Delete media from Cloudinary before removing the document
    if (status.mediaUrl) {
      deleteFromCloudinary(status.mediaUrl).catch(() => {});
    }

    await Status.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Status deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createStatus, getStatuses, viewStatus, getStatusViewers, deleteStatus };
