const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const inventoryController = require("../controllers/inventoryController");
const checkPermission = require("../middleware/checkPermission");

// ✅ Fetch summary — visible to Inventory, Admin, and Key Users
router.get(
  "/summary",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user", "dealer_admin", "dealer_staff", "territory_manager", "area_manager", "regional_manager", "regional_admin", "technical_admin"),
  checkPermission("inventory.view"),
  inventoryController.getInventorySummary
);

// ✅ Fetch detailed list — visible to Inventory and Admin
router.get(
  "/details",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user", "dealer_admin", "dealer_staff", "territory_manager", "area_manager", "regional_manager", "regional_admin", "technical_admin"),
  checkPermission("inventory.view"),
  inventoryController.getInventoryDetails
);

// ✅ Add new inventory item
router.post(
  "/",
  authenticate,
  authorize("inventory_user", "super_admin"),
  checkPermission("inventory.manage"),
  inventoryController.addItem
);

// ✅ Update existing inventory item
router.put(
  "/:id",
  authenticate,
  authorize("inventory_user", "super_admin"),
  checkPermission("inventory.manage"),
  inventoryController.updateItem
);

// ✅ Delete inventory item
router.delete(
  "/:id",
  authenticate,
  authorize("inventory_user", "super_admin"),
  checkPermission("inventory.manage"),
  inventoryController.deleteItem
);

// ✅ Export inventory as Excel or PDF
router.get(
  "/export",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user", "dealer_admin", "dealer_staff", "territory_manager", "area_manager", "regional_manager", "regional_admin", "technical_admin"),
  checkPermission("inventory.view"),
  inventoryController.exportInventory
);

// ✅ Get low stock alerts
router.get(
  "/alerts/low-stock",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user", "dealer_admin", "dealer_staff", "territory_manager", "area_manager", "regional_manager", "regional_admin", "technical_admin"),
  checkPermission("inventory.view"),
  inventoryController.getLowStockAlerts
);

// ✅ Get inventory for specific plant/warehouse (must come before /:id routes)
// Both routes point to the same handler - plant and warehouse are the same
router.get(
  "/plant/:plantCode",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user", "dealer_admin", "dealer_staff", "territory_manager", "area_manager", "regional_manager", "regional_admin", "technical_admin"),
  checkPermission("inventory.view"),
  inventoryController.getPlantInventory
);

router.get(
  "/warehouse/:warehouseCode",
  authenticate,
  authorize("inventory_user", "super_admin", "key_user", "dealer_admin", "dealer_staff", "territory_manager", "area_manager", "regional_manager", "regional_admin", "technical_admin"),
  checkPermission("inventory.view"),
  inventoryController.getPlantInventory
);

// ✅ Adjust stock level (must come before /:id routes)
router.patch(
  "/:id/adjust",
  authenticate,
  authorize("inventory_user", "super_admin"),
  checkPermission("inventory.manage"),
  inventoryController.adjustStock
);

module.exports = router;
