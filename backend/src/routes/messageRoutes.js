// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate, authorize } = require("../middleware/auth");

// 📨 Fetch all messages (visible to TM/AM/Admin/Dealer)
router.get(
  "/",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"),
  messageController.getMessages
);

// 💬 Get conversation between a dealer and a manager
router.get(
  "/conversation/:partnerId",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"), // both sides can access
  messageController.getConversation // ✅ fixed name (was messageCtrl)
);

// 📨 Send a new message (dealer OR manager)
router.post(
  "/",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"),
  messageController.sendMessage
);

// ✅ Mark message as read
router.patch(
  "/:id/read",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"),
  messageController.markAsRead
);

module.exports = router;
