const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
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
} = require('../controllers/userController');

router.get('/', protect, getAllUsers);
router.get('/requests', protect, getChatRequests);
router.get('/:id', protect, getUserProfile);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);
router.post('/:id/request', protect, sendChatRequest);
router.put('/request/:userId/respond', protect, respondChatRequest);
router.post('/:id/block', protect, blockUser);
router.delete('/:id/block', protect, unblockUser);
router.delete('/account', protect, deleteAccount);

module.exports = router;
