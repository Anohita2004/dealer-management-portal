const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const inventoryController = require("../controllers/inventoryController");

// ✅ Main route for fetching inventory summary
router.get("/", authenticate, authorize("inventory", "admin", "key_user"), inventoryController.getInventorySummary);

// Optional: detailed endpoints
router.get("/details", authenticate, authorize("inventory", "admin"), inventoryController.getInventoryDetails);

module.exports = router;
