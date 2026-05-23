const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Profile picture storage (images only) ───────────────────────────────────
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chatzz/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
  },
});

// ── Message file storage (images, audio, documents) ─────────────────────────
const messageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const mime = file.mimetype || '';

    if (mime.startsWith('audio/')) {
      // Voice messages — upload as raw resource so Cloudinary doesn't transcode
      return {
        folder: 'chatzz/audio',
        resource_type: 'video',   // Cloudinary uses "video" resource_type for audio files
        allowed_formats: ['m4a', 'mp4', 'aac', 'mp3', 'wav', 'ogg', 'webm'],
        format: 'm4a',
      };
    }

    if (mime.startsWith('image/')) {
      return {
        folder: 'chatzz/images',
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      };
    }

    // Documents / generic files
    return {
      folder: 'chatzz/documents',
      resource_type: 'raw',
      allowed_formats: [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'txt', 'csv', 'zip', 'rar',
      ],
    };
  },
});

// ── File size limits ─────────────────────────────────────────────────────────
const LIMITS = {
  profile: { fileSize: 5 * 1024 * 1024 },    // 5 MB
  message: { fileSize: 50 * 1024 * 1024 },   // 50 MB
};

// ── Exported multer instances ────────────────────────────────────────────────
const profileUpload = multer({ storage: profileStorage, limits: LIMITS.profile });
const messageUpload = multer({ storage: messageStorage, limits: LIMITS.message });

// Default export (backwards-compatible) — used by profile routes
module.exports = profileUpload;

// Named exports for message routes
module.exports.profileUpload = profileUpload;
module.exports.messageUpload = messageUpload;
