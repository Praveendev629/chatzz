const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCallHistory, deleteCall } = require('../controllers/callController');

router.get('/', protect, getCallHistory);
router.delete('/:id', protect, deleteCall);

module.exports = router;
