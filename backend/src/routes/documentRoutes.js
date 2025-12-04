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
// Only super_admin, tm, am can approve/reject
// ---------------------------------------------------
router.patch(
  '/:id/status',
  authenticate,
  authorize('super_admin', 'tm', 'am'),
  documentController.approveDocument
);

// ---------------------------------------------------
// MANAGER DOCUMENT VIEW
// tm = Territory Manager
// am = Area Manager
// sm = Sales Manager ??
// ---------------------------------------------------
router.get(
  '/manager',
  authenticate,
  authorize('tm', 'am', 'sm'),
  documentController.getManagerDocuments
);

module.exports = router;

