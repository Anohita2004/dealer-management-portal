const { 
  Area,
  Region,
  Territory,
  Dealer,
  Document,
  PricingUpdate,
  Campaign,
  sequelize
} = require("../models");


// =========================================================
// CREATE AREA
// =========================================================
const createArea = async (req, res) => {
  try {
    const { name, regionId, geojson, centroidLat, centroidLng } = req.body;

    const region = await Region.findByPk(regionId);
    if (!region) return res.status(404).json({ error: "Region not found" });

    if (req.user.role === "regional_admin" && req.user.regionId !== regionId)
      return res.status(403).json({ error: "Cannot create outside region" });

    const area = await Area.create({ name, regionId, geojson, centroidLat, centroidLng });

    return res.status(201).json({ message: "Area created successfully", area });
  } catch (err) {
    console.error("createArea:", err);
    return res.status(500).json({ error: "Failed to create area" });
  }
};


// =========================================================
// GET AREAS LIST
// =========================================================
const getAreas = async (req, res) => {
  try {
    const { regionId } = req.query;
    
    const filter = {};
    if (regionId) {
      filter.regionId = regionId;
    } else if (req.user.role === "regional_admin") {
      filter.regionId = req.user.regionId;
    }

    const areas = await Area.findAll({
      where: filter,
      include: [
        { model: Region, as: "region", attributes: ["id", "name"] },   // ← fixed
        { model: Territory, as: "territories", attributes: ["id", "name"] } // ← fixed
      ]
    });

    // Format response to match documentation (id, name, code, regionId)
    const formattedAreas = areas.map(area => ({
      id: area.id,
      name: area.name,
      code: area.code || area.name.substring(0, 2).toUpperCase(),
      regionId: area.regionId,
    }));

    res.json(formattedAreas);
  } catch (err) {
    console.error("getAreas:", err);
    res.status(500).json({ error: "Failed to fetch areas" });
  }
};

// =========================================================
// GET SINGLE AREA
// =========================================================
const getArea = async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id, {
      include: [
        { model: Region, as: "region", attributes: ["id","name","geojson"] },   // ← fixed
        {
          model: Territory,
          as: "territories",   // ← required alias
          include: [
            { model: Dealer, as: "dealers", attributes: ["id","businessName","dealerCode","lat","lng"] }
          ]
        }
      ]
    });

    if (!area) return res.status(404).json({ error: "Area not found" });
    if (req.user.role === "regional_admin" && req.user.regionId !== area.regionId)
      return res.status(403).json({ error: "Access denied" });

    res.json({ area });
  } catch (err) {
    console.error("getArea:", err);
    res.status(500).json({ error: "Failed to fetch area" });
  }
};

// =========================================================
// UPDATE AREA  🔥 (missing earlier)
// =========================================================
const updateArea = async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id);
    if (!area) return res.status(404).json({ error: "Area not found" });

    if (req.user.role === "regional_admin" && req.user.regionId !== area.regionId)
      return res.status(403).json({ error: "Outside region" });

    await area.update(req.body);
    return res.json({ message: "Area updated", area });

  } catch (err) {
    console.error("updateArea:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
};


// =========================================================
// DELETE AREA  🔥 (missing earlier)
// =========================================================
const deleteArea = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const area = await Area.findByPk(req.params.id, {
      include: [
        { model: Territory },
        { model: Dealer }
      ],
      transaction: t
    });

    if (!area) return res.status(404).json({ error: "Area not found" });
    if (area.territories?.length) return res.status(400).json({ error: "Move territories first" });
    if (area.dealers?.length) return res.status(400).json({ error: "Reassign dealers first" });

    await area.destroy({ transaction: t });
    await t.commit();
    return res.json({ message: "Area deleted successfully" });

  } catch (err) {
    await t.rollback();
    console.error("deleteArea:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
};


// =========================================================
// DASHBOARD SUMMARY
// =========================================================
const getAreaDashboardSummary = async (req, res) => {
  try {
    const areaId = req.user.areaId;
    if (!areaId) return res.status(400).json({ error: "No assigned areaId found" });

    const dealers = await Dealer.count({ where: { areaId }}); 
    const territories = await Territory.count({ where: { areaId }});

    const pendingDocs = await Document.count({
      include: [{ model: Dealer, as: "dealer", where: { areaId }}],
      where: { status: "pending" }
    });

    const pendingPricing = await PricingUpdate.count({
      include: [{ model: Dealer, as: "dealer", where: { areaId }}],
      where: { status: "pending" }
    });

    const activeCampaigns = await Campaign.count({ where: { areaId, isActive: true }});

    return res.json({
      dealers,
      territories,
      approvalsPending: pendingDocs + pendingPricing,
      activeCampaigns
    });

  } catch (err) {
    console.error("🔴 AREA SUMMARY ERROR:", err);
    return res.status(500).json({ error: "Failed to load dashboard summary" });
  }
};


// =========================================================
// AREA DEALERS LIST
// =========================================================
const getAreaDealers = async (req, res) => {
  try {
    const dealers = await Dealer.findAll({
      where:{ areaId:req.user.areaId },
      attributes:["id","businessName","dealerCode","phoneNumber","isActive"]
    });

    return res.json(dealers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error:"Failed to load dealers" });
  }
};


// =========================================================
// APPROVALS LIST
// =========================================================
const getAreaApprovals = async (req,res)=>{
  try{
    const approvals = await Document.findAll({
      include:[{
        model: Dealer,
        as: "dealer",
        where:{ areaId: req.user.areaId }
      }],
      where:{ status:"pending" }
    });

    return res.json(approvals);

  }catch(err){
    console.error("Area approvals error:", err);
    return res.status(500).json({ error:"Failed to load approvals" });
  }
};


// 🎯 FINAL EXPORT FIXED
module.exports = {
  createArea,
  getAreas,
  getArea,
  updateArea,
  deleteArea,
  getAreaDashboardSummary,
  getAreaDealers,
  getAreaApprovals
};
