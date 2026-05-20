const Chat = require('../models/Chat');
const Message = require('../models/Message');

// @desc    Get all chats for current user
// @route   GET /api/chats
// @access  Private
const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
      deletedFor: { $ne: req.user._id },
    })
      .populate('participants', '_id username profilePicture about isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        select: 'content messageType deletedForEveryone sender createdAt status',
      })
      .sort({ lastMessageAt: -1 });

    res.status(200).json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get or create chat between two users
// @route   POST /api/chats
// @access  Private
const getOrCreateChat = async (req, res) => {
  try {
    const { participantId } = req.body;

    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, participantId] },
    })
      .populate('participants', '_id username profilePicture about isOnline lastSeen')
      .populate('lastMessage');

    if (!chat) {
      chat = await Chat.create({ participants: [req.user._id, participantId] });
      chat = await Chat.findById(chat._id)
        .populate('participants', '_id username profilePicture about isOnline lastSeen')
        .populate('lastMessage');
    }

    res.status(200).json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete chat for current user
// @route   DELETE /api/chats/:id
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      participants: req.user._id,
    });

    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (!chat.deletedFor.includes(req.user._id)) {
      chat.deletedFor.push(req.user._id);
      await chat.save();
    }

    res.status(200).json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getChats, getOrCreateChat, deleteChat };
