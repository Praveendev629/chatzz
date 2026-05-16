const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const { search, exclude } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (exclude) query._id = { $ne: exclude };

    const users = await User.find(query).select('-fcmToken -socketId');
    const total = await User.countDocuments();
    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
