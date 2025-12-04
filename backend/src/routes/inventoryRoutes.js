const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const inventoryController = require("../controllers/inventoryController");

// ✅ Fetch summary — visible to Inventory, Admin, and Key Users
router.get(
  "/summary",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user","dealer_admin", "tm"),
  inventoryController.getInventorySummary
);

// ✅ Fetch detailed list — visible to Inventory and Admin
router.get(
  "/details",
  authenticate,
  authorize("inventory_user", "super_admin"),
  inventoryController.getInventoryDetails
);

// ✅ Add new inventory item
router.post(
  "/",
  authenticate,
  authorize("inventory_user", "super_admin"),
  inventoryController.addItem
);

// ✅ Update existing inventory item
router.put(
  "/:id",
  authenticate,
  authorize("inventory_user", "super_admin"),
  inventoryController.updateItem
);

// ✅ Delete inventory item
router.delete(
  "/:id",
  authenticate,
  authorize("inventory_user", "super_admin"),
  inventoryController.deleteItem
);

// ✅ Export inventory as Excel or PDF
router.get(
  "/export",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user"),
  inventoryController.exportInventory
);

module.exports = router;
