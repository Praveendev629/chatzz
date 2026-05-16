const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId },
      ],
    })
      .populate('senderId', 'name profileImage')
      .populate('receiverId', 'name profileImage')
      .populate('replyTo')
      .sort({ timestamp: 1 });

    const filtered = messages.filter(
      (m) => !m.deletedFor.map(String).includes(userId)
    );

    res.json({ success: true, messages: filtered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteForEveryone = async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.messageId,
      { deleted: true, text: 'This message was deleted.', fileUrl: '' },
      { new: true }
    );
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteForMe = async (req, res) => {
  try {
    const { userId } = req.body;
    const msg = await Message.findByIdAndUpdate(
      req.params.messageId,
      { $addToSet: { deletedFor: userId } },
      { new: true }
    );
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    res.json({ success: true, fileUrl: req.file.path, fileType: req.body.fileType || 'image' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
