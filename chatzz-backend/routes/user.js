const express = require('express');
const router = express.Router();
const { profileUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  getAllUsers,
  getUserProfile,
  updateProfile,
  sendChatRequest,
  respondChatRequest,
  blockUser,
  unblockUser,
  getChatRequests,
  deleteAccount,
  adminGetAllUsers,
  adminDeleteUser,
  deleteCachedMedia,
} = require('../controllers/userController');

// Admin routes (no auth required – password validated in controller)
router.post('/admin/list', adminGetAllUsers);
router.delete('/admin/:id', adminDeleteUser);

// Protected user routes
router.get('/', protect, getAllUsers);
router.get('/requests', protect, getChatRequests);
router.get('/:id', protect, getUserProfile);
router.put('/profile', protect, (req, res, next) => {
  profileUpload.single('profilePicture')(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    buildFileUrl(req, res, next);
  });
}, updateProfile);
router.post('/:id/request', protect, sendChatRequest);
router.put('/request/:userId/respond', protect, respondChatRequest);
router.post('/:id/block', protect, blockUser);
router.delete('/:id/block', protect, unblockUser);
router.post('/delete-cloudinary', protect, deleteCachedMedia);
router.delete('/account', protect, deleteAccount);

module.exports = router;
