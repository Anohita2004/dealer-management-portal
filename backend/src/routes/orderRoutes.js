// src/routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");

// Dealer placing order
router.post("/", authenticate, authorize("dealer"), orderController.placeOrder);

// Dealer/admin getting orders
router.get("/", authenticate, orderController.getOrdersForDealer);

// Admin/manager updating order status
router.patch("/:id/status", authenticate, authorize("admin", "manager"), orderController.updateOrderStatus);
router.patch("/:id/approve", authenticate, authorize("admin","manager"), orderController.approveOrder);
router.patch("/:id/reject", authenticate, authorize("admin","manager"), orderController.rejectOrder);
router.get("/my", authenticate, authorize("dealer"), orderController.getMyOrders);
router.get("/", authenticate, authorize("dealer"), orderController.getAllOrders);


module.exports = router;
