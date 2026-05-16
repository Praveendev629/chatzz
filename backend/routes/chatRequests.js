const express = require('express');
const router = express.Router();
const {
  sendRequest,
  respondRequest,
  getRequests,
  getAcceptedChats,
} = require('../controllers/chatRequestController');

router.post('/send', sendRequest);
router.put('/respond/:requestId', respondRequest);
router.get('/pending/:userId', getRequests);
router.get('/accepted/:userId', getAcceptedChats);

module.exports = router;
