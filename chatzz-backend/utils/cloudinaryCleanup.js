const cloudinary = require('cloudinary').v2;

const deleteFromCloudinary = async (url) => {
  if (!url || !process.env.CLOUDINARY_CLOUD_NAME) return;

  try {
    // Extract public_id from Cloudinary URL
    // URLs look like: https://res.cloudinary.com/cloud_name/image/upload/v123/folder/file.ext
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return;

    // Everything after 'upload/' and before the filename is the path
    const pathAfterUpload = parts.slice(uploadIndex + 1);
    // Remove version number (v123456...)
    const withoutVersion = pathAfterUpload.filter((p) => !p.startsWith('v'));
    // Remove file extension from last element
    const lastPart = withoutVersion[withoutVersion.length - 1];
    const publicId = [...withoutVersion.slice(0, -1), lastPart.replace(/\.[^.]+$/, '')].join('/');

    await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    console.warn('Cloudinary cleanup failed:', err.message);
  }
};

module.exports = { deleteFromCloudinary };
