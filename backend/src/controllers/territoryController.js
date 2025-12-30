// src/controllers/territoryController.js
const { Territory, Area, Region, Dealer, User, sequelize } = require('../models');
const { Op } = require("sequelize");

// CREATE TERRITORY
exports.createTerritory = async (req, res) => {
  try {
    const { name, areaId, geojson, centroidLat, centroidLng } = req.body;
    const area = await Area.findByPk(areaId);

    if (!area) return res.status(404).json({ error: "Area not found" });

    const role = req.user.roleDetails?.name || req.user.role;

    if (role === "area_manager" && req.user.areaId !== areaId)
      return res.status(403).json({ error: "Not allowed outside your area" });

    if (role === "regional_admin" && area.regionId !== req.user.regionId)
      return res.status(403).json({ error: "Different region" });

    const territory = await Territory.create({ name, areaId, geojson, centroidLat, centroidLng });
    res.status(201).json({ message: "Territory created", territory });

  } catch (err) {
    console.error("createTerritory:", err);
    res.status(500).json({ error: "Failed to create" });
  }
};


// GET TERRITORIES
exports.getTerritories = async (req, res) => {
  try {
    const { areaId } = req.query;
    const where = {};
    const role = req.user.roleDetails?.name || req.user.role;

    // Support areaId query parameter
    if (areaId) {
      where.areaId = areaId;
    } else if (role === "area_manager") {
      where.areaId = req.user.areaId;
    } else if (role === "regional_admin") {
      const areas = await Area.findAll({ where: { regionId: req.user.regionId }, attributes:["id"] });
      where.areaId = { [Op.in]: areas.map(a => a.id) };
    }

    const territories = await Territory.findAll({
      where,
      include: [
        {
          model: Area,
          as: "area",
          attributes:["id","name"],
          include:[{ model: Region, as:"region", attributes:["id","name"] }]
        },
        { model: Dealer, as:"dealers", attributes:["id","businessName","dealerCode"] }
      ],
      order:[["name","ASC"]]
    });

    // Format response to match documentation (id, name, code, areaId)
    const formattedTerritories = territories.map(territory => ({
      id: territory.id,
      name: territory.name,
      code: territory.code || territory.name.substring(0, 2).toUpperCase(),
      areaId: territory.areaId,
    }));

    res.json(formattedTerritories);

  } catch (err) {
    console.error("getTerritories:", err);
    res.status(500).json({ error:"Failed to load territories" });
  }
};


// SINGLE TERRITORY
exports.getTerritory = async (req, res) => {
  try {
    const territory = await Territory.findByPk(req.params.id, {
      include:[
        {
          model: Area,
          as:"area",
          include:[{ model: Region, as:"region" }]
        },
        {
          model: Dealer,
          as:"dealers",
          include:[{ model: User, as:"user", attributes:["id","username","email"] }]
        }
      ]
    });

    if (!territory) return res.status(404).json({ error:"Not found" });

    const role = req.user.roleDetails?.name || req.user.role;
    if (role === "area_manager" && territory.areaId !== req.user.areaId)
      return res.status(403).json({ error:"Access denied" });

    if (role === "regional_admin" && territory.area?.regionId !== req.user.regionId)
      return res.status(403).json({ error:"Access denied" });

    res.json({ territory });

  } catch (err) {
    console.error("getTerritory:", err);
    res.status(500).json({ error:"Failed to fetch" });
  }
};


// UPDATE TERRITORY
exports.updateTerritory = async (req, res) => {
  try {
    const territory = await Territory.findByPk(req.params.id);
    if (!territory) return res.status(404).json({ error:"Not found" });

    const role = req.user.roleDetails?.name || req.user.role;

    if (role === "area_manager" && req.user.areaId !== territory.areaId)
      return res.status(403).json({ error:"Not your area" });

    if (role === "regional_admin") {
      const area = await Area.findByPk(territory.areaId);
      if (area.regionId !== req.user.regionId)
        return res.status(403).json({ error:"Not your region" });
    }

    await territory.update(req.body);
    res.json({ message:"Updated", territory });

  } catch (err) {
    console.error("updateTerritory:", err);
    res.status(500).json({ error:"Update failed" });
  }
};


// DELETE TERRITORY
exports.deleteTerritory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const territory = await Territory.findByPk(req.params.id, {
      include:[
        { model: Dealer, as:"dealers" },
        { model: Area, as:"area", include:[{ model:Region, as:"region" }] }
      ],
      transaction:t
    });

    if (!territory) return res.status(404).json({ error:"Not found" });
    if (territory.dealers.length) return res.status(400).json({ error:"Move dealers first" });

    const role = req.user.roleDetails?.name || req.user.role;

    if (role === "area_manager" && req.user.areaId !== territory.areaId)
      return res.status(403).json({ error:"Not your area" });

    if (role === "regional_admin" && territory.area.regionId !== req.user.regionId)
      return res.status(403).json({ error:"Not your region" });

    await territory.destroy({ transaction:t });
    await t.commit();
    res.json({ message:"Deleted" });

  } catch (err) {
    await t.rollback();
    console.error("deleteTerritory:", err);
    res.status(500).json({ error:"Delete failed" });
  }
};
