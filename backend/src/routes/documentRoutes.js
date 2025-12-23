const express = require('express');
const router = express.Router();

const documentController = require('../controllers/documentController');
const upload = documentController.upload;   // ← FIX: import Multer upload properly

const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScope } = require('../middleware/rbac');

// ---------------------------------------------------
// GET ALL DOCUMENTS (admin + dealer restricted view)
// ---------------------------------------------------
router.get(
  '/',
  authenticate,
  authorize('dealer_admin', 'dealer_staff', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin'),
  checkPermission('documents.view'),
  applyScope(['Dealer']),
  documentController.getAllDocuments
);

// ---------------------------------------------------
// UPLOAD DOCUMENT
// ---------------------------------------------------
router.post(
  '/',
  authenticate,
  checkPermission('documents.upload'),
  upload.single('file'),
  documentController.uploadDocument
);

// ---------------------------------------------------
// DOWNLOAD DOCUMENT
// ---------------------------------------------------
router.get(
  '/:id/download',
  authenticate,
  checkPermission('documents.view'),
  applyScope(['Dealer']),
  documentController.downloadDocument
);

// ---------------------------------------------------
// DELETE DOCUMENT
// ---------------------------------------------------
router.delete(
  '/:id',
  authenticate,
  checkPermission('documents.delete'),
  documentController.deleteDocument
);

// ---------------------------------------------------
// APPROVE / REJECT DOCUMENT
// Only super_admin, territory_manager, area_manager can approve/reject
// ---------------------------------------------------
router.patch(
  '/:id/status',
  authenticate,
  authorize('super_admin', 'territory_manager', 'area_manager'),
  checkPermission('documents.approve'),
  documentController.approveDocument
);

// ---------------------------------------------------
// MANAGER DOCUMENT VIEW
// territory_manager = Territory Manager
// area_manager = Area Manager
// regional_manager = Sales Manager ??
// ---------------------------------------------------
router.get(
  '/manager',
  authenticate,
  authorize('territory_manager', 'area_manager', 'regional_manager'),
  checkPermission('documents.view'),
  applyScope(['Dealer']),
  documentController.getManagerDocuments
);

module.exports = router;

