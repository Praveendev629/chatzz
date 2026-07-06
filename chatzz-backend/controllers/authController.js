const User = require('../models/User');

// @desc    Register or login user (device-based auth)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, deviceId, fcmToken } = req.body;

    if (!username || !deviceId) {
      return res.status(400).json({ success: false, message: 'Username and deviceId are required' });
    }

    // Check if device already registered
    let user = await User.findOne({ deviceId });

    if (user) {
      // Update FCM token if changed
      if (fcmToken && user.fcmToken !== fcmToken) {
        user.fcmToken = fcmToken;
        await user.save();
      }
      const token = user.getSignedToken();
      return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token,
        user: sanitizeUser(user),
      });
    }

    // Check username availability
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    // Create new user
    const profilePicture = req.file ? req.file.path : null;

    user = await User.create({ username, deviceId, fcmToken, profilePicture });

    const token = user.getSignedToken();
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check device registration
// @route   POST /api/auth/check-device
// @access  Public
const checkDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId required' });

    const user = await User.findOne({ deviceId }).select('-blockedUsers -chatRequests');

    if (!user) {
      return res.status(404).json({ success: false, registered: false });
    }

    const token = user.getSignedToken();
    res.status(200).json({ success: true, registered: true, token, user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update FCM token
// @route   PUT /api/auth/fcm-token
// @access  Private
const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.status(200).json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  profilePicture: user.profilePicture,
  about: user.about,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  settings: user.settings,
});

module.exports = { register, checkDevice, updateFcmToken };
