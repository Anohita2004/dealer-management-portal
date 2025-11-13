const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { authenticate, authorize } = require('../middleware/auth');
const { Dealer, User } = require('../models'); // ✅ needed

// 🧩 List all dealers
router.get('/', authenticate, dealerController.getAllDealers);

// 🧩 Dealer profile
router.get('/profile', authenticate, authorize('dealer'), dealerController.getDealerProfile);

// ✅ FIX: Place this BEFORE "/:id"
router.get("/my-manager", authenticate, authorize("dealer"), async (req, res) => {
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
  dealerController.getDealersByManager
);

// 🧩 Dealer by ID (keep this at the bottom)
router.get('/:id', authenticate, dealerController.getDealerById);
router.post('/', authenticate, authorize('admin', 'key_user'), dealerController.createDealer);
router.put('/:id', authenticate, authorize('admin', 'key_user'), dealerController.updateDealer);
router.put('/:id/block', authenticate, authorize('admin'), dealerController.blockDealer);
router.put('/:id/verify', authenticate, authorize('admin', 'key_user'), dealerController.verifyDealer);

module.exports = router;
