// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatCtrl = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

// Who you can message
router.get('/allowed-users', authenticate, checkPermission('messages.view'), chatCtrl.getAllowedUsers);

// Get conversation between current user and a partner
router.get('/conversation/:partnerId', authenticate, checkPermission('messages.view'), chatCtrl.getConversation);

// Send a message
router.post('/send', authenticate, checkPermission('messages.send'), chatCtrl.sendMessage);

// Mark a message as read (partnerId expected by controller)
router.patch('/:partnerId/read', authenticate, checkPermission('messages.view'), chatCtrl.markAsRead);

// 🔥 FIXED unread-count endpoint
router.get("/unread-count", authenticate, checkPermission('messages.view'), chatCtrl.getUnreadCount);

module.exports = router;



