const express = require('express');
const router = express.Router();
const deliveryOrderController = require('../controllers/deliveryOrderController');
const { protect } = require('../middleware/auth'); // Assuming you have auth middleware

// Protect all routes
// router.use(protect); // Uncomment if auth is ready

router.post('/', deliveryOrderController.createDeliveryOrder);
router.get('/', deliveryOrderController.getDeliveryOrders);
router.get('/:id', deliveryOrderController.getDeliveryOrderById);
router.post('/:id/allocate', deliveryOrderController.allocateStorage);
router.post('/:id/schedule', deliveryOrderController.scheduleDock);
router.post('/:id/sap-sync', deliveryOrderController.syncWithSAP);

module.exports = router;
