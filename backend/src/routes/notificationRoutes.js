const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} = require('../controllers/notificationController');

// Admin: Create notifications
router.post('/', authenticate, checkPermission('notifications.send'), createNotification);

// User: Get own notifications
router.get('/', authenticate, checkPermission('notifications.view'), getUserNotifications);

// User: Mark as read
router.put('/:id/read', authenticate, markAsRead);

// User: Mark all as read
router.put('/read-all', authenticate, markAllAsRead);

// User: Delete notification
router.delete('/:id', authenticate, deleteNotification);

// User: Get unread count
router.get('/unread/count', authenticate, getUnreadCount);

module.exports = router;
