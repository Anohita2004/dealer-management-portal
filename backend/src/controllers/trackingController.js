// src/controllers/trackingController.js
const { Truck, TruckAssignment, TruckLocationHistory, Order, Warehouse, Dealer } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");
const locationService = require("../services/locationService");
const eventBus = require("../services/eventBus");
const fleetService = require("../services/fleetService");
const etaService = require("../services/etaService");

// Rate limiting map (truckId -> lastUpdateTime)
const rateLimitMap = new Map();
// Configurable via env; fallback to 1000ms (1 second) so tracking stays smooth
const RATE_LIMIT_MS = parseInt(process.env.TRACKING_RATE_LIMIT_MS || "1000", 10);

// ETA update tracking (assignmentId -> lastETAUpdate)
const etaUpdateMap = new Map();
const ETA_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Start GPS tracking from driver's current location
 * Drivers can only start tracking for their own assignments
 */
exports.startTracking = async (req, res) => {
  try {
    const { assignmentId, lat, lng } = req.body;

    if (!assignmentId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: "Missing required fields: assignmentId, lat, lng",
      });
    }

    // Validate coordinates
    if (!locationService.validateCoordinates(lat, lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Get assignment
    const assignment = await TruckAssignment.findByPk(assignmentId, {
      include: [
        { model: Order, as: "order" },
        { model: Truck, as: "truck" },
        { model: Warehouse, as: "warehouse" },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Driver-specific access check
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      if (assignment.driverName !== req.user.username && 
          assignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ 
          error: "Not authorized to start tracking for this assignment" 
        });
      }
    } else {
      // Managers/admins check access through order
      const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    // Start tracking
    const updatedAssignment = await fleetService.startTracking(assignmentId, lat, lng);

    res.json({
      success: true,
      assignmentId: updatedAssignment.id,
      status: updatedAssignment.status,
      startLocation: {
        lat: updatedAssignment.startLocationLat,
        lng: updatedAssignment.startLocationLng,
      },
      startTrackingAt: updatedAssignment.startTrackingAt,
      message: "GPS tracking started from driver's location",
    });
  } catch (error) {
    console.error("Start tracking error:", error);
    res.status(500).json({ 
      error: "Failed to start tracking", 
      details: error.message 
    });
  }
};

/**
 * Update truck location (mobile app endpoint)
 * Drivers can only update location for trucks assigned to them
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
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: "Invalid coordinates" });
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
        status: { [Op.in]: ["assigned", "en_route_to_warehouse", "picked_up", "in_transit"] },
      },
      include: [
        {
          model: Warehouse,
          as: "warehouse",
          attributes: ["id", "name", "lat", "lng"],
        },
        {
          model: Order,
          as: "order",
          include: [
            {
              model: Dealer,
              as: "dealer",
              attributes: ["id", "businessName", "lat", "lng"],
            },
          ],
        },
      ],
    });

    if (!activeAssignment) {
      return res.status(400).json({
        error: "Truck does not have an active assignment",
      });
    }

    // Driver-specific access check: verify driver owns this truck assignment
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'driver') {
      // Drivers can only update location for their own assignments
      if (activeAssignment.driverName !== req.user.username && 
          activeAssignment.driverPhone !== req.user.phoneNumber) {
        return res.status(403).json({ 
          error: "Not authorized to update this truck location" 
        });
      }
    }

    // Rate limiting
    const now = Date.now();
    const lastUpdate = rateLimitMap.get(truckId);
    if (lastUpdate && now - lastUpdate < RATE_LIMIT_MS) {
      // Don't treat this as an error for the client; just avoid spamming DB
      // and return the last known location so tracking UI can continue smoothly.
      return res.json({
        success: true,
        rateLimited: true,
        truckId: truck.id,
        assignmentId: activeAssignment.id,
        driverPhone: activeAssignment.driverPhone,
        driverName: activeAssignment.driverName,
        lat: truck.currentLat,
        lng: truck.currentLng,
        timestamp: truck.lastLocationUpdate,
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

    // Geofencing: Check if truck has arrived at warehouse
    let warehouseArrived = false;
    if (activeAssignment.status === "en_route_to_warehouse" && activeAssignment.warehouse) {
      try {
        const arrivalResult = await fleetService.detectWarehouseArrival(
          activeAssignment.id,
          lat,
          lng
        );
        if (arrivalResult) {
          warehouseArrived = true;
          // Reload assignment to get updated status
          await activeAssignment.reload();
        }
      } catch (error) {
        console.error("Error detecting warehouse arrival:", error);
      }
    }

    // Calculate ETA if needed (update every 5 minutes or when location changes significantly)
    let etaResult = null;
    const lastETAUpdate = etaUpdateMap.get(activeAssignment.id);
    const shouldUpdateETA = !lastETAUpdate || (now - lastETAUpdate > ETA_UPDATE_INTERVAL);
    
    if (shouldUpdateETA && (activeAssignment.status === "picked_up" || activeAssignment.status === "in_transit")) {
      try {
        etaResult = await etaService.updateETAForAssignment(activeAssignment.id);
        etaUpdateMap.set(activeAssignment.id, now);
        
        // Emit ETA update event
        if (global.io) {
          global.io.emit("truck:eta:updated", {
            assignmentId: activeAssignment.id,
            orderId: activeAssignment.orderId,
            eta: etaResult.eta,
            durationText: etaResult.durationText,
            distanceText: etaResult.distanceText,
          });
        }
      } catch (error) {
        console.error("Error updating ETA:", error);
      }
    }

    // Check warehouse proximity for approaching notification
    let warehouseProximity = null;
    if (activeAssignment.warehouse && activeAssignment.status === "en_route_to_warehouse") {
      const distanceMeters = locationService.getDistanceMeters(
        lat,
        lng,
        activeAssignment.warehouse.lat,
        activeAssignment.warehouse.lng
      );
      warehouseProximity = {
        distanceMeters: Math.round(distanceMeters),
        isApproaching: distanceMeters <= 200, // Within 200m
      };

      if (warehouseProximity.isApproaching && !warehouseArrived) {
        if (global.io) {
          global.io.emit("truck:warehouse:approaching", {
            assignmentId: activeAssignment.id,
            orderId: activeAssignment.orderId,
            distanceMeters: Math.round(distanceMeters),
            warehouse: {
              id: activeAssignment.warehouse.id,
              name: activeAssignment.warehouse.name,
            },
          });
        }
      }
    }

    // Emit Socket.IO event with driver phone number for map tracking
    if (global.io) {
      global.io.emit("truck:location:update", {
        truckId: truck.id,
        assignmentId: activeAssignment.id,
        orderId: activeAssignment.orderId,
        driverPhone: activeAssignment.driverPhone,
        driverName: activeAssignment.driverName,
        lat,
        lng,
        speed,
        heading,
        timestamp: historyEntry.timestamp,
        status: activeAssignment.status,
        eta: etaResult ? {
          timestamp: etaResult.eta,
          durationText: etaResult.durationText,
          distanceText: etaResult.distanceText,
        } : null,
        warehouseProximity,
        warehouseArrived,
      });

      // Emit to order-specific room
      global.io.to(`order:${activeAssignment.orderId}`).emit("order:tracking:update", {
        orderId: activeAssignment.orderId,
        assignment: {
          id: activeAssignment.id,
          status: activeAssignment.status,
          driverPhone: activeAssignment.driverPhone,
          driverName: activeAssignment.driverName,
        },
        currentLocation: {
          lat,
          lng,
          speed,
          heading,
          timestamp: historyEntry.timestamp,
        },
        warehouse: activeAssignment.warehouse ? {
          id: activeAssignment.warehouse.id,
          name: activeAssignment.warehouse.name,
          lat: activeAssignment.warehouse.lat,
          lng: activeAssignment.warehouse.lng,
        } : null,
        dealer: (activeAssignment.status === "picked_up" || activeAssignment.status === "in_transit") && activeAssignment.order?.dealer ? {
          id: activeAssignment.order.dealer.id,
          businessName: activeAssignment.order.dealer.businessName,
          lat: activeAssignment.order.dealer.lat,
          lng: activeAssignment.order.dealer.lng,
        } : null,
        eta: etaResult ? {
          timestamp: etaResult.eta,
          durationText: etaResult.durationText,
          distanceText: etaResult.distanceText,
        } : null,
        warehouseArrived,
      });
    }

    res.json({
      success: true,
      truckId: truck.id,
      assignmentId: activeAssignment.id,
      driverPhone: activeAssignment.driverPhone,
      driverName: activeAssignment.driverName,
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
 * Drivers see only their own truck locations
 */
exports.getLiveLocations = async (req, res) => {
  try {
    const userRole = req.user.roleDetails?.name || req.user.role;
    
    // Drivers don't need fleet.track permission, they see their own trucks
    if (userRole !== 'driver') {
      const canTrack = await RBACEngine.hasPermission(req.user, "fleet.track");
      if (!canTrack) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Build where clause
    const where = {
      status: { [Op.in]: ["assigned", "en_route_to_warehouse", "picked_up", "in_transit"] },
    };

    // Driver-specific filtering: filter by driver's phone number or username
    if (userRole === 'driver') {
      const driverConditions = [{ driverName: req.user.username }];
      if (req.user.phoneNumber) {
        driverConditions.push({ driverPhone: req.user.phoneNumber });
      }
      where[Op.or] = driverConditions;
    }

    // Get trucks with active assignments
    const activeAssignments = await TruckAssignment.findAll({
      where,
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
          include: [
            {
              model: Dealer,
              as: "dealer",
              attributes: ["id", "businessName", "lat", "lng", "address", "city"],
            },
          ],
        },
        {
          model: Warehouse,
          as: "warehouse",
          attributes: ["id", "name", "lat", "lng", "address", "city"],
        },
      ],
    });

    // Filter by user's scope (for managers/admins)
    const scopedLocations = [];
    for (const assignment of activeAssignments) {
      // Include dealer location if status is picked_up or in_transit
      const includeDealer = assignment.status === "picked_up" || assignment.status === "in_transit";
      
      if (userRole === 'driver') {
        // Drivers see all their assignments (already filtered)
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
          warehouse: assignment.warehouse ? {
            id: assignment.warehouse.id,
            name: assignment.warehouse.name,
            lat: assignment.warehouse.lat,
            lng: assignment.warehouse.lng,
            address: assignment.warehouse.address,
            city: assignment.warehouse.city,
          } : null,
          dealer: includeDealer && assignment.order?.dealer ? {
            id: assignment.order.dealer.id,
            businessName: assignment.order.dealer.businessName,
            lat: assignment.order.dealer.lat,
            lng: assignment.order.dealer.lng,
            address: assignment.order.dealer.address,
            city: assignment.order.dealer.city,
          } : null,
          startLocation: assignment.startLocationLat && assignment.startLocationLng ? {
            lat: assignment.startLocationLat,
            lng: assignment.startLocationLng,
          } : null,
          status: assignment.status,
          driverName: assignment.driverName,
          driverPhone: assignment.driverPhone,
          currentEta: assignment.currentEta,
        });
      } else {
        // Managers/admins check access through order
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
            warehouse: assignment.warehouse ? {
              id: assignment.warehouse.id,
              name: assignment.warehouse.name,
              lat: assignment.warehouse.lat,
              lng: assignment.warehouse.lng,
              address: assignment.warehouse.address,
              city: assignment.warehouse.city,
            } : null,
            dealer: includeDealer && assignment.order?.dealer ? {
              id: assignment.order.dealer.id,
              businessName: assignment.order.dealer.businessName,
              lat: assignment.order.dealer.lat,
              lng: assignment.order.dealer.lng,
              address: assignment.order.dealer.address,
              city: assignment.order.dealer.city,
            } : null,
            startLocation: assignment.startLocationLat && assignment.startLocationLng ? {
              lat: assignment.startLocationLat,
              lng: assignment.startLocationLng,
            } : null,
            status: assignment.status,
            driverName: assignment.driverName,
            driverPhone: assignment.driverPhone,
            currentEta: assignment.currentEta,
          });
        }
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
        {
          model: Dealer,
          as: "dealer",
          attributes: ["id", "businessName", "lat", "lng", "address", "city"],
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

    // Get route polyline if available (for map display)
    let routePolyline = null;
    if (order.truckAssignment.truck?.currentLat && order.truckAssignment.truck?.currentLng) {
      try {
        if (order.truckAssignment.status === "picked_up" || order.truckAssignment.status === "in_transit") {
          // Route to dealer
          if (order.dealer?.lat && order.dealer?.lng) {
            routePolyline = await etaService.getRoutePolyline(
              order.truckAssignment.truck.currentLat,
              order.truckAssignment.truck.currentLng,
              order.dealer.lat,
              order.dealer.lng
            );
          }
        } else if (order.truckAssignment.status === "en_route_to_warehouse") {
          // Route to warehouse
          if (order.truckAssignment.warehouse?.lat && order.truckAssignment.warehouse?.lng) {
            routePolyline = await etaService.getRoutePolyline(
              order.truckAssignment.truck.currentLat,
              order.truckAssignment.truck.currentLng,
              order.truckAssignment.warehouse.lat,
              order.truckAssignment.warehouse.lng
            );
          }
        }
      } catch (error) {
        console.error("Error getting route polyline:", error);
      }
    }

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
        startTrackingAt: order.truckAssignment.startTrackingAt,
        startLocation: order.truckAssignment.startLocationLat && order.truckAssignment.startLocationLng ? {
          lat: order.truckAssignment.startLocationLat,
          lng: order.truckAssignment.startLocationLng,
        } : null,
        warehouseArrivedAt: order.truckAssignment.warehouseArrivedAt,
        pickupAt: order.truckAssignment.pickupAt,
        deliveredAt: order.truckAssignment.deliveredAt,
        estimatedDeliveryAt: order.truckAssignment.estimatedDeliveryAt,
        currentEta: order.truckAssignment.currentEta,
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
      warehouse: order.truckAssignment.warehouse ? {
        id: order.truckAssignment.warehouse.id,
        name: order.truckAssignment.warehouse.name,
        lat: order.truckAssignment.warehouse.lat,
        lng: order.truckAssignment.warehouse.lng,
        address: order.truckAssignment.warehouse.address,
        city: order.truckAssignment.warehouse.city,
      } : null,
      dealer: (order.truckAssignment.status === "picked_up" || order.truckAssignment.status === "in_transit") && order.dealer ? {
        id: order.dealer.id,
        businessName: order.dealer.businessName,
        lat: order.dealer.lat,
        lng: order.dealer.lng,
        address: order.dealer.address,
        city: order.dealer.city,
      } : null,
      routePolyline,
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
 * Get current ETA for assignment
 */
exports.getAssignmentETA = async (req, res) => {
  try {
    const assignment = await TruckAssignment.findByPk(req.params.id, {
      include: [
        { model: Order, as: "order" },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, assignment.order);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update ETA
    const etaResult = await etaService.updateETAForAssignment(assignment.id);

    res.json({
      assignmentId: assignment.id,
      orderId: assignment.orderId,
      eta: etaResult.eta,
      durationSeconds: etaResult.durationSeconds,
      durationText: etaResult.durationText,
      distanceMeters: etaResult.distanceMeters,
      distanceText: etaResult.distanceText,
      provider: etaResult.provider,
    });
  } catch (error) {
    console.error("Get assignment ETA error:", error);
    res.status(500).json({ error: "Failed to get ETA", details: error.message });
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

