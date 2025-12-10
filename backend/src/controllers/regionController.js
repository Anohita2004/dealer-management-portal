const { Region, Area, Territory, Dealer, Document, PricingUpdate, Campaign, sequelize } = require("../models");

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

    res.json({ regions });
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

module.exports = {
  createRegion,
  getRegions,
  getRegion,
  updateRegion,
  deleteRegion,
  getRegionDashboardSummary,
  getRegionAreas,
  getRegionApprovals
};
