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
        // truckName column doesn't exist in DB yet - using licenseNumber only
        { licenseNumber: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) where.status = status;
    // regionId filter removed temporarily - column doesn't exist in database yet
    // TODO: Uncomment when migration adds regionId column to trucks table
    // if (regionId) where.regionId = regionId;
    // isActive filter removed temporarily - column doesn't exist in database yet
    // TODO: Uncomment when migration adds isActive column to trucks table
    // if (isActive !== undefined) {
    //   where.isActive = isActive === "true";
    // }

    // Apply RBAC scoping
    if (req.scope?.truck) {
      Object.assign(where, req.scope.truck);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, "Truck");
      Object.assign(where, scopeWhere);
    }

    // Note: Region include removed temporarily - regionId column doesn't exist in database yet
    // TODO: Add back when migration adds regionId column to trucks table
    // const includes = [{ model: Region, as: "region", attributes: ["id", "name"], required: false }];

    const { count, rows } = await Truck.findAndCountAll({
      where,
      include: [], // Region include removed - column doesn't exist
      attributes: ["id", "licenseNumber", "truckType", "capacity", "status", "currentLat", "currentLng", "lastLocationUpdate", "createdAt", "updatedAt"], // Explicitly list only columns that exist (truckName, regionId, and isActive removed)
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
      attributes: ["id", "licenseNumber", "truckType", "capacity", "status", "currentLat", "currentLng", "lastLocationUpdate", "createdAt", "updatedAt"], // Explicit attributes - truckName, regionId, and isActive removed
      include: [
        // Region include removed temporarily - regionId column doesn't exist in database yet
        // TODO: Add back when migration adds regionId column to trucks table
        // { model: Region, as: "region", required: false },
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
      truckName, // Not used - column doesn't exist in DB yet
      licenseNumber,
      truckType,
      capacity,
      regionId, // Not used - column doesn't exist in DB yet
    } = req.body;

    // Check if license number already exists
    const existing = await Truck.findOne({
      where: { licenseNumber },
      attributes: ["id", "licenseNumber"], // Only need to check existence
    });

    if (existing) {
      return res.status(400).json({ error: "License number already exists" });
    }

    const truck = await Truck.create({
      // truckName removed - column doesn't exist in database yet
      licenseNumber,
      truckType: truckType || "medium",
      capacity,
      // regionId removed - column doesn't exist in database yet
      status: "available",
      // isActive removed - column doesn't exist in database yet
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
    const truck = await Truck.findByPk(req.params.id, {
      attributes: ["id", "licenseNumber", "truckType", "capacity", "status", "currentLat", "currentLng", "lastLocationUpdate", "createdAt", "updatedAt"], // Explicit attributes - truckName, regionId, and isActive removed
    });

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
    const truck = await Truck.findByPk(req.params.id, {
      attributes: ["id", "licenseNumber", "truckType", "capacity", "status", "currentLat", "currentLng", "lastLocationUpdate", "createdAt", "updatedAt"], // Explicit attributes - truckName, regionId, and isActive removed
    });

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

    // Soft delete - isActive removed, using status only
    await truck.update({ status: "inactive" });

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
      attributes: ["id", "licenseNumber", "truckType", "currentLat", "currentLng", "lastLocationUpdate"], // truckName removed - column doesn't exist
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
      truckName: truck.licenseNumber, // Using licenseNumber as identifier since truckName doesn't exist
      licenseNumber: truck.licenseNumber,
      truckType: truck.truckType,
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

    const truck = await Truck.findByPk(req.params.id, {
      attributes: ["id", "licenseNumber", "truckType", "capacity", "status", "currentLat", "currentLng", "lastLocationUpdate", "createdAt", "updatedAt"], // Explicit attributes - truckName, regionId, and isActive removed
    });

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

