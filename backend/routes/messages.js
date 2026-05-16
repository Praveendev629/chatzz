const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
  getMessages,
  deleteForEveryone,
  deleteForMe,
  uploadFile,
} = require('../controllers/messageController');

router.get('/:userId/:otherId', getMessages);
router.put('/delete-everyone/:messageId', deleteForEveryone);
router.put('/delete-me/:messageId', deleteForMe);
router.post('/upload', upload.single('file'), uploadFile);

module.exports = router;
