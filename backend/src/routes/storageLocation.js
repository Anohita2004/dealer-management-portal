const express = require('express');
const router = express.Router();
const storageLocationController = require('../controllers/storageLocationController');

router.post('/', storageLocationController.createStorageLocation);
router.get('/', storageLocationController.getStorageLocations);
router.get('/:id', storageLocationController.getStorageLocationById);
router.put('/:id', storageLocationController.updateStorageLocation);
router.delete('/:id', storageLocationController.deleteStorageLocation);

module.exports = router;
