const express = require('express');
const router = express.Router();
const { getSignedUpload } = require('../controllers/uploadController');

// Public — signed URL is short-lived and folder-scoped, safe without auth
router.post('/sign', getSignedUpload);

module.exports = router;
