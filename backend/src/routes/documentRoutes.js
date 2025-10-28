const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, documentController.getAllDocuments);
router.post('/', authenticate, documentController.upload.single('file'), documentController.uploadDocument);
router.get('/:id/download', authenticate, documentController.downloadDocument);
router.delete('/:id', authenticate, documentController.deleteDocument);

module.exports = router;
