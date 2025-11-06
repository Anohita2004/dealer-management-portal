// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate, authorize } = require('../middleware/auth');


// 📨 List all messages for TM/AM/Admin
router.get("/", authenticate, authorize("tm", "am", "admin"), messageController.getMessages);

// 📨 Dealer sends a new message
router.post("/", authenticate, authorize("dealer"), messageController.sendMessage);

module.exports = router;
