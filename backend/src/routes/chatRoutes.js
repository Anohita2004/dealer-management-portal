// src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatCtrl = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// Who you can message
router.get('/allowed-users', authenticate, chatCtrl.getAllowedUsers);

// Get conversation between current user and a partner
router.get('/conversation/:partnerId', authenticate, chatCtrl.getConversation);

// Send a message
router.post('/send', authenticate, chatCtrl.sendMessage);

// Mark a message as read (partnerId expected by controller)
router.patch('/:partnerId/read', authenticate, chatCtrl.markAsRead);

// 🔥 FIXED unread-count endpoint
router.get("/unread-count", authenticate, chatCtrl.getUnreadCount);

module.exports = router;



