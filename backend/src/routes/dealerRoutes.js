const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScoping } = require('../middleware/scoping');
const { Dealer, User } = require('../models'); // ✅ needed

// 🧩 List all dealers
router.get('/', authenticate, checkPermission('dealer.view'), applyScoping(['Dealer']), dealerController.getAllDealers);

// 🧩 Dealer profile
router.get('/profile', authenticate, authorize("dealer_admin","dealer_staff"), checkPermission('dealer.view'), dealerController.getDealerProfile);

// ✅ FIX: Place this BEFORE "/:id"
router.get("/my-manager", authenticate, authorize("dealer_admin","dealer_staff"), async (req, res) => {
  try {
    console.log("🟢 req.user:", req.user);

    const dealerId = req.user.dealerId; // ✅ FIXED
    if (!dealerId) return res.status(400).json({ error: "Dealer ID missing in user token" });

    const dealer = await Dealer.findByPk(dealerId);

    if (!dealer || !dealer.managerId)
      return res.status(404).json({ error: "No manager assigned" });

    const manager = await User.findByPk(dealer.managerId, {
      attributes: ["id", "username", "email", "role"]
    });

    if (!manager)
      return res.status(404).json({ error: "Assigned manager not found" });

    res.json({ manager });
  } catch (err) {
    console.error("Error fetching dealer’s manager:", err);
    res.status(500).json({ error: "Failed to fetch manager" });
  }
});


// 🧩 Manager → Dealers
router.get(
  "/assigned",
  authenticate,
  authorize("tm", "am", "sm"),
  checkPermission("dealer.view"),
  dealerController.getDealersByManager
);

// 🧩 Dealer by ID (keep this at the bottom)
router.get('/:id', authenticate, checkPermission('dealer.view'), applyScoping(['Dealer']), dealerController.getDealerById);
router.post('/', authenticate, authorize('super_admin', 'key_user'), checkPermission('dealer.create'), dealerController.createDealer);
router.put('/:id', authenticate, authorize('super_admin', 'key_user'), checkPermission('dealer.update'), dealerController.updateDealer);
router.put('/:id/block', authenticate, authorize('super_admin'), checkPermission('dealer.update'), dealerController.blockDealer);
router.put('/:id/verify', authenticate, authorize('super_admin', 'key_user'), checkPermission('dealer.update'), dealerController.verifyDealer);

module.exports = router;
