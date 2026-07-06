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

// Clean up Cloudinary media before document is deleted via mongoose
const cleanupMedia = async function (next) {
  try {
    const status = await this.model.findOne(this.getQuery());
    if (status?.mediaUrl) {
      const { deleteFromCloudinary } = require('../utils/cloudinaryCleanup');
      await deleteFromCloudinary(status.mediaUrl);
    }
  } catch (_) {}
  next();
};

statusSchema.pre('deleteOne', cleanupMedia);
statusSchema.pre('deleteMany', async function (next) {
  try {
    const statuses = await this.model.find(this.getFilter()).select('mediaUrl');
    const { deleteFromCloudinary } = require('../utils/cloudinaryCleanup');
    for (const s of statuses) {
      if (s.mediaUrl) await deleteFromCloudinary(s.mediaUrl);
    }
  } catch (_) {}
  next();
});

module.exports = mongoose.model('Status', statusSchema);
