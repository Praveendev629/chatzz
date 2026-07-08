const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    profilePicture: {
      type: String,
      default: null,
    },
    about: {
      type: String,
      default: 'Hey there! I am using Chatzz.',
      maxlength: [150, 'About cannot exceed 150 characters'],
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
    },
    hardwareId: {
      type: String,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    settings: {
      theme: { type: String, default: 'red-black' },
      font: { type: String, default: 'default' },
      bubbleTheme: { type: String, default: 'default' },
    },
    chatRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Generate JWT token
userSchema.methods.getSignedToken = function () {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.index({ hardwareId: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);
