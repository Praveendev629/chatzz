const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { register, getUser, updateUser } = require('../controllers/authController');

router.post('/register', upload.single('profileImage'), register);
router.get('/user/:id', getUser);
router.put('/user/:id', upload.single('profileImage'), updateUser);

module.exports = router;
