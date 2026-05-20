const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getChats, getOrCreateChat, deleteChat } = require('../controllers/chatController');

router.get('/', protect, getChats);
router.post('/', protect, getOrCreateChat);
router.delete('/:id', protect, deleteChat);

module.exports = router;
