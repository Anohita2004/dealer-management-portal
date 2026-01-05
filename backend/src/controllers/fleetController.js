// src/controllers/fleetController.js
const { TruckAssignment, Order, Truck, Warehouse, User, Dealer } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");
const fleetService = require("../services/fleetService");
const notificationService = require("../services/notificationService");

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
 * Drivers see only their own assignments (filtered by driverName/driverPhone)
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

    // Build where clause
    const whereConditions = [];

    // Add filter conditions
    if (status) whereConditions.push({ status });
    if (orderId) whereConditions.push({ orderId });
    if (truckId) whereConditions.push({ truckId });
    if (warehouseId) whereConditions.push({ warehouseId });

    // Driver-specific filtering: drivers see only their own assignments
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Filter by driver's username or phone number
      const driverConditions = [{ driverName: req.user.username }];
      if (req.user.phoneNumber) {
        driverConditions.push({ driverPhone: req.user.phoneNumber });
      }
      whereConditions.push({ [Op.or]: driverConditions });
    } else {
      // Apply RBAC scoping through orders for managers/admins
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, "Order");
      if (Object.keys(scopeWhere).length > 0) {
        const orders = await Order.findAll({
          where: scopeWhere,
          attributes: ["id"],
        });
        const orderIds = orders.map((o) => o.id);
        if (orderIds.length > 0) {
          whereConditions.push({ orderId: { [Op.in]: orderIds } });
        } else {
          // User has no access to any orders, return empty
          res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
          return res.json({
            assignments: [],
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          });
        }
      }
    }

    // Build final where clause
    const where = whereConditions.length > 0 
      ? (whereConditions.length === 1 ? whereConditions[0] : { [Op.and]: whereConditions })
      : {};

    const { count, rows } = await TruckAssignment.findAndCountAll({
      where,
      include: [
        { 
          model: Order, 
          as: "order", 
          attributes: ["id", "orderNumber", "status", "dealerId"],
          include: [{
            model: require("../models").Dealer,
            as: "dealer",
            attributes: ["id", "businessName", "address"],
          }],
        },
        { model: Truck, as: "truck", attributes: ["id", "truckName", "licenseNumber", "status"] },
        { model: Warehouse, as: "warehouse", attributes: ["id", "name", "warehouseCode", "address", "lat", "lng"] },
        { model: User, as: "assignedByUser", attributes: ["id", "username"] },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    // Disable caching for dynamic fleet queries to prevent stale data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      assignments: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ 
      error: "Failed to fetch assignments",
      details: error.message 
    });
  }
};

/**
 * Get assignment by ID
 * Drivers can only access their own assignments
 */
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [
        { 
          model: Order, 
          as: "order",
          include: [{
            model: require("../models").Dealer,
            as: "dealer",
            attributes: ["id", "businessName", "address"],
          }],
        },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
        { model: User, as: "assignedByUser", attributes: ["id", "username", "email"] },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Driver-specific access check
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Drivers can only see their own assignments
      if (assignment.driverName !== req.user.username && 
          assignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ error: "Access denied - This is not your assignment" });
      }
    } else {
      // Managers/admins check access through order
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    res.json(assignment);
  } catch (error) {
    console.error("Get assignment error:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

/**
 * Update assignment details (PUT /api/fleet/assignments/:id)
 * Allows updating: driverName, driverPhone, truckId, warehouseId, estimatedDeliveryAt, notes
 */
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      driverName,
      driverPhone,
      truckId,
      warehouseId,
      estimatedDeliveryAt,
      notes,
    } = req.body;

    const assignment = await TruckAssignment.findByPk(id, {
      include: [{ model: Order, as: "order" }],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Driver-specific access check
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Drivers can only update their own assignments
      if (assignment.driverName !== req.user.username && 
          assignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ error: "Access denied - This is not your assignment" });
      }
    } else {
      // Managers/admins check access through order
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check permission
      const canAssign = await RBACEngine.hasPermission(req.user, "fleet.assign");
      if (!canAssign) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Update allowed fields based on role
    if (userRole === 'driver') {
      // Drivers can only update notes (limited updates)
      if (notes !== undefined) assignment.notes = notes;
      // Drivers cannot change truck, warehouse, driver info, or estimated delivery
      if (driverName !== undefined || driverPhone !== undefined || 
          truckId !== undefined || warehouseId !== undefined || 
          estimatedDeliveryAt !== undefined) {
        return res.status(403).json({ 
          error: "Drivers can only update notes. Contact a manager to change other fields." 
        });
      }
    } else {
      // Managers/admins can update all fields
      if (driverName !== undefined) assignment.driverName = driverName;
      if (driverPhone !== undefined) assignment.driverPhone = driverPhone;
      if (estimatedDeliveryAt !== undefined) {
        assignment.estimatedDeliveryAt = estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null;
      }
      if (notes !== undefined) assignment.notes = notes;

      // Validate truck if changing
      if (truckId !== undefined && truckId !== assignment.truckId) {
        const truck = await Truck.findByPk(truckId);
        if (!truck) {
          return res.status(400).json({ error: "Truck not found" });
        }
        assignment.truckId = truckId;
      }

      // Validate warehouse if changing
      if (warehouseId !== undefined && warehouseId !== assignment.warehouseId) {
        const warehouse = await Warehouse.findByPk(warehouseId);
        if (!warehouse) {
          return res.status(400).json({ error: "Warehouse not found" });
        }
        assignment.warehouseId = warehouseId;
      }
    }

    await assignment.save();

    // Fetch full assignment details
    const updatedAssignment = await TruckAssignment.findByPk(assignment.id, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
        { model: User, as: "assignedByUser", attributes: ["id", "username", "email"] },
      ],
    });

    res.json(updatedAssignment);
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ error: "Failed to update assignment", details: error.message });
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

    // Driver-specific access check
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Drivers can only update status for their own assignments
      if (assignment.driverName !== req.user.username && 
          assignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ error: "Access denied - This is not your assignment" });
      }
    } else {
      // Managers/admins check access through order
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
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
 * Drivers can only mark pickup for their own assignments
 */
exports.markPickup = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [{ model: Order, as: "order" }],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Driver-specific access check
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Drivers can only mark pickup for their own assignments
      if (assignment.driverName !== req.user.username && 
          assignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ error: "Access denied - This is not your assignment" });
      }
    } else {
      // Managers/admins check access through order
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Validate status transition
    if (assignment.status !== 'assigned') {
      return res.status(400).json({ 
        error: `Invalid status transition. Current status: ${assignment.status}. Expected: assigned` 
      });
    }

    const updatedAssignment = await fleetService.markPickup(assignment.id);

    // Update order status
    await assignment.order.update({ status: 'In Transit' });

    // Fetch full details with dealer info for notifications
    const fullAssignment = await TruckAssignment.findByPk(updatedAssignment.id, {
      include: [
        { 
          model: Order, 
          as: "order",
          include: [{
            model: Dealer,
            as: "dealer",
            attributes: ["id", "businessName", "regionId", "areaId", "territoryId"],
          }],
        },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
    });

    // Notify superadmin and respective admins about pickup
    try {
      // Notify superadmin
      await notificationService.createRoleNotification({
        roleName: "super_admin",
        title: "Order Picked Up - Live Tracking Active",
        message: `Driver ${fullAssignment.driverName} (${fullAssignment.driverPhone || 'N/A'}) has picked up order ${fullAssignment.order.orderNumber} from ${fullAssignment.warehouse.name}. Live GPS tracking is now active.`,
        type: "fleet",
        priority: "high",
        relatedId: fullAssignment.orderId,
        relatedType: "order",
        actionUrl: `/orders/${fullAssignment.orderId}/tracking`,
      });

      // Notify regional/area/territory managers based on order's dealer hierarchy
      if (fullAssignment.order.dealer) {
        const dealer = fullAssignment.order.dealer;
        
        // Notify territory manager if territory exists
        if (dealer.territoryId) {
          await notificationService.createHierarchyBroadcast({
            hierarchyLevel: "territory",
            hierarchyId: dealer.territoryId,
            title: "Order Picked Up - Tracking Active",
            message: `Order ${fullAssignment.order.orderNumber} picked up by driver ${fullAssignment.driverName}. Live tracking available.`,
            type: "fleet",
            priority: "normal",
            relatedId: fullAssignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${fullAssignment.orderId}/tracking`,
            includeManagers: false, // Only notify users in this territory
          });
        }

        // Notify area manager if area exists
        if (dealer.areaId) {
          await notificationService.createRoleNotification({
            roleName: "area_manager",
            title: "Order Picked Up",
            message: `Order ${fullAssignment.order.orderNumber} picked up. Driver: ${fullAssignment.driverName} (${fullAssignment.driverPhone || 'N/A'}).`,
            type: "fleet",
            relatedId: fullAssignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${fullAssignment.orderId}/tracking`,
            scope: { areaId: dealer.areaId },
          });
        }

        // Notify regional manager if region exists
        if (dealer.regionId) {
          await notificationService.createRoleNotification({
            roleName: "regional_manager",
            title: "Order Picked Up - Live Tracking",
            message: `Order ${fullAssignment.order.orderNumber} picked up. Driver: ${fullAssignment.driverName} (${fullAssignment.driverPhone || 'N/A'}). Live GPS tracking active.`,
            type: "fleet",
            relatedId: fullAssignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${fullAssignment.orderId}/tracking`,
            scope: { regionId: dealer.regionId },
          });
        }
      }
    } catch (notifError) {
      console.error("Error sending pickup notifications:", notifError);
      // Don't fail the request if notifications fail
    }

    // Emit Socket.IO event
    if (global.io) {
      global.io.emit('order:tracking:started', {
        assignmentId: fullAssignment.id,
        orderId: fullAssignment.orderId,
        truckId: fullAssignment.truckId,
        driverPhone: fullAssignment.driverPhone,
        message: 'GPS tracking is now active',
      });
    }

    res.json({
      id: fullAssignment.id,
      status: fullAssignment.status,
      pickupAt: fullAssignment.pickupAt,
      order: {
        status: fullAssignment.order.status,
      },
      message: 'Pickup confirmed. GPS tracking is now active. Admins have been notified.',
    });
  } catch (error) {
    console.error("Mark pickup error:", error);
    res.status(500).json({ error: "Failed to mark pickup", details: error.message });
  }
};

/**
 * Mark delivered
 * Drivers can only mark delivery for their own assignments
 */
exports.markDelivered = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [{ model: Order, as: "order" }],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Driver-specific access check
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Drivers can only mark delivery for their own assignments
      if (assignment.driverName !== req.user.username && 
          assignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ error: "Access denied - This is not your assignment" });
      }
    } else {
      // Managers/admins check access through order
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Validate status transition
    if (!['picked_up', 'in_transit'].includes(assignment.status)) {
      return res.status(400).json({ 
        error: `Invalid status transition. Current status: ${assignment.status}. Expected: picked_up or in_transit` 
      });
    }

    const updatedAssignment = await fleetService.markDelivered(assignment.id);

    // Update order status
    await assignment.order.update({ status: 'Delivered' });

    // Fetch full details with dealer info for notifications
    const fullAssignment = await TruckAssignment.findByPk(updatedAssignment.id, {
      include: [
        { 
          model: Order, 
          as: "order",
          include: [{
            model: Dealer,
            as: "dealer",
            attributes: ["id", "businessName", "regionId", "areaId", "territoryId"],
          }],
        },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
    });

    // Notify superadmin and respective admins about delivery
    try {
      // Notify superadmin
      await notificationService.createRoleNotification({
        roleName: "super_admin",
        title: "Order Delivered",
        message: `Driver ${fullAssignment.driverName} (${fullAssignment.driverPhone || 'N/A'}) has successfully delivered order ${fullAssignment.order.orderNumber} to ${fullAssignment.order.dealer?.businessName || 'dealer'}. GPS tracking stopped.`,
        type: "fleet",
        priority: "high",
        relatedId: fullAssignment.orderId,
        relatedType: "order",
        actionUrl: `/orders/${fullAssignment.orderId}`,
      });

      // Notify regional/area/territory managers based on order's dealer hierarchy
      if (fullAssignment.order.dealer) {
        const dealer = fullAssignment.order.dealer;
        
        // Notify territory manager if territory exists
        if (dealer.territoryId) {
          await notificationService.createHierarchyBroadcast({
            hierarchyLevel: "territory",
            hierarchyId: dealer.territoryId,
            title: "Order Delivered",
            message: `Order ${fullAssignment.order.orderNumber} has been successfully delivered by driver ${fullAssignment.driverName}.`,
            type: "fleet",
            priority: "normal",
            relatedId: fullAssignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${fullAssignment.orderId}`,
            includeManagers: false,
          });
        }

        // Notify area manager if area exists
        if (dealer.areaId) {
          await notificationService.createRoleNotification({
            roleName: "area_manager",
            title: "Order Delivered",
            message: `Order ${fullAssignment.order.orderNumber} delivered successfully by driver ${fullAssignment.driverName} (${fullAssignment.driverPhone || 'N/A'}).`,
            type: "fleet",
            relatedId: fullAssignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${fullAssignment.orderId}`,
            scope: { areaId: dealer.areaId },
          });
        }

        // Notify regional manager if region exists
        if (dealer.regionId) {
          await notificationService.createRoleNotification({
            roleName: "regional_manager",
            title: "Order Delivered",
            message: `Order ${fullAssignment.order.orderNumber} delivered successfully. Driver: ${fullAssignment.driverName} (${fullAssignment.driverPhone || 'N/A'}).`,
            type: "fleet",
            relatedId: fullAssignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${fullAssignment.orderId}`,
            scope: { regionId: dealer.regionId },
          });
        }
      }
    } catch (notifError) {
      console.error("Error sending delivery notifications:", notifError);
      // Don't fail the request if notifications fail
    }

    res.json({
      id: fullAssignment.id,
      status: fullAssignment.status,
      deliveredAt: fullAssignment.deliveredAt,
      order: {
        status: fullAssignment.order.status,
      },
      message: 'Delivery confirmed. GPS tracking stopped. Admins have been notified.',
    });
  } catch (error) {
    console.error("Mark delivered error:", error);
    res.status(500).json({ error: "Failed to mark delivered", details: error.message });
  }
};

