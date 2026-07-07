const cloudinary = require('cloudinary').v2;

// Ensure cloudinary is configured
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// @desc    Get signed upload params for direct Cloudinary upload
// @route   POST /api/upload/sign
// @access  Private
const getSignedUpload = async (req, res) => {
  try {
    const { folder, resourceType } = req.body;

    const allowedFolders = ['chatzz/statuses', 'chatzz/messages', 'chatzz/profiles'];
    if (!allowedFolders.includes(folder)) {
      return res.status(400).json({ success: false, message: 'Invalid folder' });
    }

    const timestamp = Math.round(Date.now() / 1000);

    const params_to_sign = {
      timestamp,
      folder,
    };

    if (resourceType) {
      params_to_sign.resource_type = resourceType;
    }

    const signature = cloudinary.utils.api_sign_request(
      params_to_sign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      success: true,
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
    });
  } catch (error) {
    console.error('Upload sign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSignedUpload };
