const {
  Dealer,
  Invoice,
  Document,
  PricingUpdate,
  AccountStatement,
  Product,
} = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // ======================================
  // ✅ GET /api/managers/summary
  // ======================================
  getSummary: async (req, res) => {
    try {
      const managerId = req.user.id;

      // 1️⃣ Fetch dealers managed by this user
      const dealers = await Dealer.findAll({
        where: { managerId },
        attributes: ['id', 'dealerCode', 'businessName', 'isBlocked', 'outstandingAmount'],
      });

      const dealerIds = dealers.map((d) => d.id);
      const totalDealers = dealers.length;
      const totalOutstanding = dealers.reduce(
        (s, d) => s + Number(d.outstandingAmount || 0),
        0
      );

      // 2️⃣ Count pending documents for these dealers
      const pendingDocuments = await Document.count({
        where: {
          dealerId: { [Op.in]: dealerIds },
          status: 'pending',
        },
      });

      // 3️⃣ Count pending pricing requests
      const pendingPricing = await PricingUpdate.count({
        where: {
          dealerId: { [Op.in]: dealerIds },
          status: 'pending',
        },
      });

      // 4️⃣ Get invoices from last 30 days
      const invoices = await Invoice.findAll({
        where: {
          dealerId: { [Op.in]: dealerIds },
          invoiceDate: { [Op.gte]: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        },
        attributes: ['totalAmount', 'status'],
      });

      const recentSales = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);

      res.json({
        totalDealers,
        totalOutstanding,
        pendingDocuments,
        pendingPricing,
        recentSales,
        dealers,
      });
    } catch (err) {
      console.error('❌ manager.getSummary Error:', err);
      res.status(500).json({ error: 'Failed to get manager summary' });
    }
  },

  // ======================================
  // ✅ GET /api/managers/dealers
  // ======================================
  // ======================================
// ✅ GET /api/managers/dealers (with linked user info)
// ======================================
getDealers: async (req, res) => {
  try {
    const managerId = req.user.id;

    const dealers = await Dealer.findAll({
      where: { managerId },
      include: [
        {
          model: Invoice,
          as: "invoices",
          limit: 5,
          order: [["invoiceDate", "DESC"]],
        },
        {
          // 🔹 Add the associated User record (used for messaging)
          model: require("../models").User,
          as: "users",
          attributes: ["id", "username", "email", "role"],
        },
      ],
    });

    res.json({ dealers });
  } catch (err) {
    console.error("❌ manager.getDealers Error:", err);
    res.status(500).json({ error: "Failed to fetch dealers" });
  }
},


  // ======================================
  // ✅ GET /api/managers/dealers/:id
  // ======================================
  getDealerById: async (req, res) => {
    try {
      const managerId = req.user.id;
      const { id } = req.params;

      const dealer = await Dealer.findOne({
        where: { id, managerId },
        include: [
          { model: Invoice, as: 'invoices', order: [['invoiceDate', 'DESC']] },
          { model: Document, as: 'documents', order: [['createdAt', 'DESC']] },
          {
            model: AccountStatement,
            as: 'accountStatements',
            order: [['statementDate', 'DESC']],
          },
        ],
      });

      if (!dealer)
        return res
          .status(404)
          .json({ error: 'Dealer not found or not under your management' });

      res.json(dealer);
    } catch (err) {
      console.error('❌ manager.getDealerById Error:', err);
      res.status(500).json({ error: 'Failed to fetch dealer' });
    }
  },

  // ======================================
  // ✅ GET /api/managers/pricing
  // ======================================
getPricingRequests: async (req, res) => {
  try {
    const managerId = req.user.id;
    console.log("🔹 Logged-in managerId from token:", managerId);

    // 1️⃣ Get all dealers under this manager
    const dealerIds = (
      await Dealer.findAll({
        where: { managerId },
        attributes: ['id'],
      })
    ).map((d) => d.id);

    console.log("🔹 Dealer IDs under this manager:", dealerIds);

    // 2️⃣ Build filter
    const where = { dealerId: { [Op.in]: dealerIds } };
    if (req.query.status) {
      where.status = req.query.status.toLowerCase();
      console.log("🔹 Filtering by status:", where.status);
    }

    // 3️⃣ Fetch pricing updates
    const updates = await PricingUpdate.findAll({
      where,
      include: [
        {
          model: Dealer,
          as: 'dealer',
          attributes: ['dealerCode', 'businessName'],
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'plant', 'stock', 'uom'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    console.log("✅ Found updates:", updates.length);
    console.table(
      updates.map((u) => ({
        id: u.id,
        dealer: u.dealer?.businessName,
        status: u.status,
        newPrice: u.newPrice,
      }))
    );

    // 4️⃣ Return structured response
    res.json({ updates });
  } catch (err) {
    console.error('❌ manager.getPricingRequests Error:', err);
    res.status(500).json({ error: 'Failed to fetch pricing requests' });
  }
},

  // ======================================
  // ✅ PATCH /api/managers/pricing/:id/forward
  // ======================================
  forwardPricingToAdmin: async (req, res) => {
    try {
      const managerId = req.user.id;
      const { id } = req.params;
      const { action, remarks } = req.body;

      const pricing = await PricingUpdate.findByPk(id);
      if (!pricing) return res.status(404).json({ error: 'Pricing request not found' });

      const dealer = await Dealer.findOne({
        where: { id: pricing.dealerId, managerId },
      });
      if (!dealer)
        return res.status(403).json({ error: 'Not authorized to manage this request' });

      if (action === 'forward') {
        pricing.status = 'pending';
        pricing.remarks =
          (pricing.remarks ? pricing.remarks + '\n' : '') +
          `Forwarded by ${req.user.username}: ${remarks || ''}`;
        await pricing.save();
        return res.json({ message: 'Forwarded to admin', pricing });
      }

      if (action === 'approve' || action === 'reject') {
        pricing.status = action === 'approve' ? 'approved' : 'rejected';
        pricing.approvedBy = req.user.username;
        pricing.approvedAt = new Date();
        pricing.remarks =
          (pricing.remarks ? pricing.remarks + '\n' : '') +
          `${action} by ${req.user.username}: ${remarks || ''}`;
        await pricing.save();

        if (action === 'approve') {
          await Product.update(
            { price: pricing.newPrice },
            { where: { id: pricing.productId } }
          );
        }

        return res.json({ message: 'Pricing updated', pricing });
      }

      res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
      console.error('❌ manager.forwardPricingToAdmin Error:', err);
      res.status(500).json({ error: 'Failed to process pricing request' });
    }
  },

  // ======================================
  // ✅ POST /api/managers/assign-dealer
  // ======================================
  assignDealerToManager: async (req, res) => {
    try {
      const { dealerId, managerId } = req.body;
      if (!dealerId || !managerId)
        return res.status(400).json({ error: 'dealerId and managerId required' });

      const dealer = await Dealer.findByPk(dealerId);
      if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

      dealer.managerId = managerId;
      await dealer.save();

      res.json({ message: 'Dealer assigned successfully', dealer });
    } catch (err) {
      console.error('❌ manager.assignDealerToManager Error:', err);
      res.status(500).json({ error: 'Failed to assign dealer' });
    }
  },
};
