const { Order, Invoice, PaymentRequest, Document, PricingUpdate, Dealer, sequelize } = require('../models');
const { Op } = require('sequelize');
const { getDealersUnderUserScope } = require('../middleware/scoping');

// Get pending tasks for current user based on role
const getMyTasks = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;
    const tasks = [];

    // Get dealers under user's scope
    const dealerIds = await getDealersUnderUserScope(req.user);

    // Pending Orders
    if (['territory_manager', 'area_manager', 'regional_manager', 'regional_admin'].includes(role)) {
      const pendingOrders = await Order.findAll({
        where: {
          approvalStatus: 'pending',
          dealerId: { [Op.in]: dealerIds }
        },
        include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
        order: [['createdAt', 'ASC']],
        limit: 50
      });
      tasks.push(...pendingOrders.map(o => ({
        id: o.id,
        type: 'order',
        title: `Order ${o.orderNumber} requires approval`,
        entityId: o.id,
        dealerName: o.dealer?.businessName,
        createdAt: o.createdAt,
        stage: o.approvalStage,
        priority: 'normal'
      })));
    }

    // Pending Invoices
    if (['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'].includes(role)) {
      const pendingInvoices = await Invoice.findAll({
        where: {
          approvalStatus: 'pending',
          ...(role.startsWith('dealer_') ? { dealerId: req.user.dealerId } : { dealerId: { [Op.in]: dealerIds } })
        },
        include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
        order: [['createdAt', 'ASC']],
        limit: 50
      });
      tasks.push(...pendingInvoices.map(i => ({
        id: i.id,
        type: 'invoice',
        title: `Invoice ${i.invoiceNumber} requires approval`,
        entityId: i.id,
        dealerName: i.dealer?.businessName,
        createdAt: i.createdAt,
        stage: i.approvalStage,
        priority: 'normal'
      })));
    }

    // Pending Payments
    if (['dealer_admin', 'finance_admin'].includes(role)) {
      const pendingPayments = await PaymentRequest.findAll({
        where: {
          approvalStatus: 'pending',
          ...(role === 'dealer_admin' ? { dealerId: req.user.dealerId } : {})
        },
        include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
        order: [['createdAt', 'ASC']],
        limit: 50
      });
      tasks.push(...pendingPayments.map(p => ({
        id: p.id,
        type: 'payment',
        title: `Payment request ${p.id} requires approval`,
        entityId: p.id,
        dealerName: p.dealer?.businessName,
        createdAt: p.createdAt,
        stage: p.approvalStage,
        priority: 'normal'
      })));
    }

    // Pending Documents
    if (['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager'].includes(role)) {
      const pendingDocs = await Document.findAll({
        where: {
          approvalStatus: 'pending',
          ...(role.startsWith('dealer_') ? { dealerId: req.user.dealerId } : { dealerId: { [Op.in]: dealerIds } })
        },
        include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
        order: [['createdAt', 'ASC']],
        limit: 50
      });
      tasks.push(...pendingDocs.map(d => ({
        id: d.id,
        type: 'document',
        title: `Document ${d.documentName} requires approval`,
        entityId: d.id,
        dealerName: d.dealer?.businessName,
        createdAt: d.createdAt,
        stage: d.approvalStage,
        priority: 'normal'
      })));
    }

    // Pending Pricing
    if (['area_manager', 'regional_admin', 'super_admin'].includes(role)) {
      const pendingPricing = await PricingUpdate.findAll({
        where: {
          approvalStatus: 'pending',
          ...(role !== 'super_admin' ? { dealerId: { [Op.in]: dealerIds } } : {})
        },
        include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
        order: [['createdAt', 'ASC']],
        limit: 50
      });
      tasks.push(...pendingPricing.map(p => ({
        id: p.id,
        type: 'pricing',
        title: `Pricing request ${p.id} requires approval`,
        entityId: p.id,
        dealerName: p.dealer?.businessName,
        createdAt: p.createdAt,
        stage: p.approvalStage,
        priority: 'normal'
      })));
    }

    // Sort by creation date
    tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      tasks,
      total: tasks.length,
      byType: {
        order: tasks.filter(t => t.type === 'order').length,
        invoice: tasks.filter(t => t.type === 'invoice').length,
        payment: tasks.filter(t => t.type === 'payment').length,
        document: tasks.filter(t => t.type === 'document').length,
        pricing: tasks.filter(t => t.type === 'pricing').length
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

module.exports = {
  getMyTasks
};

