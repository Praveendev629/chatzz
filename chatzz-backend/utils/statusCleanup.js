const Status = require('../models/Status');
const { deleteFromCloudinary } = require('./cloudinaryCleanup');

// Find expired statuses and clean up their Cloudinary media.
// MongoDB TTL index deletes the documents automatically, but we need
// to also delete the associated Cloudinary files since TTL doesn't run
// mongoose hooks. This runs periodically (every hour from server.js).
const cleanupExpiredStatusMedia = async () => {
  try {
    // Find statuses that have expired but still exist (not yet TTL-deleted)
    // and have media URLs to clean up
    const expired = await Status.find({
      expiresAt: { $lte: new Date() },
      mediaUrl: { $ne: null },
    }).select('mediaUrl');

    if (expired.length === 0) return;

    console.log(`Cleaning up Cloudinary media for ${expired.length} expired statuses`);
    for (const status of expired) {
      await deleteFromCloudinary(status.mediaUrl);
    }
  } catch (err) {
    console.warn('Status cleanup error:', err.message);
  }
};

module.exports = { cleanupExpiredStatusMedia };
