// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate, authorize } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

// 📨 Fetch all messages (visible to TM/AM/Admin/Dealer)
router.get(
  "/",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"),
  checkPermission("messages.view"),
  messageController.getMessages
);

// 💬 Get conversation between a dealer and a manager
router.get(
  "/conversation/:partnerId",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"), // both sides can access
  checkPermission("messages.view"),
  messageController.getConversation // ✅ fixed name (was messageCtrl)
);

// 📨 Send a new message (dealer OR manager)
router.post(
  "/",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"),
  checkPermission("messages.send"),
  messageController.sendMessage
);

// ✅ Mark message as read
router.patch(
  "/:id/read",
  authenticate,
  authorize("territory_manager", "area_manager", "super_admin", "dealer_admin", "dealer_staff", "regional_manager", "regional_admin"),
  checkPermission("messages.view"),
  messageController.markAsRead
);

module.exports = router;
