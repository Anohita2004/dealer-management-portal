const express = require('express');
const router = express.Router();

// ✅ Import the *right* controller (adminController, not authController)
const adminController = require('../controllers/adminController');

// ✅ Destructure authenticate and authorize from your middleware
const { authenticate, authorize } = require('../middleware/auth');
const pricingController = require('../controllers/pricingController');

router.get('/pricing-updates', authenticate, authorize('admin'), pricingController.getPricingUpdates);
router.patch('/pricing-updates/:id/review', authenticate, authorize('admin'), adminController.reviewPricingUpdate);



// ✅ Apply authentication for all admin routes
router.use(authenticate);

// ---------------- Dealer Management ----------------
router.put('/dealers/:id/block', authorize('admin'), adminController.blockDealer);
router.put('/dealers/:id/verify', authorize('admin'), adminController.verifyDealer);

// ---------------- Sales Groups ----------------
router.post('/sales-groups/merge', authorize('admin'), adminController.mergeSalesGroups);

// ---------------- Documents ----------------
router.put('/documents/:id/review', authorize('admin'), adminController.reviewDocument);

// ---------------- Pricing ----------------
router.put('/pricing/:id/review', authorize('admin'), adminController.reviewPricingUpdate);

// ---------------- User Management ----------------
router.get('/users', authorize('admin'), adminController.getAllUsers);
router.post('/users', authorize('admin'), adminController.createUser);   // ✅ ADD
router.put('/users/:id', authorize('admin'), adminController.updateUser);  // ✅ ADD
router.put('/users/:id/role', authorize('admin'), adminController.updateUserRole);
router.delete('/users/:id', authorize('admin'), adminController.deleteUser);
router.put('/dealers/:id/assign-region', authorize('admin'), adminController.assignRegion);
router.put('/users/:id', authorize('admin'), adminController.updateUser);




// ---------------- Reports ----------------
router.get('/reports', authorize('admin'), adminController.getAdminReport);

module.exports = router;
