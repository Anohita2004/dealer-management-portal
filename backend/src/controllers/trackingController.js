// src/controllers/trackingController.js
const { Truck, TruckAssignment, TruckLocationHistory, Order } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");
const locationService = require("../services/locationService");
const eventBus = require("../services/eventBus");

// Rate limiting map (truckId -> lastUpdateTime)
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 10000; // 10 seconds

/**
 * Update truck location (mobile app endpoint)
 */
exports.updateLocation = async (req, res) => {
  try {
    const { truckId, lat, lng, speed, heading, timestamp } = req.body;

    if (!truckId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: "Missing required fields: truckId, lat, lng",
      });
    }

    // Validate coordinates
    if (!locationService.validateCoordinates(lat, lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Rate limiting
    const now = Date.now();
    const lastUpdate = rateLimitMap.get(truckId);
    if (lastUpdate && now - lastUpdate < RATE_LIMIT_MS) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait before sending another update.",
      });
    }

    // Check if truck exists
    const truck = await Truck.findByPk(truckId);
    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }

    // Check if truck has an active assignment
    const activeAssignment = await TruckAssignment.findOne({
      where: {
        truckId: truck.id,
        status: { [Op.in]: ["assigned", "picked_up", "in_transit"] },
      },
    });

    if (!activeAssignment) {
      return res.status(400).json({
        error: "Truck does not have an active assignment",
      });
    }

    // Update truck location
    truck.currentLat = lat;
    truck.currentLng = lng;
    truck.lastLocationUpdate = timestamp ? new Date(timestamp) : new Date();
    await truck.save();

    // Save to history
    const historyEntry = await TruckLocationHistory.create({
      truckId: truck.id,
      truckAssignmentId: activeAssignment.id,
      lat,
      lng,
      speed: speed || null,
      heading: heading || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    // Update rate limit
    rateLimitMap.set(truckId, now);

    // Emit Socket.IO event
    if (global.io) {
      global.io.emit("truck:location:update", {
        truckId: truck.id,
        assignmentId: activeAssignment.id,
        orderId: activeAssignment.orderId,
        lat,
        lng,
        speed,
        heading,
        timestamp: historyEntry.timestamp,
      });

      // Emit to order-specific room
      global.io.to(`order:${activeAssignment.orderId}`).emit("order:tracking:update", {
        orderId: activeAssignment.orderId,
        assignment: {
          id: activeAssignment.id,
          status: activeAssignment.status,
        },
        currentLocation: {
          lat,
          lng,
          speed,
          heading,
          timestamp: historyEntry.timestamp,
        },
      });
    }

    res.json({
      success: true,
      truckId: truck.id,
      lat,
      lng,
      timestamp: historyEntry.timestamp,
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ error: "Failed to update location", details: error.message });
  }
};

/**
 * Get all active truck locations
 */
exports.getLiveLocations = async (req, res) => {
  try {
    // Check permission
    const canTrack = await RBACEngine.hasPermission(req.user, "fleet.track");
    if (!canTrack) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Get trucks with active assignments
    const activeAssignments = await TruckAssignment.findAll({
      where: {
        status: { [Op.in]: ["assigned", "picked_up", "in_transit"] },
      },
      include: [
        {
          model: Truck,
          as: "truck",
          attributes: ["id", "truckName", "licenseNumber", "currentLat", "currentLng", "lastLocationUpdate"],
        },
        {
          model: Order,
          as: "order",
          attributes: ["id", "orderNumber", "dealerId"],
        },
        {
          model: Warehouse,
          as: "warehouse",
          attributes: ["id", "name", "lat", "lng"],
        },
      ],
    });

    // Filter by user's scope
    const scopedLocations = [];
    for (const assignment of activeAssignments) {
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (canAccess) {
        scopedLocations.push({
          assignmentId: assignment.id,
          orderId: assignment.order.id,
          orderNumber: assignment.order.orderNumber,
          truck: {
            id: assignment.truck.id,
            truckName: assignment.truck.truckName,
            licenseNumber: assignment.truck.licenseNumber,
            lat: assignment.truck.currentLat,
            lng: assignment.truck.currentLng,
            lastUpdate: assignment.truck.lastLocationUpdate,
          },
          warehouse: assignment.warehouse,
          status: assignment.status,
          driverName: assignment.driverName,
        });
      }
    }

    res.json({ locations: scopedLocations });
  } catch (error) {
    console.error("Get live locations error:", error);
    res.status(500).json({ error: "Failed to get live locations" });
  }
};

/**
 * Get tracking info for order
 */
exports.getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: [
        {
          model: TruckAssignment,
          as: "truckAssignment",
          include: [
            {
              model: Truck,
              as: "truck",
              attributes: ["id", "truckName", "licenseNumber", "currentLat", "currentLng", "lastLocationUpdate"],
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
    const canAccess = await RBACEngine.canAccessResource(req.user, order);
    if (!canAccess) {
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
  } catch (error) {
    console.error("Get order tracking error:", error);
    res.status(500).json({ error: "Failed to get order tracking", details: error.message });
  }
};

/**
 * Get truck location history
 */
exports.getTruckHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const truck = await Truck.findByPk(req.params.truckId);

    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, truck);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const where = { truckId: truck.id };

    if (startDate) {
      where.timestamp = { [Op.gte]: new Date(startDate) };
    }

    if (endDate) {
      where.timestamp = {
        ...where.timestamp,
        [Op.lte]: new Date(endDate),
      };
    }

    const history = await TruckLocationHistory.findAll({
      where,
      limit: parseInt(limit),
      order: [["timestamp", "DESC"]],
    });

    res.json({ history });
  } catch (error) {
    console.error("Get truck history error:", error);
    res.status(500).json({ error: "Failed to get truck history" });
  }
};

