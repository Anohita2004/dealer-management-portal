// src/controllers/materialController.js
const { Material, MaterialGroup, OrderItem, DealerMaterial, sequelize } = require('../models');
const { Op,fn, col, literal } = require('sequelize');
const RBACEngine = require('../services/rbacEngine');
const excelToJson = require("convert-excel-to-json");


exports.createMaterial = async (req, res) => {
try {
const payload = req.body;
const mat = await Material.create(payload);
// optional audit log: adjust or remove if you don't have AuditLog
if (req.models && req.models.AuditLog) {
await req.models.AuditLog.create({ userId: req.user?.id || null, action: 'CREATE_MATERIAL', entity: 'Material', entityId: mat.id, ipAddress: req.ip });
}
res.status(201).json(mat);
} catch (err) {
console.error('createMaterial:', err);
res.status(500).json({ error: 'Failed to create material', details: err.message });
}
};


exports.getMaterials = async (req, res) => {
try {
const mats = await Material.findAll({ include: [{ model: MaterialGroup, as: 'group' }], order: [['createdAt','DESC']] });
res.json({ materials: mats });
} catch (err) {
console.error('getMaterials:', err);
res.status(500).json({ error: 'Failed to fetch materials' });
}
};

// Dealer-scoped material availability
exports.getDealerMaterials = async (req, res) => {
  try {
    const { dealerId } = req.params;
    if (!dealerId) {
      return res.status(400).json({ error: "dealerId is required" });
    }

    // Ensure user is allowed to see this dealer
    const allowedDealers = await RBACEngine.getDealersInScope(req.user);
    if (!allowedDealers.includes(dealerId)) {
      return res.status(403).json({ error: "Dealer is out of scope for this user" });
    }

    const mappings = await DealerMaterial.findAll({
      where: { dealerId, isActive: true },
      include: [
        {
          model: Material,
          as: "material",
          include: [{ model: MaterialGroup, as: "group" }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const materials = mappings
      .map((m) => m.material)
      .filter(Boolean);

    res.json({ materials, mappings });
  } catch (err) {
    console.error("getDealerMaterials:", err);
    res.status(500).json({ error: "Failed to fetch dealer materials" });
  }
};


exports.getMaterialById = async (req, res) => {
try {
const { id } = req.params;
const mat = await Material.findByPk(id, { include: [{ model: MaterialGroup, as: 'group' }] });
if (!mat) return res.status(404).json({ error: 'Material not found' });
res.json(mat);
} catch (err) {
console.error('getMaterialById:', err);
res.status(500).json({ error: 'Failed to fetch material' });
}
};


exports.updateMaterial = async (req, res) => {
try {
const { id } = req.params;
const mat = await Material.findByPk(id);
if (!mat) return res.status(404).json({ error: 'Material not found' });
await mat.update(req.body);
res.json(mat);
} catch (err) {
console.error('updateMaterial:', err);
res.status(500).json({ error: 'Failed to update material' });
}
};


exports.deleteMaterial = async (req, res) => {
try {
const { id } = req.params;
await Material.destroy({ where: { id } });
res.json({ message: 'Deleted' });
} catch (err) {
console.error('deleteMaterial:', err);
res.status(500).json({ error: 'Failed to delete' });
}
};


// Import materials from XLSX/CSV
exports.importMaterials = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });

    const xlsx = require("xlsx");

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], { defval: null });

    const results = { created: 0, updated: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const materialNumber =
        row.materialNumber ||
        row["Material Number"] ||
        row["material_number"] ||
        row["material number"] ||
        row.MAT_NO ||
        row.mat_no;

      const name =
        row.name ||
        row.Name ||
        row.materialName ||
        row["Material Name"];

      const description =
        row.description || row.Description || row.desc;

      const uom = row.uom || row.UOM || row.unit;
      const plant = row.plant || row.Plant || row.site;

      const stock = parseInt(row.stock ?? row.Stock ?? 0, 10);
      const reorderLevel = parseInt(row.reorderLevel ?? row.reorder_level ?? 0, 10);

      const expiryDate =
        row.expiryDate ||
        row["Expiry Date"] ||
        row["expiry_date"] ||
        row.EXPIRY_DATE ||
        null;

      if (!materialNumber || !name) {
        results.errors.push({
          row: i + 1,
          error: "Missing materialNumber or name",
        });
        continue;
      }

      try {
        const existing = await Material.findOne({
          where: { materialNumber },
        });

        if (existing) {
          await existing.update({
            name,
            description,
            uom,
            plant,
            stock,
            reorderLevel,
            expiryDate,
          });

          results.updated++;
        } else {
          await Material.create({
            materialNumber,
            name,
            description,
            uom,
            plant,
            stock,
            reorderLevel,
            expiryDate,
          });

          results.created++;
        }
      } catch (err) {
        results.errors.push({
          row: i + 1,
          error: err.message,
        });
      }
    }

    res.json({
      message: "Import completed",
      results,
    });
  } catch (err) {
    console.error("importMaterials:", err);
    res.status(500).json({
      error: "Failed to import materials",
      details: err.message,
    });
  }
};


// Analytics: fast-moving and slow-moving materials
exports.analytics = async (req, res) => {
  try {
    const { start, end, limit = 10 } = req.query;
    const where = {};

    // filter by date if provided
    if (start && end) {
      where.createdAt = { [Op.between]: [new Date(start), new Date(end)] };
    } else if (start) {
      where.createdAt = { [Op.gte]: new Date(start) };
    } else if (end) {
      where.createdAt = { [Op.lte]: new Date(end) };
    }

    // aggregate quantities by material
    const aggregates = await OrderItem.findAll({
      attributes: [
        'materialId',
        [fn('SUM', col('qty')), 'totalqty'] // lowercase alias
      ],
      where,
      group: ['materialId'],
      order: [[literal('totalqty'), 'DESC']] // match alias
    });

    const map = aggregates.map(a => ({
      materialId: a.materialId,
      totalQty: parseInt(a.get('totalqty'), 10)
    }));

    // Get material IDs with sales
    const materialIdsWithSales = map.map(m => m.materialId);

    // Fetch all materials once
    const allMaterials = await Material.findAll();
    const materialMap = Object.fromEntries(allMaterials.map(m => [m.id, m]));

    // Top N fast-moving
    const top = map.slice(0, limit).map(x => ({
      materialId: x.materialId,
      totalQty: x.totalQty,
      material: materialMap[x.materialId] || null
    }));

    // Bottom N slow-moving: lowest sales + zero sales
    const bottomAgg = map.slice(-limit).reverse();
    const slowFromAgg = bottomAgg.map(x => ({
      materialId: x.materialId,
      totalQty: x.totalQty,
      material: materialMap[x.materialId] || null
    }));

    const materialsNoSales = allMaterials
      .filter(m => !materialIdsWithSales.includes(m.id))
      .slice(0, limit)
      .map(m => ({ materialId: m.id, totalQty: 0, material: m }));

    const slowMoving = [...slowFromAgg, ...materialsNoSales].slice(0, limit);

    res.json({ fastMoving: top, slowMoving });
  } catch (err) {
    console.error('analytics:', err);
    res.status(500).json({ error: 'Failed to compute analytics', details: err.message });
  }
};


// Alerts: expiry and reorder level
exports.alerts = async (req, res) => {
	try {
		const days = parseInt(req.query.days || '30', 10);
		const soon = new Date();
		soon.setDate(soon.getDate() + days);

		const reorderAlerts = await Material.findAll({ where: { reorderLevel: { [Op.gt]: 0 }, stock: { [Op.lte]: sequelize.col('reorderLevel') } } });

		const expiryAlerts = await Material.findAll({ where: { expiryDate: { [Op.not]: null, [Op.lte]: soon } } });

		res.json({ reorderAlerts, expiryAlerts });
	} catch (err) {
		console.error('alerts:', err);
		res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
	}
};
const path = require('path');


exports.downloadTemplate = (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "..", "assets", "material_template.xlsx");

    res.download(filePath, "material_template.xlsx", (err) => {
      if (err) {
        console.error("Error sending template:", err);
        return res.status(500).send("Failed to download template");
      }
    });
  } catch (err) {
    console.error("downloadTemplate:", err);
    res.status(500).send("Failed to download template");
  }
};
// ------------------------------
// 📌 UPLOAD + PREVIEW VALIDATION
// ------------------------------
 // make sure you have this installed

exports.uploadMaterialPreview = async (req, res) => {
  try {
    // file must exist
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // convert Excel → JSON
    const result = excelToJson({
      sourceFile: req.file.path,
      header: { rows: 1 }, // first row is header
      columnToKey: {
        A: "materialNumber",
        B: "name",
        C: "description",
        D: "uom",
        E: "plant",
        F: "stock",
        G: "reorderLevel",
        H: "expiryDate",
        I: "materialGroupCode"
      }
    });

    const rows = result["Sheet1"];

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const errors = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // because row 1 is header
      let rowErrors = [];

      // required field validation
      if (!row.materialNumber) rowErrors.push("Material Number is required");
      if (!row.name) rowErrors.push("Name is required");
      if (!row.description) rowErrors.push("Description is required");
      if (!row.uom) rowErrors.push("UOM is required");
      if (!row.plant) rowErrors.push("Plant is required");
      if (!row.expiryDate) rowErrors.push("Expiry Date is required");
      if (!row.materialGroupCode) rowErrors.push("Material Group Code is required");

      // numeric validation
      if (row.stock !== undefined && (row.stock === "" || isNaN(Number(row.stock)))) {
        rowErrors.push("Stock must be numeric");
      } else if (row.stock !== undefined) {
        row.stock = Number(row.stock);
      }

      if (row.reorderLevel !== undefined && (row.reorderLevel === "" || isNaN(Number(row.reorderLevel)))) {
        rowErrors.push("Reorder Level must be numeric");
      } else if (row.reorderLevel !== undefined) {
        row.reorderLevel = Number(row.reorderLevel);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, issues: rowErrors });
      } else {
        validRows.push(row);
      }
    });

    // return validation errors if any
    if (errors.length > 0) {
      return res.status(400).json({
        status: "validation_failed",
        errors
      });
    }

    // send preview if all rows are valid
    return res.status(200).json({
      status: "preview_ok",
      preview: validRows
    });

  } catch (err) {
    console.error("uploadMaterialPreview:", err);
    return res.status(500).json({ error: "Failed to validate file" });
  }
};
