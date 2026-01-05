// src/controllers/warehouseController.js
const { Warehouse, Region, Area } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");
const locationService = require("../services/locationService");

/**
 * Get all warehouses (scoped)
 */
exports.getWarehouses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, regionId, areaId, isActive } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { warehouseCode: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
      ];
    }

    if (regionId) where.regionId = regionId;
    if (areaId) where.areaId = areaId;
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Apply RBAC scoping
    if (req.scope?.warehouse) {
      Object.assign(where, req.scope.warehouse);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, "Warehouse");
      Object.assign(where, scopeWhere);
    }

    const { count, rows } = await Warehouse.findAndCountAll({
      where,
      include: [
        { model: Region, as: "region", attributes: ["id", "name"] },
        { model: Area, as: "area", attributes: ["id", "name"] },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      warehouses: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
};

/**
 * Get warehouse by ID
 */
exports.getWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id, {
      include: [
        { model: Region, as: "region" },
        { model: Area, as: "area" },
      ],
    });

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, warehouse);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(warehouse);
  } catch (error) {
    console.error("Get warehouse error:", error);
    res.status(500).json({ error: "Failed to fetch warehouse" });
  }
};

/**
 * Create warehouse
 */
exports.createWarehouse = async (req, res) => {
  try {
    const {
      warehouseCode,
      name,
      address,
      city,
      state,
      pincode,
      lat,
      lng,
      regionId,
      areaId,
      contactPerson,
      phoneNumber,
      email,
    } = req.body;

    // Validate required fields
    if (!warehouseCode || !name) {
      return res.status(400).json({ error: "Warehouse code and name are required" });
    }

    // Validate coordinates
    if (!locationService.validateCoordinates(lat, lng)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Role-based validation: Regional admin can only create warehouses in their region
    const role = req.user.roleDetails?.name || req.user.role;
    if (role === 'regional_admin') {
      if (!req.user.regionId) {
        return res.status(403).json({ error: "Regional admin must be assigned to a region" });
      }
      if (!regionId) {
        return res.status(400).json({ error: "Region ID is required" });
      }
      if (regionId !== req.user.regionId) {
        return res.status(403).json({ 
          error: "Cannot create warehouse outside your region",
          message: `You can only create warehouses in region ${req.user.regionId}`
        });
      }
    }

    // Check if warehouse code already exists
    const existing = await Warehouse.findOne({
      where: { warehouseCode },
    });

    if (existing) {
      return res.status(400).json({ 
        error: "Warehouse code already exists",
        message: `A warehouse with code "${warehouseCode}" already exists. Please use a different code.`,
        field: "warehouseCode"
      });
    }

    const warehouse = await Warehouse.create({
      warehouseCode,
      name,
      address,
      city,
      state,
      pincode,
      lat,
      lng,
      regionId,
      areaId,
      contactPerson,
      phoneNumber,
      email,
      isActive: true,
    });

    console.log("✅ Warehouse created successfully:", warehouse.warehouseCode, "by", req.user.username);
    res.status(201).json(warehouse);
  } catch (error) {
    console.error("❌ Create warehouse error:", error);
    console.error("❌ Error stack:", error.stack);
    
    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'field';
      const value = error.errors?.[0]?.value;
      return res.status(400).json({ 
        error: `${field} must be unique`,
        message: `A warehouse with ${field} "${value}" already exists.`,
        field: field,
        value: value
      });
    }

    res.status(500).json({ 
      error: "Failed to create warehouse",
      message: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Update warehouse
 */
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, warehouse);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { lat, lng, regionId, ...updateData } = req.body;

    // Role-based validation: Regional admin can only update warehouses in their region
    const role = req.user.roleDetails?.name || req.user.role;
    if (role === 'regional_admin') {
      if (warehouse.regionId !== req.user.regionId) {
        return res.status(403).json({ 
          error: "Cannot update warehouse outside your region",
          message: `You can only update warehouses in region ${req.user.regionId}`
        });
      }
      // Prevent changing regionId to a different region
      if (regionId && regionId !== req.user.regionId) {
        return res.status(403).json({ 
          error: "Cannot move warehouse to a different region",
          message: `You can only assign warehouses to region ${req.user.regionId}`
        });
      }
    }

    // Validate coordinates if provided
    if (lat !== undefined || lng !== undefined) {
      const finalLat = lat !== undefined ? lat : warehouse.lat;
      const finalLng = lng !== undefined ? lng : warehouse.lng;
      if (!locationService.validateCoordinates(finalLat, finalLng)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      updateData.lat = finalLat;
      updateData.lng = finalLng;
    }

    // Include regionId in update if provided
    if (regionId !== undefined) {
      updateData.regionId = regionId;
    }

    await warehouse.update(updateData);

    console.log("✅ Warehouse updated successfully:", warehouse.warehouseCode, "by", req.user.username);
    res.json(warehouse);
  } catch (error) {
    console.error("❌ Update warehouse error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to update warehouse",
      message: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

/**
 * Delete warehouse
 */
exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Check access
    const canAccess = await RBACEngine.canAccessResource(req.user, warehouse);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Soft delete by setting isActive to false
    await warehouse.update({ isActive: false });

    res.json({ message: "Warehouse deactivated successfully" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    res.status(500).json({ error: "Failed to delete warehouse" });
  }
};

/**
 * Find nearest warehouse
 */
exports.findNearestWarehouse = async (req, res) => {
  try {
    const { lat, lng, regionId } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const result = await locationService.findNearestWarehouse(
      parseFloat(lat),
      parseFloat(lng),
      regionId || null
    );

    if (!result) {
      return res.status(404).json({ error: "No warehouses found" });
    }

    res.json(result);
  } catch (error) {
    console.error("Find nearest warehouse error:", error);
    res.status(500).json({ error: "Failed to find nearest warehouse", details: error.message });
  }
};

