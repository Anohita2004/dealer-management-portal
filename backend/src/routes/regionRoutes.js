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

// Mounted at /api/regions in server.js
// 👉 List regions
router.get("/", authenticate, getRegions);

// 👉 CRUD (requires permissions)
router.post("/", authenticate, checkPermission('regions.manage'), createRegion);
router.get("/:id", authenticate, checkPermission('regions.view'), getRegion);
router.put("/:id", authenticate, checkPermission('regions.manage'), updateRegion);
router.delete("/:id", authenticate, checkPermission('regions.manage'), deleteRegion);

// 📌 REGIONAL ADMIN DASHBOARD ROUTES

router.get(
  "/dashboard/summary",
  authenticate,
  checkPermission("dashboard.view.regional"),
  require("../controllers/regionController").getRegionDashboardSummary
);

router.get(
  "/dashboard/areas",
  authenticate,
  checkPermission("areas.view"),
  require("../controllers/regionController").getRegionAreas
);

router.get(
  "/dashboard/approvals",
  authenticate,
  checkPermission("documents.view"),
  require("../controllers/regionController").getRegionApprovals
);

module.exports = router;
