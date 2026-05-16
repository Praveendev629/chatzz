const ChatRequest = require('../models/ChatRequest');

exports.sendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    const existing = await ChatRequest.findOne({ senderId, receiverId });
    if (existing) {
      if (existing.status === 'rejected') {
        return res.status(403).json({ success: false, message: 'Request was rejected' });
      }
      return res.json({ success: true, request: existing });
    }

    const request = await ChatRequest.create({ senderId, receiverId });
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.respondRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await ChatRequest.findByIdAndUpdate(
      req.params.requestId,
      { status },
      { new: true }
    );
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await ChatRequest.find({ receiverId: userId, status: 'pending' })
      .populate('senderId', 'name profileImage');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAcceptedChats = async (req, res) => {
  try {
    const { userId } = req.params;
    const accepted = await ChatRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: 'accepted',
    })
      .populate('senderId', 'name profileImage isOnline')
      .populate('receiverId', 'name profileImage isOnline');
    res.json({ success: true, chats: accepted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
