// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate, authorize } = require("../middleware/auth");

// 📨 Fetch all messages (visible to TM/AM/Admin/Dealer)
router.get(
  "/",
  authenticate,
  authorize("tm", "am", "super_admin", "dealer"),
  messageController.getMessages
);

// 💬 Get conversation between a dealer and a manager
router.get(
  "/conversation/:partnerId",
  authenticate,
  authorize("tm", "am", "super_admin", "dealer"), // both sides can access
  messageController.getConversation // ✅ fixed name (was messageCtrl)
);

// 📨 Send a new message (dealer OR manager)
router.post(
  "/",
  authenticate,
  authorize("tm", "am", "super_admin", "dealer"),
  messageController.sendMessage
);

// ✅ Mark message as read
router.patch(
  "/:id/read",
  authenticate,
  authorize("tm", "am", "super_admin", "dealer"),
  messageController.markAsRead
);

module.exports = router;
