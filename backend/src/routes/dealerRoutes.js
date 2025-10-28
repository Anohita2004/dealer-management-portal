const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, dealerController.getAllDealers);
router.get('/profile', authenticate, authorize('dealer'), dealerController.getDealerProfile);
router.get('/:id', authenticate, dealerController.getDealerById);
router.post('/', authenticate, authorize('admin', 'key_user'), dealerController.createDealer);
router.put('/:id', authenticate, authorize('admin', 'key_user'), dealerController.updateDealer);
router.patch('/:id/block', authenticate, authorize('admin'), dealerController.blockDealer);

module.exports = router;
