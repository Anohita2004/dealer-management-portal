// src/routes/regionRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

const {
  createRegion,
  getRegions,
  getRegion,
  updateRegion,
  deleteRegion
} = require('../controllers/regionController');

// Public routes (with authentication)
router.get("/regions", authenticate, getRegions);

// Require permissions for write operations
router.post("/regions", authenticate, checkPermission('regions.manage'), createRegion);
router.get("/regions/:id", authenticate, checkPermission('regions.view'), getRegion);
router.put("/regions/:id", authenticate, checkPermission('regions.manage'), updateRegion);
router.delete("/regions/:id", authenticate, checkPermission('regions.manage'), deleteRegion);

// 📌 REGIONAL ADMIN DASHBOARD ROUTES (ADD BELOW CRUD ROUTES)

router.get(
  "/regions/dashboard/summary",
  authenticate,
  checkPermission("dashboard.view.regional"),   // or create new: dashboard.view.regional
  require("../controllers/regionController").getRegionDashboardSummary
);

router.get(
  "/regions/dashboard/areas",
  authenticate,
  checkPermission("areas.view"),
  require("../controllers/regionController").getRegionAreas
);

router.get(
  "/regions/dashboard/approvals",
  authenticate,
  checkPermission("documents.view"),
  require("../controllers/regionController").getRegionApprovals
);

module.exports = router;
