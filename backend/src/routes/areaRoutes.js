// src/routes/areaRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

const {
  createArea,
  getAreas,
  getArea,
  updateArea,
  deleteArea
} = require('../controllers/areaController');

// Public routes (with authentication)
router.get('/', authenticate, getAreas);

// Require permissions for write operations
router.post('/', authenticate, checkPermission('areas.manage'), createArea);
router.get('/:id', authenticate, checkPermission('areas.view'), getArea);
router.put('/:id', authenticate, checkPermission('areas.manage'), updateArea);
router.delete('/:id', authenticate, checkPermission('areas.manage'), deleteArea);
// 📌 AREA MANAGER DASHBOARD ROUTES (ADD BELOW CRUD ROUTES)

router.get(
  "/dashboard/summary",
  authenticate,
  checkPermission("dashboard.view.manager"),   // or create new: dashboard.view.area
  require("../controllers/areaController").getAreaDashboardSummary
);

router.get(
  "/dashboard/dealers",
  authenticate,
  checkPermission("dealer.view"),
  require("../controllers/areaController").getAreaDealers
);

router.get(
  "/dashboard/approvals",
  authenticate,
  checkPermission("documents.view"),
  require("../controllers/areaController").getAreaApprovals
);


module.exports = router;
