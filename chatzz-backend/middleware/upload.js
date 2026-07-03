const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chatzz/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
  },
});

const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chatzz/messages',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp3', 'm4a', 'mp4', 'pdf', 'doc', 'docx', 'txt'],
  },
});

module.exports = {
  profileUpload: multer({ storage: profileStorage }),
  messageUpload: multer({ storage: messageStorage }),
};