const { Region, Area, Territory, Dealer, Document, PricingUpdate, Campaign, Material, RegionMaterial, sequelize } = require("../models");

// =========================================================
// CREATE REGION
// =========================================================
const createRegion = async (req, res) => {
  try {
    const { name, geojson, centroidLat, centroidLng } = req.body;

    // Only super_admin can create regions
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admin can create regions" });
    }

    const region = await Region.create({ name, geojson, centroidLat, centroidLng });

    return res.status(201).json({ message: "Region created successfully", region });
  } catch (err) {
    console.error("createRegion:", err);
    return res.status(500).json({ error: "Failed to create region" });
  }
};

// =========================================================
// GET REGIONS LIST
// =========================================================
const getRegions = async (req, res) => {
  try {
    const regions = await Region.findAll({
      include: [
        { model: Area, as: "areas", attributes: ["id", "name"] },
        { model: Dealer, as: "dealers", attributes: ["id", "businessName", "dealerCode"] }
      ],
      order: [["name", "ASC"]],
    });

    // Format response to match documentation (id, name, code)
    const formattedRegions = regions.map(region => ({
      id: region.id,
      name: region.name,
      code: region.code || region.name.substring(0, 2).toUpperCase(),
    }));

    res.json(formattedRegions);
  } catch (err) {
    console.error("getRegions:", err);
    res.status(500).json({ error: "Failed to fetch regions" });
  }
};

// =========================================================
// GET SINGLE REGION
// =========================================================
const getRegion = async (req, res) => {
  try {
    const region = await Region.findByPk(req.params.id, {
      include: [
        {
          model: Area,
          as: "areas",
          include: [
            { model: Territory, as: "territories", attributes: ["id", "name"] }
          ]
        },
        { model: Dealer, as: "dealers", attributes: ["id", "businessName", "dealerCode", "lat", "lng"] }
      ]
    });

    if (!region) return res.status(404).json({ error: "Region not found" });

    // Regional admin can only view their own region
    if (req.user.role === "regional_admin" && req.user.regionId !== region.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ region });
  } catch (err) {
    console.error("getRegion:", err);
    res.status(500).json({ error: "Failed to fetch region" });
  }
};

// =========================================================
// UPDATE REGION
// =========================================================
const updateRegion = async (req, res) => {
  try {
    const region = await Region.findByPk(req.params.id);
    if (!region) return res.status(404).json({ error: "Region not found" });

    // Only super_admin can update regions
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admin can update regions" });
    }

    await region.update(req.body);
    return res.json({ message: "Region updated", region });

  } catch (err) {
    console.error("updateRegion:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
};

// =========================================================
// DELETE REGION
// =========================================================
const deleteRegion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const region = await Region.findByPk(req.params.id, {
      include: [
        { model: Area, as: "areas", include: [{ model: Territory, as: "territories" }] },
        { model: Dealer, as: "dealers" }
      ],
      transaction: t
    });

    if (!region) return res.status(404).json({ error: "Region not found" });
    if (region.areas?.length) return res.status(400).json({ error: "Move areas first" });
    if (region.dealers?.length) return res.status(400).json({ error: "Reassign dealers first" });

    // Only super_admin can delete regions
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ error: "Only super admin can delete regions" });
    }

    await region.destroy({ transaction: t });
    await t.commit();
    return res.json({ message: "Region deleted successfully" });

  } catch (err) {
    await t.rollback();
    console.error("deleteRegion:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
};

// =========================================================
// DASHBOARD SUMMARY
// =========================================================
const getRegionDashboardSummary = async (req, res) => {
  try {
    const regionId = req.user.regionId;
    if (!regionId) return res.status(400).json({ error: "No assigned regionId found" });

    const dealers = await Dealer.count({ where: { regionId } });
    const areas = await Area.count({ where: { regionId } });
    const territories = await Territory.count({
      include: [{ model: Area, as: "area", where: { regionId } }]
    });

    const pendingDocs = await Document.count({
      include: [{ model: Dealer, as: "dealer", where: { regionId } }],
      where: { status: "pending" }
    });

    const pendingPricing = await PricingUpdate.count({
      include: [{ model: Dealer, as: "dealer", where: { regionId } }],
      where: { status: "pending" }
    });

    const activeCampaigns = await Campaign.count({ where: { regionId, isActive: true } });

    return res.json({
      dealers,
      areas,
      territories,
      approvalsPending: pendingDocs + pendingPricing,
      activeCampaigns
    });

  } catch (err) {
    console.error("🔴 REGION SUMMARY ERROR:", err);
    return res.status(500).json({ error: "Failed to load dashboard summary" });
  }
};

// =========================================================
// REGION AREAS LIST
// =========================================================
const getRegionAreas = async (req, res) => {
  try {
    const areas = await Area.findAll({
      where: { regionId: req.user.regionId },
      attributes: ["id", "name", "centroidLat", "centroidLng"]
    });

    return res.json(areas);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load areas" });
  }
};

// =========================================================
// APPROVALS LIST
// =========================================================
const getRegionApprovals = async (req, res) => {
  try {
    const approvals = await Document.findAll({
      include: [{
        model: Dealer,
        as: "dealer",
        where: { regionId: req.user.regionId }
      }],
      where: { status: "pending" }
    });

    return res.json(approvals);

  } catch (err) {
    console.error("Region approvals error:", err);
    return res.status(500).json({ error: "Failed to load approvals" });
  }
};

// =========================================================
// REGION ↔ MATERIAL MAPPINGS (ADMIN)
// =========================================================

// List materials assigned to a region
const getRegionMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const region = await Region.findByPk(id);
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }

    const mappings = await RegionMaterial.findAll({
      where: { regionId: id, isActive: true },
      include: [{ model: Material, as: "material" }],
      order: [["createdAt", "DESC"]],
    });

    const materials = mappings.map((m) => m.material).filter(Boolean);
    return res.json({ materials, mappings });
  } catch (err) {
    console.error("getRegionMaterials:", err);
    return res.status(500).json({ error: "Failed to fetch region materials" });
  }
};

// Bulk assign materials to a region
const assignRegionMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const { materialIds = [] } = req.body;

    const region = await Region.findByPk(id);
    if (!region) {
      return res.status(404).json({ error: "Region not found" });
    }

    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      return res.status(400).json({ error: "materialIds array is required" });
    }

    const results = [];
    for (const materialId of materialIds) {
      const [mapping] = await RegionMaterial.findOrCreate({
        where: { regionId: id, materialId },
        defaults: { isActive: true },
      });
      if (!mapping.isActive) {
        mapping.isActive = true;
        await mapping.save();
      }
      results.push(mapping);
    }

    return res.status(200).json({ mappings: results });
  } catch (err) {
    console.error("assignRegionMaterials:", err);
    return res.status(500).json({ error: "Failed to assign materials to region" });
  }
};

// Remove a single material from a region
const removeRegionMaterial = async (req, res) => {
  try {
    const { id, materialId } = req.params;

    const mapping = await RegionMaterial.findOne({
      where: { regionId: id, materialId },
    });

    if (!mapping) {
      return res.status(404).json({ error: "Region-material mapping not found" });
    }

    // Soft-deactivate for auditability
    mapping.isActive = false;
    await mapping.save();

    return res.json({ message: "Material unassigned from region" });
  } catch (err) {
    console.error("removeRegionMaterial:", err);
    return res.status(500).json({ error: "Failed to unassign material from region" });
  }
};

module.exports = {
  createRegion,
  getRegions,
  getRegion,
  updateRegion,
  deleteRegion,
  getRegionDashboardSummary,
  getRegionAreas,
  getRegionApprovals,
  getRegionMaterials,
  assignRegionMaterials,
  removeRegionMaterial
};
