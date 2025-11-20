const express = require('express');
const router = express.Router();

// ✅ Import the *right* controller (adminController, not authController)
const adminController = require('../controllers/adminController');

// ✅ Destructure authenticate and authorize from your middleware
const { authenticate, authorize } = require('../middleware/auth');
const pricingController = require('../controllers/pricingController');

router.get('/pricing-updates', authenticate, authorize('super_admin'), pricingController.getPricingUpdates);
router.patch('/pricing-updates/:id/review', authenticate, authorize('super_admin'), adminController.reviewPricingUpdate);



// ✅ Apply authentication for all admin routes
router.use(authenticate);

// ---------------- Dealer Management ----------------
router.put('/dealers/:id/block', authorize('super_admin'), adminController.blockDealer);
router.put('/dealers/:id/verify', authorize('super_admin'), adminController.verifyDealer);

// ---------------- Sales Groups ----------------
router.post('/sales-groups/merge', authorize('super_admin'), adminController.mergeSalesGroups);

// ---------------- Documents ----------------
router.put('/documents/:id/review', authorize('super_admin'), adminController.reviewDocument);

// ---------------- Pricing ----------------
router.put('/pricing/:id/review', authorize('super_admin'), adminController.reviewPricingUpdate);

// ---------------- User Management ----------------
router.get('/users', authorize('super_admin'), adminController.getAllUsers);
router.post('/users', authorize('super_admin'), adminController.createUser);   // ✅ ADD
router.put('/users/:id', authorize('super_admin'), adminController.updateUser);  // ✅ ADD
router.put('/users/:id/role', authorize('super_admin'), adminController.updateUserRole);
router.delete('/users/:id', authorize('super_admin'), adminController.deleteUser);
router.put('/dealers/:id/assign-region', authorize('super_admin'), adminController.assignRegion);
router.put('/users/:id', authorize('super_admin'), adminController.updateUser);




// ---------------- Reports ----------------
router.get('/reports', authorize('super_admin'), adminController.getAdminReport);

module.exports = router;
