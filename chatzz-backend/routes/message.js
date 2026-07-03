const express = require('express');
const router = express.Router();
const { messageUpload } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { getMessages, sendMessage, markSeen, deleteMessage } = require('../controllers/messageController');

router.get('/:chatId', protect, getMessages);
router.post('/', protect, messageUpload.single('file'), sendMessage);
router.put('/:chatId/seen', protect, markSeen);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
