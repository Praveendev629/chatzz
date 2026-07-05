const cloudinary = require('cloudinary').v2;

// Ensure cloudinary is configured
const ensureConfig = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return true;
  } catch (_) {
    return false;
  }
};

const deleteFromCloudinary = async (url) => {
  if (!url) return;

  // Skip local file URLs (not cloudinary)
  if (url.startsWith('/uploads/') || url.startsWith('file://')) return;

  if (!ensureConfig()) {
    console.warn('Cloudinary not configured, skipping cleanup');
    return;
  }

  try {
    // Cloudinary URLs look like:
    // https://res.cloudinary.com/NAME/image/upload/v12345/FOLDER/FILE.EXT
    // or without version:
    // https://res.cloudinary.com/NAME/image/upload/FOLDER/FILE.EXT
    // or raw:
    // https://res.cloudinary.com/NAME/raw/upload/v12345/FOLDER/FILE.EXT

    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Find 'upload' index in the path
    const uploadIdx = pathParts.indexOf('upload');
    if (uploadIdx === -1) {
      console.warn('Could not find upload in Cloudinary URL:', url);
      return;
    }

    // Get resource type from the path (image, video, raw)
    const resourceType = pathParts[uploadIdx - 1] || 'image';

    // Everything after 'upload' is: optional version + public_id with extension
    let publicParts = pathParts.slice(uploadIdx + 1);

    // Remove version prefix if present (e.g., v1234567890)
    if (publicParts.length > 0 && /^v\d+$/.test(publicParts[0])) {
      publicParts = publicParts.slice(1);
    }

    if (publicParts.length === 0) {
      console.warn('Empty public_id from URL:', url);
      return;
    }

    // Join remaining parts and remove file extension
    const fullPath = publicParts.join('/');
    const publicId = fullPath.replace(/\.[^.]+$/, '');

    console.log(`Attempting Cloudinary delete: public_id=${publicId}, resource_type=${resourceType}`);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`Cloudinary delete result:`, result);
  } catch (err) {
    console.error('Cloudinary cleanup error:', err.message, 'URL:', url);
  }
};

module.exports = { deleteFromCloudinary };
