// src/controllers/materialGroupController.js
const { MaterialGroup, Material } = require('../models');


exports.createGroup = async (req, res) => {
try {
const g = await MaterialGroup.create(req.body);
res.status(201).json(g);
} catch (err) {
console.error('createGroup:', err);
res.status(500).json({ error: 'Failed to create group' });
}
};


exports.getGroups = async (req, res) => {
try {
const groups = await MaterialGroup.findAll({ include: [{ model: Material, as: 'materials' }] });
res.json({ groups });
} catch (err) {
console.error('getGroups:', err);
res.status(500).json({ error: 'Failed to fetch groups' });
}
};


exports.assignMaterial = async (req, res) => {
try {
const { materialId } = req.body;
const { id: groupId } = req.params;
const group = await MaterialGroup.findByPk(groupId);
if (!group) return res.status(404).json({ error: 'Group not found' });
const mat = await Material.findByPk(materialId);
if (!mat) return res.status(404).json({ error: 'Material not found' });
await mat.update({ materialGroupId: groupId });
res.json({ message: 'Assigned', material: mat });
} catch (err) {
console.error('assignMaterial:', err);
res.status(500).json({ error: 'Failed to assign' });
}
};