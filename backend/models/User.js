const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  profileImage: { type: String, default: '' },
  socketId: { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  fcmToken: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
