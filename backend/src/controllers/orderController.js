// src/controllers/orderController.js
const { Order, OrderItem, Material, Dealer, DealerMaterial, TruckAssignment, Truck, Warehouse, TruckLocationHistory, sequelize } = require("../models");
const { Op } = require("sequelize");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");
const RBACEngine = require("../services/rbacEngine");
const { WorkflowService } = require("../services/workflow");
const eventBus = require("../services/eventBus");
const inventoryService = require("../services/inventoryService");

// --------------------------------------
// PLACE ORDER  (Dealer / Dealer Staff / Sales Executive)
// Creates a draft/pending order; workflow starts on submit.
// --------------------------------------
exports.placeOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // Determine dealer context
    let dealerId = req.user?.dealerId || req.body.dealerId;
    if (!dealerId) {
      return res.status(400).json({ error: "Missing dealerId" });
    }

    // Enforce that user is allowed to act for this dealer
    const allowedDealers = await RBACEngine.getDealersInScope(req.user);
    if (!allowedDealers.includes(dealerId)) {
      await t.rollback();
      return res.status(403).json({ error: "Dealer is out of scope for this user" });
    }

    const { items = [], notes } = req.body;
    if (!items.length)
      return res.status(400).json({ error: "No items provided" });

    let total = 0;
    for (const it of items) {
      const mat = await Material.findByPk(it.materialId);
      if (!mat) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: `Material ${it.materialId} not found` });
      }

      // Ensure material is available for this dealer via mapping table
      const mapping = await DealerMaterial.findOne({
        where: {
          dealerId,
          materialId: it.materialId,
          isActive: true,
        },
      });

      if (!mapping) {
        await t.rollback();
        return res.status(400).json({
          error: `Material ${it.materialId} is not available for this dealer`,
        });
      }

      total += Number(it.qty) * Number(it.unitPrice || 0);
    }

    const order = await Order.create(
      {
        dealerId,
        orderNumber: `ORD-${Date.now()}`,
        status: "Pending", // draft / pre-submission
        totalAmount: total,
        notes,
      },
      { transaction: t }
    );

    for (const it of items) {
      const lineTotal = Number(it.qty) * Number(it.unitPrice || 0);
      await OrderItem.create(
        {
          orderId: order.id,
          materialId: it.materialId,
          qty: it.qty,
          unitPrice: it.unitPrice,
          lineTotal,
        },
        { transaction: t }
      );
    }

    await t.commit();

    // Emit order created event
    await eventBus.emit('order:created', {
      orderId: order.id,
      dealerId: order.dealerId,
      orderNumber: order.orderNumber
    });

    return res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      approvalStage: order.approvalStage,
      approvalStatus: order.approvalStatus,
    });
  } catch (err) {
    await t.rollback();
    console.error("placeOrder:", err);
    res.status(500).json({ error: "Failed to place order", details: err.message });
  }
};

// --------------------------------------
// SUBMIT ORDER FOR APPROVAL
// --------------------------------------
exports.submitOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Ensure current user is allowed to act for this dealer
    const allowedDealers = await RBACEngine.getDealersInScope(req.user);
    if (!allowedDealers.includes(order.dealerId)) {
      await t.rollback();
      return res
        .status(403)
        .json({ error: "Dealer is out of scope for this user" });
    }

    // Prevent double submission / submission after approval or rejection
    if (order.approvalStage || order.approvalStatus === "approved") {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Order is already in approval workflow" });
    }
    if (order.approvalStatus === "rejected") {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Rejected orders cannot be submitted" });
    }

    // Mark as pending approval in business status
    order.status = "Pending Approval";
    await order.save({ transaction: t });

    // Start workflow from first stage (dealer_admin)
    await WorkflowService.startWorkflow("order", order, req.user, {
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: "Order submitted for approval",
      orderId: order.id,
      orderNumber: order.orderNumber,
      approvalStage: order.approvalStage,
      approvalStatus: order.approvalStatus,
      status: order.status,
    });
  } catch (err) {
    await t.rollback();
    console.error("submitOrder:", err);
    res
      .status(500)
      .json({ error: "Failed to submit order", details: err.message });
  }
};

// --------------------------------------
// DEALER / DEALER STAFF → MY ORDERS
// --------------------------------------
exports.getMyOrders = async (req, res) => {
  try {
    const roleName = req.user?.roleDetails?.name || req.user?.role;

    // Dealer roles: use their own dealerId
    if (roleName === "dealer_admin" || roleName === "dealer_staff") {
      const dealerId = req.user?.dealerId;

      const orders = await Order.findAll({
        where: { dealerId },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [{ model: Material, as: "material" }],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({ orders });
    }

    // Sales Executive: show orders across assigned dealers
    if (roleName === "sales_executive") {
      const dealerIds = await RBACEngine.getDealersInScope(req.user);
      if (!dealerIds.length) {
        return res.json({ orders: [] });
      }

      const orders = await Order.findAll({
        where: { dealerId: { [require("sequelize").Op.in]: dealerIds } },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [{ model: Material, as: "material" }],
          },
          { model: Dealer, as: "dealer" },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({ orders });
    }

    // Other roles: fallback to scoped "all orders" behavior
    const whereClause = await RBACEngine.buildScopeWhereClause(req.user, "Order");
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Material, as: "material" }],
        },
        { model: Dealer, as: "dealer" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ orders });
  } catch (err) {
    console.error("getMyOrders:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
};

// --------------------------------------
// DEALER ADMIN → PENDING ORDERS FOR APPROVAL
// --------------------------------------
exports.getPendingOrdersForApproval = async (req, res) => {
  try {
    const userRole = req.user.roleDetails?.name || req.user.role;
    const dealerId = req.user.dealerId;

    if (userRole === 'dealer_admin' && dealerId) {
      // Dealer admin sees orders from their dealer that are pending their approval
      const orders = await Order.findAll({
        where: {
          dealerId: dealerId,
          approvalStage: 'dealer_admin',
          approvalStatus: 'pending'
        },
        include: [
          { model: OrderItem, as: "items", include: [{ model: Material, as: "material" }] },
          { model: Dealer, as: "dealer" }
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({ orders, count: orders.length });
    }

    // For other roles, use scoped approach
    let whereClause = {
      approvalStatus: 'pending'
    };

    if (req.scope?.order) {
      Object.assign(whereClause, req.scope.order);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Order');
      Object.assign(whereClause, scopeWhere);
    }

    // Filter by current approval stage based on user's role
    if (userRole === 'territory_manager') {
      whereClause.approvalStage = 'territory_manager';
    } else if (userRole === 'area_manager') {
      whereClause.approvalStage = 'area_manager';
    } else if (userRole === 'regional_manager') {
      whereClause.approvalStage = 'regional_manager';
    } else if (userRole === 'regional_admin') {
      whereClause.approvalStage = 'regional_admin';
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: OrderItem, as: "items", include: [{ model: Material, as: "material" }] },
        { model: Dealer, as: "dealer" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ orders, count: orders.length });
  } catch (err) {
    console.error("getPendingOrdersForApproval:", err);
    res.status(500).json({ error: "Failed to load pending orders" });
  }
};

// --------------------------------------
// ADMIN / MANAGER → ALL ORDERS (SCOPED)
// --------------------------------------
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = { ...req.query };

    // Sanitize search parameter - escape special characters for SQL LIKE
    if (query.search) {
      // Decode URL-encoded characters first (e.g., + becomes space)
      query.search = decodeURIComponent(query.search);
      
      // Escape special characters that could break SQL LIKE queries
      // Only escape %, _, and backslash - don't escape spaces or hyphens
      query.search = query.search
        .replace(/[%_\\]/g, '\\$&') // Escape %, _, and backslash
        .trim();
      
      // If search is empty after sanitization, remove it
      if (!query.search) {
        delete query.search;
      }
    }

    // Normalize status: map 'draft' to 'Pending' and handle Title Case for Order model
    if (query.status) {
      const statusMap = {
        'draft': 'Approved',
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'pending approval': 'Pending Approval',
        'processing': 'Processing',
        'shipped': 'Shipped',
        'in transit': 'In Transit',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
      };

      query.status = query.status.split(',').map(s => {
        const trimmed = s.trim().toLowerCase();
        // Handle both lowercase and Title Case inputs
        const normalized = statusMap[trimmed];
        if (normalized) {
          return normalized;
        }
        // If input is already in Title Case (e.g., "Approved"), check if it's a valid enum value
        const titleCase = s.trim();
        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Pending Approval', 'Processing', 'Shipped', 'In Transit', 'Delivered', 'Cancelled'];
        if (validStatuses.includes(titleCase)) {
          return titleCase;
        }
        // Fallback to original
        return s.trim();
      }).join(',');
    }

    // Handle dealer business name search separately (requires join)
    // Also make search more flexible by splitting into parts
    let dealerWhere = {};
    if (query.search) {
      // Split search into parts (by dash, space, etc.) and search for any part
      const searchParts = query.search.split(/[-–—\s]+/).map(s => s.trim()).filter(s => s.length > 0);
      
      if (searchParts.length > 1) {
        // If search has multiple parts, search for each part separately
        // First part is likely order number, last part might be dealer name
        const orderNumberPart = searchParts[0];
        const dealerNamePart = searchParts[searchParts.length - 1];
        
        // Update search to use first part (order number) for order fields
        // This makes search less restrictive - only searches order number, not the full string
        query.search = orderNumberPart;
        
        // Search in dealer business name for dealer name part
        if (dealerNamePart && dealerNamePart.length > 2) {
          dealerWhere = {
            businessName: { [Op.iLike || Op.like]: `%${dealerNamePart}%` }
          };
        }
      } else if (searchParts.length === 1) {
        // Single part - could be order number or dealer name
        // If it looks like an order number (contains ORD- or is mostly numbers), use as-is
        // Otherwise, it might be a dealer name
        const singlePart = searchParts[0];
        if (!singlePart.match(/^ORD-|^\d+/) && singlePart.length > 3) {
          // Looks like a dealer name, search in dealer table
          dealerWhere = {
            businessName: { [Op.iLike || Op.like]: `%${singlePart}%` }
          };
          // Clear search from order fields to avoid double filtering
          delete query.search;
        }
      }
    }

    const { buildAdvancedWhere } = require('../utils/filterHelper');
    const whereClause = buildAdvancedWhere(query, {
      searchFields: ['orderNumber', 'notes'], // Removed 'status' - it's an ENUM and can't use LIKE
      dateFields: ['createdAt', 'updatedAt'],
      numberFields: ['totalAmount'],
      exactFields: ['status', 'dealerId', 'approvalStage', 'approvalStatus'] // status is handled here as exact match
    });

    // If scoping middleware populated a scope, honor it
    if (req.scope?.order) {
      Object.assign(whereClause, req.scope.order);
    } else {
      // Use RBAC engine to build scope
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Order');
      Object.assign(whereClause, scopeWhere);
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: OrderItem, 
          as: "items", 
          required: false, // Left join - don't fail if no items
          include: [{ 
            model: Material, 
            as: "material",
            required: false // Left join - don't fail if material is missing
          }] 
        },
        { 
          model: Dealer, 
          as: "dealer",
          required: false, // Left join - don't fail if dealer is missing
          attributes: ['id', 'dealerCode', 'businessName', 'email', 'phoneNumber', 'address', 'city', 'state']
        },
      ],
      attributes: {
        exclude: [] // Include all order fields for dropdown selection
      },
      offset,
      limit: parseInt(limit, 10),
      order: [["createdAt", "DESC"]],
      distinct: true, // Important when using includes with count
    });

    // Log response for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ getAllOrders: Returning ${rows.length} orders (total: ${count})`);
      console.log(`📋 Query params:`, { status: query.status, search: query.search, limit, page });
    }

    // Disable caching for dynamic order queries to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      orders: rows,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10))
    });
  } catch (err) {
    console.error("❌ getAllOrders error:", err);
    console.error("❌ getAllOrders error stack:", err.stack);
    console.error("❌ Query params:", req.query);
    res.status(500).json({ 
      error: "Failed to load orders",
      message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

// --------------------------------------
// GET SINGLE ORDER BY ID
// --------------------------------------
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Build where clause with RBAC scoping
    let whereClause = { id };

    // If scoping middleware populated a scope, honor it
    if (req.scope?.order) {
      Object.assign(whereClause, req.scope.order);
    } else {
      // Use RBAC engine to build scope
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Order');
      Object.assign(whereClause, scopeWhere);
    }

    const order = await Order.findOne({
      where: whereClause,
      include: [
        {
          model: Dealer,
          as: "dealer",
          attributes: ["id", "businessName", "dealerCode", "address", "phoneNumber", "email"],
        },
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Material,
              as: "material",
              attributes: ["id", "name", "materialNumber", "uom", "description"],
            },
          ],
        },
        {
          model: TruckAssignment,
          as: "truckAssignment",
          include: [
            {
              model: Truck,
              as: "truck",
              attributes: ["id", "licenseNumber", "truckType", "status", "currentLat", "currentLng", "lastLocationUpdate"], // truckName removed - column doesn't exist
            },
            {
              model: Warehouse,
              as: "warehouse",
              attributes: ["id", "name", "warehouseCode", "address", "lat", "lng", "city"],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Additional access check through RBAC
    const canAccess = await RBACEngine.canAccessResource(req.user, order);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied to this order" });
    }

    res.json(order);
  } catch (err) {
    console.error("getOrderById:", err);
    res.status(500).json({ error: "Failed to fetch order", details: err.message });
  }
};

// --------------------------------------
// STATUS UPDATE (Admin / Manager)
// --------------------------------------
exports.updateOrderStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: "items" }] });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const oldStatus = order.status;
    order.status = status;
    await order.save({ transaction: t });

    // Use inventory service for stock management
    if (["Shipped", "Processing"].includes(status)) {
      await inventoryService.reduceStockOnOrderApproval(order.id, t);
    }

    // Handle status change events
    await inventoryService.handleOrderStatusChange(order.id, oldStatus, status);

    await t.commit();
    res.json({ order });
  } catch (err) {
    await t.rollback();
    console.error("updateOrderStatus:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

// --------------------------------------
// APPROVE ORDER (Multi-stage)
// --------------------------------------
exports.approveOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason, notes } = req.body;
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: "items" }],
      transaction: t
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // If workflow hasn't been started, start it first
    if (!order.approvalStage && order.approvalStatus !== 'approved') {
      // Check if order is in a valid state to start workflow
      if (order.status === 'Cancelled' || order.status === 'Rejected') {
        await t.rollback();
        return res.status(400).json({
          error: "Cannot start workflow for cancelled or rejected order"
        });
      }

      // Start the workflow
      await WorkflowService.startWorkflow("order", order, req.user, {
        transaction: t
      });

      // Reload order to get updated approvalStage
      await order.reload({ transaction: t });
    }

    // Use workflow service for approval
    const result = await WorkflowService.approve(
      "order",
      order,
      req.user,
      { remarks: notes || reason, transaction: t }
    );

    // If final approval, reduce stock
    if (result.isFinal) {
      await inventoryService.reduceStockOnOrderApproval(order.id, t);
    }

    await t.commit();

    return res.json({
      message: result.message,
      order: result.entity,
      stage: result.stage,
      isFinal: result.isFinal
    });
  } catch (err) {
    await t.rollback();
    console.error("approveOrder:", err);
    res.status(500).json({ error: "Failed to approve order", details: err.message });
  }
};


// --------------------------------------
// REJECT ORDER (Multi-stage)
// --------------------------------------
exports.rejectOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Use workflow service for rejection
    const result = await WorkflowService.reject(
      "order",
      order,
      req.user,
      { reason, rollback: true, transaction: t }
    );

    await t.commit();
    return res.json({ message: "Order rejected", order: result.entity });
  } catch (err) {
    await t.rollback();
    console.error("rejectOrder:", err);
    res.status(500).json({ error: "Failed to reject order", details: err.message });
  }
};

// --------------------------------------
// GET WORKFLOW STATUS
// --------------------------------------
exports.getWorkflowStatus = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const status = await WorkflowService.getWorkflowStatus("order", order);
    
    // Disable caching for workflow status to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({ success: true, workflow: status });
  } catch (err) {
    console.error("getWorkflowStatus:", err);
    res.status(500).json({ error: "Failed to get workflow status", details: err.message });
  }
};

// --------------------------------------
// GET ORDER TRACKING
// --------------------------------------
exports.getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: TruckAssignment,
          as: "truckAssignment",
          include: [
            {
              model: Truck,
              as: "truck",
              attributes: ["id", "licenseNumber", "truckType", "currentLat", "currentLng", "lastLocationUpdate"], // truckName removed - column doesn't exist
            },
            {
              model: Warehouse,
              as: "warehouse",
              attributes: ["id", "name", "warehouseCode", "lat", "lng", "address", "city"],
            },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check access
    const allowedDealers = await RBACEngine.getDealersInScope(req.user);
    if (order.dealerId && !allowedDealers.includes(order.dealerId)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!order.truckAssignment) {
      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        hasAssignment: false,
        message: "No truck assigned to this order",
      });
    }

    // Get recent location history
    const recentHistory = await TruckLocationHistory.findAll({
      where: {
        truckAssignmentId: order.truckAssignment.id,
      },
      limit: 50,
      order: [["timestamp", "DESC"]],
    });

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      assignment: {
        id: order.truckAssignment.id,
        status: order.truckAssignment.status,
        driverName: order.truckAssignment.driverName,
        driverPhone: order.truckAssignment.driverPhone,
        assignedAt: order.truckAssignment.assignedAt,
        pickupAt: order.truckAssignment.pickupAt,
        deliveredAt: order.truckAssignment.deliveredAt,
        estimatedDeliveryAt: order.truckAssignment.estimatedDeliveryAt,
        truck: order.truckAssignment.truck,
        warehouse: order.truckAssignment.warehouse,
      },
      currentLocation: order.truckAssignment.truck
        ? {
          lat: order.truckAssignment.truck.currentLat,
          lng: order.truckAssignment.truck.currentLng,
          lastUpdate: order.truckAssignment.truck.lastLocationUpdate,
        }
        : null,
      locationHistory: recentHistory.map((h) => ({
        lat: h.lat,
        lng: h.lng,
        speed: h.speed,
        heading: h.heading,
        timestamp: h.timestamp,
      })),
    });
  } catch (err) {
    console.error("getOrderTracking:", err);
    res.status(500).json({ error: "Failed to get order tracking", details: err.message });
  }
};