// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { getManagerMessages, sendManagerMessage } = require('../controllers/messageController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('tm', 'am', 'dealer'), getManagerMessages);
router.post('/', authenticate, authorize('tm', 'am', 'dealer'), sendManagerMessage);

module.exports = router;
