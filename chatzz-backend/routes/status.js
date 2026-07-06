const express = require('express');
const router = express.Router();
const { messageUpload } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { createStatus, getStatuses, viewStatus, getStatusViewers, deleteStatus } = require('../controllers/statusController');

router.get('/', protect, getStatuses);
router.post('/', protect, messageUpload.single('media'), createStatus);
router.post('/:id/view', protect, viewStatus);
router.get('/:id/viewers', protect, getStatusViewers);
router.delete('/:id', protect, deleteStatus);

module.exports = router;
