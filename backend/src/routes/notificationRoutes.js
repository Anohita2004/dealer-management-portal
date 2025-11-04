// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getManagerNotifications } = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/manager', authenticate, authorize('tm', 'am'), getManagerNotifications);

module.exports = router;
