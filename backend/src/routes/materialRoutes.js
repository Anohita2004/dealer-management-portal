// src/routes/materialRoutes.js
const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const materialGroupController = require("../controllers/materialGroupController");
const { authenticate, authorize } = require("../middleware/auth");

// Material Groups
router.get("/groups", authenticate, materialGroupController.getGroups);

router.post(
  "/groups/:id/assign-material",
  authenticate,
  authorize("admin"),
  materialGroupController.assignMaterial
);

// Material Master
router.get("/", authenticate, materialController.getMaterials);
router.get("/:id", authenticate, materialController.getMaterialById);
router.post("/", authenticate, authorize("admin", "inventory"), materialController.createMaterial);
router.put("/:id", authenticate, authorize("admin", "inventory"), materialController.updateMaterial);
router.delete("/:id", authenticate, authorize("admin", "inventory"), materialController.deleteMaterial);
router.post("/groups", authenticate, authorize("admin", "dealer_admin", "inventory"), materialGroupController.createGroup);

module.exports = router;
