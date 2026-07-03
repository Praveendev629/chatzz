const express = require('express');
const router = express.Router();
const { profileUpload } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { register, checkDevice, updateFcmToken } = require('../controllers/authController');

router.post('/register', profileUpload.single('profilePicture'), register);
router.post('/check-device', checkDevice);
router.put('/fcm-token', protect, updateFcmToken);

module.exports = router;
