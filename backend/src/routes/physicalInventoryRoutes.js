const express = require('express');
const router = express.Router();
const controller = require('../controllers/physicalInventoryController');

router.post('/initiate', controller.initiateCount);
router.get('/', controller.getCounts);
router.post('/submit-counts', controller.submitCount);
router.post('/:id/post', controller.postAdjustment);

module.exports = router;
