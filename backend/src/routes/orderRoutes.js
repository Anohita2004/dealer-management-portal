const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");


router.post(
  "/",
  authenticate,
  authorize("dealer", "dealer_admin", "dealer_staff"),
  orderController.placeOrder
);

router.get(
  "/my",
  authenticate,
  authorize("dealer", "dealer_admin", "dealer_staff"),
  orderController.getMyOrders
);

// Admin / Manager view ALL orders
router.get("/", authenticate, authorize("dealer_admin","admin", "manager"), orderController.getAllOrders);

// Admin / Manager update status
router.patch("/:id/status", authenticate, authorize("dealer_admin","admin", "manager"), orderController.updateOrderStatus);

// Admin / Manager approve
router.patch("/:id/approve", authenticate, authorize("dealer_admin","admin", "manager"), orderController.approveOrder);

// Admin / Manager reject
router.patch("/:id/reject", authenticate, authorize("dealer_admin","admin", "manager"), orderController.rejectOrder);

module.exports = router;

