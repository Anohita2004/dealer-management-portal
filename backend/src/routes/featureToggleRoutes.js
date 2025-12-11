const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const featureToggleController = require('../controllers/featureToggleController');

router.get('/', authenticate, checkPermission('system.config'), featureToggleController.getFeatureToggles);
router.get('/:key', authenticate, checkPermission('system.config'), featureToggleController.getFeatureToggle);
router.post('/', authenticate, checkPermission('system.config'), featureToggleController.upsertFeatureToggle);
router.put('/:key', authenticate, checkPermission('system.config'), featureToggleController.upsertFeatureToggle);

module.exports = router;

