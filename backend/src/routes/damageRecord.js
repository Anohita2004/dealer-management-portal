const express = require('express');
const router = express.Router();
const damageRecordController = require('../controllers/damageRecordController');

router.post('/', damageRecordController.createDamageRecord);
router.get('/', damageRecordController.getDamageRecords);
router.put('/:id', damageRecordController.updateDamageRecord);
router.delete('/:id', damageRecordController.deleteDamageRecord);

module.exports = router;
