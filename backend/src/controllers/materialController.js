// src/controllers/materialController.js
const { Material, MaterialGroup } = require('../models');


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