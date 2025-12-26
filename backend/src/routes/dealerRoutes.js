const express = require('express');
const router = express.Router();
const dealerController = require('../controllers/dealerController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScope } = require('../middleware/rbac');
const { Dealer, User } = require('../models'); // ✅ needed

// 🧩 List all dealers
router.get('/', authenticate, checkPermission('dealer.view'), applyScope(['Dealer']), dealerController.getAllDealers);

// 🧩 Diagnostic endpoint - check user's database state
router.get('/debug/my-account', authenticate, authorize("dealer_admin","dealer_staff"), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: require('../models').Role, as: 'roleDetails' },
        { model: Dealer, as: 'dealer' }
      ],
      attributes: ['id', 'username', 'email', 'role', 'roleId', 'dealerId', 'regionId', 'areaId', 'territoryId', 'isActive']
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const dealer = user.dealerId ? await Dealer.findByPk(user.dealerId, {
      attributes: ['id', 'dealerCode', 'businessName', 'regionId', 'areaId', 'territoryId', 'managerId']
    }) : null;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        roleDetails: user.roleDetails,
        dealerId: user.dealerId,
        regionId: user.regionId,
        areaId: user.areaId,
        territoryId: user.territoryId,
        isActive: user.isActive
      },
      dealerInDB: dealer ? {
        id: dealer.id,
        dealerCode: dealer.dealerCode,
        businessName: dealer.businessName,
        regionId: dealer.regionId,
        areaId: dealer.areaId,
        territoryId: dealer.territoryId,
        managerId: dealer.managerId
      } : null,
      tokenData: {
        dealerId: req.user.dealerId,
        role: req.user.role,
        regionId: req.user.regionId,
        areaId: req.user.areaId,
        territoryId: req.user.territoryId
      },
      diagnosis: {
        hasDealerIdInDB: !!user.dealerId,
        hasDealerIdInToken: !!req.user.dealerId,
        dealerIdMatches: user.dealerId === req.user.dealerId,
        dealerExists: !!dealer,
        needsRelogin: user.dealerId && !req.user.dealerId,
        status: !user.dealerId 
          ? "❌ No dealerId in database - user needs to be assigned a dealer"
          : !dealer 
            ? "❌ DealerId exists but dealer not found - dealer may have been deleted"
            : user.dealerId !== req.user.dealerId
              ? "⚠️ DealerId in database but not in token - user needs to log out and log back in"
              : "✅ Account is properly linked to dealer"
      }
    });
  } catch (err) {
    console.error("Debug account error:", err);
    res.status(500).json({ error: "Failed to check account state", details: err.message });
  }
});

// 🧩 Dealer profile (self-service - authorize is sufficient, no need for permission check)
router.get('/profile', authenticate, authorize("dealer_admin","dealer_staff"), dealerController.getDealerProfile);

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


// 🧩 Manager / Sales Executive → Dealers
router.get(
  "/assigned",
  authenticate,
  authorize("territory_manager", "area_manager", "regional_manager","dealer_admin","dealer_staff","super_admin","technical_admin","regional_admin","sales_executive"),
  checkPermission("dealer.view"),
  dealerController.getDealersByManager
);

// 🧩 Dealer ↔ Material mappings (ADMIN ONLY)
// These are used by admin/inventory UIs to control material availability per dealer.
router.get(
  "/:id/materials",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user", "regional_admin", "area_manager", "territory_manager"),
  checkPermission("materials.view"),
  dealerController.getDealerMaterialsAdmin
);

router.post(
  "/:id/materials",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user", "regional_admin", "area_manager", "territory_manager"),
  checkPermission("materials.manage"),
  dealerController.assignDealerMaterials
);

router.delete(
  "/:id/materials/:materialId",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user", "regional_admin", "area_manager", "territory_manager"),
  checkPermission("materials.manage"),
  dealerController.removeDealerMaterial
);

// 🧩 Dealer by ID (keep this at the bottom)
router.get('/:id', authenticate, checkPermission('dealer.view'), applyScope(['Dealer']), dealerController.getDealerById);

// Onboarding: create dealer in pending_approval state
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'key_user', 'regional_admin', 'regional_manager', 'area_manager'),
  checkPermission('dealer.create'),
  dealerController.createDealer
);

router.put('/:id', authenticate, authorize('super_admin', 'key_user'), checkPermission('dealer.update'), dealerController.updateDealer);
router.put('/:id/block', authenticate, authorize('super_admin'), checkPermission('dealer.update'), dealerController.blockDealer);
router.put('/:id/verify', authenticate, authorize('super_admin', 'key_user'), checkPermission('dealer.update'), dealerController.verifyDealer);

// Multi-stage dealer onboarding approvals
router.patch(
  '/:id/approve',
  authenticate,
  authorize('territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin'),
  checkPermission('dealer.update'),
  dealerController.approveDealer
);
router.patch(
  '/:id/reject',
  authenticate,
  authorize('territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin'),
  checkPermission('dealer.update'),
  dealerController.approveDealer
);

module.exports = router;
