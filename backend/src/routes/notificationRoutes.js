// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getManagerNotifications,
  getUserNotifications,
  markAsRead,
} = require('../controllers/notificationsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/manager', authenticate, authorize('tm', 'am'), getManagerNotifications);
router.get('/', authenticate, getUserNotifications);
router.put('/:id/read', authenticate, markAsRead);

module.exports = router;
