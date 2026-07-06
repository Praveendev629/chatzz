const express = require('express');
const router = express.Router();
const { messageUpload, handleUploadError } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { createStatus, getStatuses, viewStatus, getStatusViewers, deleteStatus } = require('../controllers/statusController');

router.get('/', protect, getStatuses);
router.post('/', protect, (req, res, next) => {
  messageUpload.single('media')(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, createStatus);
router.post('/:id/view', protect, viewStatus);
router.get('/:id/viewers', protect, getStatusViewers);
router.delete('/:id', protect, deleteStatus);

module.exports = router;
