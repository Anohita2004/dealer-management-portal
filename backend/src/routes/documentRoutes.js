const express = require('express');
const router = express.Router();

const documentController = require('../controllers/documentController');
const upload = documentController.upload;   // ← FIX: import Multer upload properly

const { authenticate, authorize } = require('../middleware/auth');

// ---------------------------------------------------
// GET ALL DOCUMENTS (admin + dealer restricted view)
// ---------------------------------------------------
router.get(
  '/',
  authenticate,
  documentController.getAllDocuments
);

// ---------------------------------------------------
// UPLOAD DOCUMENT
// ---------------------------------------------------
router.post(
  '/',
  authenticate,
  upload.single('file'),
  documentController.uploadDocument
);

// ---------------------------------------------------
// DOWNLOAD DOCUMENT
// ---------------------------------------------------
router.get(
  '/:id/download',
  authenticate,
  documentController.downloadDocument
);

// ---------------------------------------------------
// DELETE DOCUMENT
// ---------------------------------------------------
router.delete(
  '/:id',
  authenticate,
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
  documentController.getManagerDocuments
);

module.exports = router;

