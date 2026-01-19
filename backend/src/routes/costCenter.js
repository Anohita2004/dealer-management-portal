const express = require('express');
const router = express.Router();
const costCenterController = require('../controllers/costCenterController');

router.post('/', costCenterController.createCostCenter);
router.get('/', costCenterController.getCostCenters);
router.put('/:id', costCenterController.updateCostCenter);
router.delete('/:id', costCenterController.deleteCostCenter);

module.exports = router;
