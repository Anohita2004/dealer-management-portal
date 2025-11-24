// src/controllers/materialController.js
const { Material, MaterialGroup, OrderItem, sequelize } = require('../models');
const { Op } = require('sequelize');


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
		if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });

		let xlsx;
		try {
			xlsx = require('xlsx');
		} catch (e) {
			return res.status(500).json({ error: 'Missing dependency: please run `npm install xlsx`' });
		}

		const workbook = xlsx.readFile(req.file.path);
		const sheetName = workbook.SheetNames[0];
		const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

		const results = { created: 0, updated: 0, errors: [] };

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];

			// flexible mapping for common column names
			const materialNumber = row.materialNumber || row['Material Number'] || row['material_number'] || row['material number'] || row.MAT_NO || row.mat_no;
			const name = row.name || row.Name || row.materialName || row['Material Name'];
			const description = row.description || row.Description || row.desc;
			const uom = row.uom || row.UOM || row.unit;
			const plant = row.plant || row.Plant || row.site;
			const stock = row.stock != null ? parseInt(row.stock, 10) : (row.Stock != null ? parseInt(row.Stock, 10) : 0);
			const reorderLevel = row.reorderLevel != null ? parseInt(row.reorderLevel, 10) : (row.reorder_level != null ? parseInt(row.reorder_level, 10) : 0);
			const expiryDate = row.expiryDate || row['expiry_date'] || row['Expiry Date'] || row.EXPIRY_DATE || null;

			if (!materialNumber || !name) {
				results.errors.push({ row: i + 1, error: 'Missing materialNumber or name' });
				continue;
			}

			try {
				const existing = await Material.findOne({ where: { materialNumber } });
				if (existing) {
					await existing.update({ name, description, uom, plant, stock, reorderLevel, expiryDate });
					results.updated++;
				} else {
					await Material.create({ materialNumber, name, description, uom, plant, stock, reorderLevel, expiryDate });
					results.created++;
				}
			} catch (err) {
				results.errors.push({ row: i + 1, error: err.message });
			}
		}

		res.json({ message: 'Import completed', results });
	} catch (err) {
		console.error('importMaterials:', err);
		res.status(500).json({ error: 'Failed to import materials', details: err.message });
	}
};


// Analytics: fast-moving and slow-moving materials
exports.analytics = async (req, res) => {
	try {
		const { start, end, limit = 10 } = req.query;
		const where = {};
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
				[sequelize.fn('SUM', sequelize.col('qty')), 'totalQty']
			],
			where,
			group: ['materialId'],
			order: [[sequelize.literal('totalQty'), 'DESC']]
		});

		const map = aggregates.map(a => ({ materialId: a.materialId, totalQty: parseInt(a.get('totalQty'), 10) }));

		// get top N
		const top = map.slice(0, limit);

		// prepare bottom N: include materials with zero sales
		const materialIdsWithSales = map.map(m => m.materialId);
		const materialsNoSales = await Material.findAll({
			where: { id: { [Op.notIn]: materialIdsWithSales } },
			limit: parseInt(limit, 10)
		});

		// build responses with material details
		const enrich = async (arr) => {
			const ids = arr.map(x => x.materialId);
			const mats = await Material.findAll({ where: { id: ids } });
			return arr.map(x => ({ materialId: x.materialId, totalQty: x.totalQty, material: mats.find(m => m.id === x.materialId) || null }));
		};

		const fastMoving = await enrich(top);

		// slow-moving: take lowest aggregated, then append materials with no sales
		const bottomAgg = map.slice(-limit).reverse();
		const slowFromAgg = await enrich(bottomAgg);
		const slowFromNoSales = materialsNoSales.map(m => ({ materialId: m.id, totalQty: 0, material: m }));

		const slowMoving = [...slowFromAgg, ...slowFromNoSales].slice(0, limit);

		res.json({ fastMoving, slowMoving });
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