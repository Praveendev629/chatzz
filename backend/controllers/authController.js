const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, fcmToken } = req.body;
    const profileImage = req.file ? req.file.path : '';

    const user = await User.create({ name, profileImage, fcmToken });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, fcmToken } = req.body;
    const update = {};
    if (name) update.name = name;
    if (fcmToken) update.fcmToken = fcmToken;
    if (req.file) update.profileImage = req.file.path;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
