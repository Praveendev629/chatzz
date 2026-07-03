const express = require('express');
const router = express.Router();
const { messageUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { createStatus, getStatuses, getUserStatuses, viewStatus, deleteStatus } = require('../controllers/statusController');

router.get('/', protect, getStatuses);
router.post('/', protect, (req, res, next) => {
  messageUpload.single('media')(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    buildFileUrl(req, res, next);
  });
}, createStatus);
router.get('/user/:userId', protect, getUserStatuses);
router.put('/:id/view', protect, viewStatus);
router.delete('/:id', protect, deleteStatus);

module.exports = router;
