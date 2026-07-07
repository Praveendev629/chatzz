const Call = require('../models/Call');

// @desc    Get call history for current user
// @route   GET /api/calls
// @access  Private
const getCallHistory = async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }],
    })
      .populate('caller', '_id username profilePicture')
      .populate('receiver', '_id username profilePicture')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a call record
// @route   DELETE /api/calls/:id
// @access  Private
const deleteCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call not found' });

    if (call.caller.toString() !== req.user._id.toString() && call.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Call.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Call record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCallHistory, deleteCall };
