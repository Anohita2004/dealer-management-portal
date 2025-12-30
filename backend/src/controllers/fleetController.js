// src/controllers/fleetController.js
const { TruckAssignment, Order, Truck, Warehouse, User } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");
const fleetService = require("../services/fleetService");

/**
 * Assign truck to order
 */
exports.assignTruckToOrder = async (req, res) => {
  try {
    const {
      orderId,
      truckId,
      warehouseId,
      driverName,
      driverPhone,
      estimatedDeliveryAt,
      notes,
    } = req.body;

    if (!orderId || !truckId || !warehouseId || !driverName) {
      return res.status(400).json({
        error: "Missing required fields: orderId, truckId, warehouseId, driverName",
      });
    }

    // Check if user has permission to assign
    const canAssign = await RBACEngine.hasPermission(req.user, "fleet.assign");
    if (!canAssign) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Check order access
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const canAccessOrder = await RBACEngine.canAccessResource(req.user, order);
    if (!canAccessOrder) {
      return res.status(403).json({ error: "Access denied to order" });
    }

    const assignment = await fleetService.assignTruckToOrder(
      orderId,
      truckId,
      warehouseId,
      driverName,
      driverPhone,
      estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null,
      req.user.id,
      notes
    );

    // Fetch full assignment details
    const fullAssignment = await TruckAssignment.findByPk(assignment.id, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
        { model: User, as: "assignedByUser", attributes: ["id", "username", "email"] },
      ],
    });

    res.status(201).json(fullAssignment);
  } catch (error) {
    console.error("Assign truck error:", error);
    res.status(500).json({ error: "Failed to assign truck", details: error.message });
  }
};

/**
 * Get all assignments (scoped)
 */
exports.getAssignments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      orderId,
      truckId,
      warehouseId,
    } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) where.status = status;
    if (orderId) where.orderId = orderId;
    if (truckId) where.truckId = truckId;
    if (warehouseId) where.warehouseId = warehouseId;

    // Apply RBAC scoping through orders
    // We'll filter by order's dealer/region/area
    const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, "Order");
    if (Object.keys(scopeWhere).length > 0) {
      const orders = await Order.findAll({
        where: scopeWhere,
        attributes: ["id"],
      });
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length > 0) {
        where.orderId = { [Op.in]: orderIds };
      } else {
        // User has no access to any orders, return empty
        return res.json({
          assignments: [],
          total: 0,
          page: parseInt(page),
          totalPages: 0,
        });
      }
    }

    const { count, rows } = await TruckAssignment.findAndCountAll({
      where,
      include: [
        { model: Order, as: "order", attributes: ["id", "orderNumber", "status", "dealerId"] },
        { model: Truck, as: "truck", attributes: ["id", "truckName", "licenseNumber", "status"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name", "warehouseCode"] },
        { model: User, as: "assignedByUser", attributes: ["id", "username"] },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      assignments: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};

/**
 * Get assignment by ID
 */
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
        { model: User, as: "assignedByUser", attributes: ["id", "username", "email"] },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check access through order
    const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(assignment);
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

/**
 * Update assignment status
 */
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [{ model: Order, as: "order" }],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate status transition
    const validTransitions = {
      assigned: ["picked_up", "cancelled"],
      picked_up: ["in_transit", "cancelled"],
      in_transit: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[assignment.status]?.includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${assignment.status} to ${status}`,
      });
    }

    assignment.status = status;
    if (notes) assignment.notes = notes;
    await assignment.save();

    // Update order status if needed
    await fleetService.updateOrderStatusOnAssignment(assignment.orderId, assignment);

    res.json(assignment);
  } catch (error) {
    console.error("Update assignment status error:", error);
    res.status(500).json({ error: "Failed to update assignment status", details: error.message });
  }
};

/**
 * Mark pickup
 */
exports.markPickup = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [{ model: Order, as: "order" }],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedAssignment = await fleetService.markPickup(assignment.id);

    // Fetch full details
    const fullAssignment = await TruckAssignment.findByPk(updatedAssignment.id, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
    });

    res.json(fullAssignment);
  } catch (error) {
    console.error("Mark pickup error:", error);
    res.status(500).json({ error: "Failed to mark pickup", details: error.message });
  }
};

/**
 * Mark delivered
 */
exports.markDelivered = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [{ model: Order, as: "order" }],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedAssignment = await fleetService.markDelivered(assignment.id);

    // Fetch full details
    const fullAssignment = await TruckAssignment.findByPk(updatedAssignment.id, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
    });

    res.json(fullAssignment);
  } catch (error) {
    console.error("Mark delivered error:", error);
    res.status(500).json({ error: "Failed to mark delivered", details: error.message });
  }
};

