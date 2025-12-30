// src/controllers/truckController.js
const { Truck, Region, TruckAssignment, TruckLocationHistory } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");

/**
 * Get all trucks (scoped)
 */
exports.getTrucks = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, regionId, isActive } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { truckName: { [Op.like]: `%${search}%` } },
        { licenseNumber: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) where.status = status;
    if (regionId) where.regionId = regionId;
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Apply RBAC scoping
    if (req.scope?.truck) {
      Object.assign(where, req.scope.truck);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, "Truck");
      Object.assign(where, scopeWhere);
    }

    const { count, rows } = await Truck.findAndCountAll({
      where,
      include: [
        { model: Region, as: "region", attributes: ["id", "name"] },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      trucks: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get trucks error:", error);
    res.status(500).json({ error: "Failed to fetch trucks" });
  }
};

/**
 * Get truck by ID
 */
exports.getTruck = async (req, res) => {
  try {
    const truck = await Truck.findByPk(req.params.id, {
      include: [
        { model: Region, as: "region" },
        {
          model: TruckAssignment,
          as: "assignments",
          limit: 5,
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, truck);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(truck);
  } catch (error) {
    console.error("Get truck error:", error);
    res.status(500).json({ error: "Failed to fetch truck" });
  }
};

/**
 * Create truck
 */
exports.createTruck = async (req, res) => {
  try {
    const {
      truckName,
      licenseNumber,
      truckType,
      capacity,
      regionId,
    } = req.body;

    // Check if license number already exists
    const existing = await Truck.findOne({
      where: { licenseNumber },
    });

    if (existing) {
      return res.status(400).json({ error: "License number already exists" });
    }

    const truck = await Truck.create({
      truckName,
      licenseNumber,
      truckType: truckType || "medium",
      capacity,
      regionId,
      status: "available",
      isActive: true,
    });

    res.status(201).json(truck);
  } catch (error) {
    console.error("Create truck error:", error);
    res.status(500).json({ error: "Failed to create truck", details: error.message });
  }
};

/**
 * Update truck
 */
exports.updateTruck = async (req, res) => {
  try {
    const truck = await Truck.findByPk(req.params.id);

    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, truck);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    await truck.update(req.body);

    res.json(truck);
  } catch (error) {
    console.error("Update truck error:", error);
    res.status(500).json({ error: "Failed to update truck", details: error.message });
  }
};

/**
 * Delete truck (soft delete)
 */
exports.deleteTruck = async (req, res) => {
  try {
    const truck = await Truck.findByPk(req.params.id);

    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, truck);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if truck has active assignments
    const activeAssignment = await TruckAssignment.findOne({
      where: {
        truckId: truck.id,
        status: { [Op.in]: ["assigned", "picked_up", "in_transit"] },
      },
    });

    if (activeAssignment) {
      return res.status(400).json({ error: "Cannot delete truck with active assignments" });
    }

    // Soft delete
    await truck.update({ isActive: false, status: "inactive" });

    res.json({ message: "Truck deactivated successfully" });
  } catch (error) {
    console.error("Delete truck error:", error);
    res.status(500).json({ error: "Failed to delete truck" });
  }
};

/**
 * Get truck current location
 */
exports.getTruckLocation = async (req, res) => {
  try {
    const truck = await Truck.findByPk(req.params.id, {
      attributes: ["id", "truckName", "licenseNumber", "currentLat", "currentLng", "lastLocationUpdate"],
    });

    if (!truck) {
      return res.status(404).json({ error: "Truck not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, truck);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      truckId: truck.id,
      truckName: truck.truckName,
      licenseNumber: truck.licenseNumber,
      lat: truck.currentLat,
      lng: truck.currentLng,
      lastUpdate: truck.lastLocationUpdate,
    });
  } catch (error) {
    console.error("Get truck location error:", error);
    res.status(500).json({ error: "Failed to get truck location" });
  }
};

/**
 * Get truck location history
 */
exports.getTruckHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    const truck = await Truck.findByPk(req.params.id);

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

