const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured');
} else {
  console.warn('⚠️ Cloudinary credentials missing — falling back to local disk storage');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const profilesDir = path.join(uploadsDir, 'profiles');
const messagesDir = path.join(uploadsDir, 'messages');
if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });
if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir, { recursive: true });

// File filter to validate file types
const imageFilter = (req, file, cb) => {
  const allowed = /jpg|jpeg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk || mimeOk) cb(null, true);
  else cb(new Error('Only image files (jpg, png, webp) are allowed'));
};

const messageFileFilter = (req, file, cb) => {
  const allowedExts = /jpg|jpeg|png|webp|mp3|m4a|mp4|pdf|doc|docx|txt|oga|ogg|wav|aac/;
  const extOk = allowedExts.test(path.extname(file.originalname).toLowerCase());
  if (extOk) cb(null, true);
  else cb(new Error(`File type not allowed: ${file.originalname}`));
};

// 10MB file size limit
const MAX_SIZE = 10 * 1024 * 1024;

// Profile storage — Cloudinary or local disk
let profileStorage;
if (cloudinaryConfigured) {
  profileStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'chatzz/profiles',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 400, height: 400, crop: 'fill' }],
    },
  });
} else {
  profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profilesDir),
    filename: (req, file, cb) => {
      const unique = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, unique);
    },
  });
}

// Message storage — Cloudinary or local disk
let messageStorage;
if (cloudinaryConfigured) {
  messageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'chatzz/messages',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp3', 'm4a', 'mp4', 'pdf', 'doc', 'docx', 'txt', 'oga', 'ogg', 'wav', 'aac'],
    },
  });
} else {
  messageStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, messagesDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, unique);
    },
  });
}

// Middleware to build the file URL from disk storage if Cloudinary isn't used
const buildFileUrl = (req, res, next) => {
  if (req.file && !cloudinaryConfigured && req.file.filename) {
    // Construct a URL that the server can serve statically
    const folder = req.file.destination.includes('profiles') ? 'profiles' : 'messages';
    req.file.path = `/uploads/${folder}/${req.file.filename}`;
  }
  next();
};

// Handle multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.code, err.message);
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error('Upload error:', err.message);
    return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
  }
  next();
};

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
});

const messageUpload = multer({
  storage: messageStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: messageFileFilter,
});

module.exports = {
  profileUpload,
  messageUpload,
  handleUploadError,
  buildFileUrl,
  cloudinaryConfigured,
};
