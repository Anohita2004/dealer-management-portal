// src/services/fleetService.js
const { Truck, TruckAssignment, Order, Warehouse, Dealer, sequelize } = require("../models");
const eventBus = require("./eventBus");
const notificationService = require("./notificationService");
const locationService = require("./locationService");

/**
 * Assign truck to order
 * @param {string} orderId - Order ID
 * @param {string} truckId - Truck ID
 * @param {string} warehouseId - Warehouse ID
 * @param {string} driverName - Driver name
 * @param {string} driverPhone - Driver phone (optional)
 * @param {Date} estimatedDeliveryAt - Estimated delivery time
 * @param {string} assignedBy - User ID who assigned
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Created assignment
 */
async function assignTruckToOrder(
  orderId,
  truckId,
  warehouseId,
  driverName,
  driverPhone = null,
  estimatedDeliveryAt = null,
  assignedBy,
  notes = null
) {
  const t = await sequelize.transaction();

  try {
    // Check if order already has an assignment
    const existingAssignment = await TruckAssignment.findOne({
      where: { orderId },
      transaction: t,
    });

    if (existingAssignment) {
      throw new Error("Order already has a truck assignment");
    }

    // Check if truck is available
    const truck = await Truck.findByPk(truckId, { transaction: t });
    if (!truck) {
      throw new Error("Truck not found");
    }

    if (truck.status !== "available") {
      throw new Error(`Truck is not available. Current status: ${truck.status}`);
    }

    // Check if order exists and is in valid state
    const order = await Order.findByPk(orderId, { transaction: t });
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "Cancelled" || order.status === "Rejected") {
      throw new Error("Cannot assign truck to cancelled or rejected order");
    }

    // Create assignment
    const assignment = await TruckAssignment.create(
      {
        orderId,
        truckId,
        warehouseId,
        driverName,
        driverPhone,
        assignedBy,
        estimatedDeliveryAt,
        notes,
        status: "assigned",
      },
      { transaction: t }
    );

    // Update truck status
    truck.status = "assigned";
    await truck.save({ transaction: t });

    // Link assignment to order (preserve order status - don't change to "Shipped" yet)
    // Status will change to "In Transit" when truck picks up, and "Delivered" when delivered
    order.truckAssignmentId = assignment.id;
    await order.save({ transaction: t });

    await t.commit();

    // Emit events and send notifications
    await eventBus.emit("truck:assigned", {
      assignmentId: assignment.id,
      orderId: order.id,
      truckId: truck.id,
      driverName,
    });

    await notifyAssignment(assignment, order);

    return assignment;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * Update order status based on assignment status
 * @param {string} orderId - Order ID
 * @param {Object} assignment - Truck assignment
 */
async function updateOrderStatusOnAssignment(orderId, assignment) {
  const order = await Order.findByPk(orderId);
  if (!order) {
    return;
  }

  switch (assignment.status) {
    case "picked_up":
      // Change status to "In Transit" when truck picks up (from "Approved" or "Shipped")
      if (order.status === "Approved" || order.status === "Shipped") {
        order.status = "In Transit";
        await order.save();
      }
      break;
    case "delivered":
      // Change status to "Delivered" when truck delivers (from "Approved", "Shipped", or "In Transit")
      if (order.status === "Approved" || order.status === "In Transit" || order.status === "Shipped") {
        order.status = "Delivered";
        await order.save();
      }
      break;
  }
}

/**
 * Send notifications for truck assignment
 * @param {Object} assignment - Truck assignment
 * @param {Object} order - Order
 */
async function notifyAssignment(assignment, order) {
  try {
    // Notify dealer about truck assignment
    await notificationService.createHierarchyBroadcast({
      hierarchyLevel: "dealer",
      hierarchyId: order.dealerId,
      title: "Truck Assigned to Order",
      message: `Truck ${assignment.truck?.truckName || "N/A"} has been assigned to order ${order.orderNumber}`,
      type: "order",
      actionUrl: `/orders/${order.id}`,
      includeManagers: true,
    });

    // Notify regional/area managers
    await notificationService.createRoleNotification({
      roleName: "regional_manager",
      title: "Truck Assignment",
      message: `Truck assigned to order ${order.orderNumber}`,
      type: "fleet",
      actionUrl: `/fleet/assignments/${assignment.id}`,
    });
  } catch (error) {
    console.error("Error sending assignment notifications:", error);
  }
}

/**
 * Mark pickup and update statuses
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<Object>} Updated assignment
 */
async function markPickup(assignmentId) {
  const t = await sequelize.transaction();

  try {
    const assignment = await TruckAssignment.findByPk(assignmentId, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
      transaction: t,
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Allow pickup from either 'assigned' or 'en_route_to_warehouse' status
    if (assignment.status !== "assigned" && assignment.status !== "en_route_to_warehouse") {
      throw new Error(`Cannot mark pickup. Current status: ${assignment.status}`);
    }

    assignment.status = "picked_up";
    assignment.pickupAt = new Date();
    if (!assignment.warehouseArrivedAt) {
      assignment.warehouseArrivedAt = new Date();
    }
    await assignment.save({ transaction: t });

    // Update truck status
    const truck = await Truck.findByPk(assignment.truckId, { transaction: t });
    if (truck) {
      truck.status = "in_transit";
      await truck.save({ transaction: t });
    }

    // Update order status
    if (assignment.order) {
      assignment.order.status = "In Transit";
      await assignment.order.save({ transaction: t });
    }

    await t.commit();

    // Notify superadmin and managers about pickup
    await notificationService.createRoleNotification({
      roleName: "super_admin",
      title: "Truck Picked Up Order - GPS Tracking Active",
      message: `Truck ${assignment.truck?.truckName || "N/A"} (${assignment.truck?.licenseNumber || "N/A"}) picked up order ${assignment.order?.orderNumber || "N/A"} from ${assignment.warehouse?.name || "warehouse"}. Live GPS location tracking is now active via mobile device.`,
      type: "fleet",
      actionUrl: `/fleet/assignments/${assignment.id}`,
      priority: "high",
    });

    // Notify regional/area managers
    await notificationService.createRoleNotification({
      roleName: "regional_manager",
      title: "Truck Picked Up - Tracking Active",
      message: `Order ${assignment.order?.orderNumber || "N/A"} picked up. Live tracking available.`,
      type: "fleet",
      actionUrl: `/orders/${assignment.orderId}/tracking`,
    });

    // Emit events
    await eventBus.emit("truck:status:change", {
      truckId: assignment.truckId,
      assignmentId: assignment.id,
      status: "picked_up",
      orderId: assignment.orderId,
      message: "Location tracking is now active. Mobile app should start sending GPS updates.",
    });

    // Emit Socket.IO event for real-time updates
    if (global.io) {
      global.io.emit("truck:status:change", {
        truckId: assignment.truckId,
        assignmentId: assignment.id,
        status: "picked_up",
        orderId: assignment.orderId,
        trackingActive: true,
        message: "Location tracking started",
      });

      // Notify users tracking this order
      global.io.to(`order:${assignment.orderId}`).emit("order:tracking:started", {
        orderId: assignment.orderId,
        assignmentId: assignment.id,
        truckId: assignment.truckId,
        message: "Driver has picked up the order. Location tracking is now active via mobile GPS.",
        trackingActive: true,
      });
    }

    return assignment;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * Mark delivery and update statuses
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<Object>} Updated assignment
 */
async function markDelivered(assignmentId) {
  const t = await sequelize.transaction();

  try {
    const assignment = await TruckAssignment.findByPk(assignmentId, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
      transaction: t,
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.status === "delivered") {
      throw new Error("Assignment already marked as delivered");
    }

    assignment.status = "delivered";
    assignment.deliveredAt = new Date();
    await assignment.save({ transaction: t });

    // Update truck status
    const truck = await Truck.findByPk(assignment.truckId, { transaction: t });
    if (truck) {
      truck.status = "available";
      await truck.save({ transaction: t });
    }

    // Update order status
    if (assignment.order) {
      assignment.order.status = "Delivered";
      await assignment.order.save({ transaction: t });
    }

    await t.commit();

    // Emit events
    await eventBus.emit("truck:status:change", {
      truckId: assignment.truckId,
      assignmentId: assignment.id,
      status: "delivered",
      orderId: assignment.orderId,
    });

    // Emit Socket.IO event for real-time updates
    if (global.io) {
      global.io.emit("truck:status:change", {
        truckId: assignment.truckId,
        assignmentId: assignment.id,
        status: "delivered",
        orderId: assignment.orderId,
      });

      // Notify users tracking this order
      global.io.to(`order:${assignment.orderId}`).emit("order:tracking:update", {
        orderId: assignment.orderId,
        assignment: {
          id: assignment.id,
          status: assignment.status,
        },
        message: "Delivery completed. GPS tracking stopped.",
      });
    }

    return assignment;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * Start GPS tracking from driver's current location
 * @param {string} assignmentId - Assignment ID
 * @param {number} startLat - Driver's start latitude
 * @param {number} startLng - Driver's start longitude
 * @returns {Promise<Object>} Updated assignment
 */
async function startTracking(assignmentId, startLat, startLng) {
  const t = await sequelize.transaction();

  try {
    const assignment = await TruckAssignment.findByPk(assignmentId, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
      transaction: t,
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.status !== "assigned") {
      throw new Error(`Cannot start tracking. Current status: ${assignment.status}`);
    }

    // Validate coordinates
    if (!locationService.validateCoordinates(startLat, startLng)) {
      throw new Error("Invalid start coordinates");
    }

    // Update assignment with start location and status
    assignment.startLocationLat = startLat;
    assignment.startLocationLng = startLng;
    assignment.startTrackingAt = new Date();
    assignment.status = "en_route_to_warehouse";
    await assignment.save({ transaction: t });

    await t.commit();

    // Emit Socket.IO event
    if (global.io) {
      global.io.emit("truck:tracking:started", {
        assignmentId: assignment.id,
        orderId: assignment.orderId,
        truckId: assignment.truckId,
        driverPhone: assignment.driverPhone,
        driverName: assignment.driverName,
        startLocation: {
          lat: startLat,
          lng: startLng,
        },
        warehouse: assignment.warehouse ? {
          id: assignment.warehouse.id,
          name: assignment.warehouse.name,
          lat: assignment.warehouse.lat,
          lng: assignment.warehouse.lng,
        } : null,
        message: "GPS tracking started from driver's location",
      });

      // Notify users tracking this order
      global.io.to(`order:${assignment.orderId}`).emit("order:tracking:started", {
        orderId: assignment.orderId,
        assignmentId: assignment.id,
        truckId: assignment.truckId,
        driverPhone: assignment.driverPhone,
        startLocation: { lat: startLat, lng: startLng },
        message: "Driver has started GPS tracking. Truck is en route to warehouse.",
      });
    }

    return assignment;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

/**
 * Detect warehouse arrival using geofencing
 * @param {string} assignmentId - Assignment ID
 * @param {number} truckLat - Current truck latitude
 * @param {number} truckLng - Current truck longitude
 * @returns {Promise<Object|null>} Updated assignment if arrival detected, null otherwise
 */
async function detectWarehouseArrival(assignmentId, truckLat, truckLng) {
  try {
    const assignment = await TruckAssignment.findByPk(assignmentId, {
      include: [
        { model: Order, as: "order", include: [{ model: Dealer, as: "dealer" }] },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Only check if status is en_route_to_warehouse
    if (assignment.status !== "en_route_to_warehouse") {
      return null;
    }

    // Check if already arrived (prevent duplicate triggers)
    if (assignment.warehouseArrivedAt) {
      return null;
    }

    // Check geofencing (100m radius)
    const isNear = await locationService.isNearWarehouse(
      truckLat,
      truckLng,
      assignment.warehouse,
      100
    );

    if (!isNear) {
      return null;
    }

    // Truck has arrived at warehouse - automatically mark pickup
    const t = await sequelize.transaction();
    try {
      assignment.status = "picked_up";
      assignment.pickupAt = new Date();
      assignment.warehouseArrivedAt = new Date();
      await assignment.save({ transaction: t });

      // Update truck status
      const truck = await Truck.findByPk(assignment.truckId, { transaction: t });
      if (truck) {
        truck.status = "in_transit";
        await truck.save({ transaction: t });
      }

      // Update order status
      if (assignment.order) {
        assignment.order.status = "In Transit";
        await assignment.order.save({ transaction: t });
      }

      await t.commit();

      // Notify superadmin and managers about pickup
      await notificationService.createRoleNotification({
        roleName: "super_admin",
        title: "Order Picked Up from Warehouse - GPS Tracking Active",
        message: `Driver ${assignment.driverName} (${assignment.driverPhone || 'N/A'}) reached warehouse ${assignment.warehouse?.name || 'N/A'} and picked up order ${assignment.order?.orderNumber || 'N/A'}. Live GPS location tracking is now active.`,
        type: "fleet",
        actionUrl: `/fleet/assignments/${assignment.id}`,
        priority: "high",
        relatedId: assignment.orderId,
        relatedType: "order",
      });

      // Notify regional/area/territory managers based on order's dealer hierarchy
      if (assignment.order?.dealer) {
        const dealer = assignment.order.dealer;
        
        if (dealer.territoryId) {
          await notificationService.createHierarchyBroadcast({
            hierarchyLevel: "territory",
            hierarchyId: dealer.territoryId,
            title: "Order Picked Up - Tracking Active",
            message: `Order ${assignment.order.orderNumber} picked up from warehouse. Driver: ${assignment.driverName}. Live tracking available.`,
            type: "fleet",
            priority: "normal",
            relatedId: assignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${assignment.orderId}/tracking`,
            includeManagers: false,
          });
        }

        if (dealer.areaId) {
          await notificationService.createRoleNotification({
            roleName: "area_manager",
            title: "Order Picked Up",
            message: `Order ${assignment.order.orderNumber} picked up. Driver: ${assignment.driverName} (${assignment.driverPhone || 'N/A'}).`,
            type: "fleet",
            relatedId: assignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${assignment.orderId}/tracking`,
            scope: { areaId: dealer.areaId },
          });
        }

        if (dealer.regionId) {
          await notificationService.createRoleNotification({
            roleName: "regional_manager",
            title: "Order Picked Up - Live Tracking",
            message: `Order ${assignment.order.orderNumber} picked up. Driver: ${assignment.driverName} (${assignment.driverPhone || 'N/A'}). Live GPS tracking active.`,
            type: "fleet",
            relatedId: assignment.orderId,
            relatedType: "order",
            actionUrl: `/orders/${assignment.orderId}/tracking`,
            scope: { regionId: dealer.regionId },
          });
        }
      }

      // Emit Socket.IO events
      if (global.io) {
        global.io.emit("truck:warehouse:arrived", {
          assignmentId: assignment.id,
          orderId: assignment.orderId,
          truckId: assignment.truckId,
          driverPhone: assignment.driverPhone,
          driverName: assignment.driverName,
          warehouse: assignment.warehouse ? {
            id: assignment.warehouse.id,
            name: assignment.warehouse.name,
          } : null,
          message: "Truck arrived at warehouse. Order picked up automatically via geofencing.",
        });

        global.io.to(`order:${assignment.orderId}`).emit("order:tracking:update", {
          orderId: assignment.orderId,
          assignment: {
            id: assignment.id,
            status: assignment.status,
            driverPhone: assignment.driverPhone,
            driverName: assignment.driverName,
          },
          message: "Order picked up from warehouse. Truck is now en route to dealer.",
          warehouseArrived: true,
        });
      }

      // Emit event bus event
      await eventBus.emit("truck:warehouse:arrived", {
        assignmentId: assignment.id,
        orderId: assignment.orderId,
        truckId: assignment.truckId,
        warehouseId: assignment.warehouseId,
        driverName: assignment.driverName,
      });

      return assignment;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error("Error detecting warehouse arrival:", error);
    throw error;
  }
}

module.exports = {
  assignTruckToOrder,
  updateOrderStatusOnAssignment,
  notifyAssignment,
  markPickup,
  markDelivered,
  startTracking,
  detectWarehouseArrival,
};

