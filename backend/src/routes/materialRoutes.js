// src/routes/materialRoutes.js
const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const materialGroupController = require("../controllers/materialGroupController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

// -------------------------
// Material Groups
// -------------------------

// Get all groups
router.get("/groups", authenticate, materialGroupController.getGroups);

// Create a new group
router.post(
  "/groups",
  authenticate,
  authorize("super_admin", "technical_admin", "dealer", "inventory"),
  materialGroupController.createGroup
);

// Assign material to a group
router.post(
  "/groups/:id/assign-material",
  authenticate,
  authorize("super_admin"),
  materialGroupController.assignMaterial
);

// -------------------------
// Material Master
// -------------------------

// Analytics & alerts must come first to avoid being captured by /:id
router.get("/analytics", authenticate, materialController.analytics);
router.get("/alerts", authenticate, materialController.alerts);

// List all materials
router.get("/", authenticate, materialController.getMaterials);

// Get material by ID (UUID)
router.get("/:id", authenticate, materialController.getMaterialById);

// Create new material
router.post(
  "/",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory"),
  materialController.createMaterial
);

// Bulk import via Excel/XLSX
router.post(
  "/import",
  authenticate,
  authorize("super_admin", "inventory"),
  upload.single("file"),
  materialController.importMaterials
);

// Update a material
router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory"),
  materialController.updateMaterial
);

// Delete a material
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory"),
  materialController.deleteMaterial
);

module.exports = router;

