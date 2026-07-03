const express = require('express');
const router = express.Router();
const { profileUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { register, checkDevice, updateFcmToken } = require('../controllers/authController');

router.post('/register', (req, res, next) => {
  profileUpload.single('profilePicture')(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    buildFileUrl(req, res, next);
  });
}, register);
router.post('/check-device', checkDevice);
router.put('/fcm-token', protect, updateFcmToken);

module.exports = router;
