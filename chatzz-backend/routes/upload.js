const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSignedUpload } = require('../controllers/uploadController');

router.post('/sign', protect, getSignedUpload);

module.exports = router;
