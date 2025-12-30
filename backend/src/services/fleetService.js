// src/services/fleetService.js
const { Truck, TruckAssignment, Order, sequelize } = require("../models");
const eventBus = require("./eventBus");
const notificationService = require("./notificationService");

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

    // Update order status to "Shipped" and link assignment
    order.status = "Shipped";
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
      if (order.status === "Shipped") {
        order.status = "In Transit";
        await order.save();
      }
      break;
    case "delivered":
      if (order.status === "In Transit" || order.status === "Shipped") {
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
      include: [{ model: Order, as: "order" }],
      transaction: t,
    });

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.status !== "assigned") {
      throw new Error(`Cannot mark pickup. Current status: ${assignment.status}`);
    }

    assignment.status = "picked_up";
    assignment.pickupAt = new Date();
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

    // Emit events
    await eventBus.emit("truck:status:change", {
      truckId: assignment.truckId,
      assignmentId: assignment.id,
      status: "picked_up",
      orderId: assignment.orderId,
    });

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
      include: [{ model: Order, as: "order" }],
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

    return assignment;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  assignTruckToOrder,
  updateOrderStatusOnAssignment,
  notifyAssignment,
  markPickup,
  markDelivered,
};

