const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'text'],
      required: true,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      default: '',
    },
    backgroundColor: {
      type: String,
      default: '#E53935',
    },
    views: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

statusSchema.index({ user: 1, createdAt: -1 });
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Cleanup Cloudinary when a status is removed (TTL or manual delete)
const { deleteFromCloudinary } = require('../utils/cloudinaryCleanup');

statusSchema.post('findOneAndDelete', async function (doc) {
  if (doc?.mediaUrl) await deleteFromCloudinary(doc.mediaUrl);
});

statusSchema.post('deleteOne', async function (doc) {
  if (doc?.mediaUrl) await deleteFromCloudinary(doc.mediaUrl);
});

statusSchema.post('deleteMany', async function (result) {
  // For bulk deletions (expired statuses), fetch and delete each media
  // This runs via the TTL index periodically
  try {
    const deletedDocs = await this.model.find({ expiresAt: { $lte: new Date() } }).lean();
    for (const doc of deletedDocs) {
      if (doc.mediaUrl) await deleteFromCloudinary(doc.mediaUrl);
    }
  } catch (_) {}
});

module.exports = mongoose.model('Status', statusSchema);
