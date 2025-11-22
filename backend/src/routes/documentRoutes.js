const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, documentController.getAllDocuments);
router.post('/', authenticate, documentController.upload.single('file'), documentController.uploadDocument);
router.get('/:id/download', authenticate, documentController.downloadDocument);
router.delete('/:id', authenticate, documentController.deleteDocument);
router.patch('/:id/status', authenticate, authorize('super_admin','tm','am'), documentController.approveDocument);
router.get("/manager",authenticate,authorize("tm", "am", "sm"),documentController.getManagerDocuments);



module.exports = router;
