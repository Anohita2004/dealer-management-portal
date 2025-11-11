// ==============================
// FILE: src/controllers/pricingController.js
// ==============================


const { PricingUpdate, AuditLog, Product } = require('../models');
const { Op } = require('sequelize');


module.exports = {
requestPricingChange: async (req, res) => {
try {
const { productId, oldPrice, newPrice, reason } = req.body;


if (!productId || newPrice == null) {
return res.status(400).json({ error: 'productId and newPrice are required' });
}


const product = await Product.findByPk(productId);
if (!product) return res.status(404).json({ error: 'Product not found' });


const update = await PricingUpdate.create({
productId,
oldPrice: oldPrice ?? product.price,
newPrice,
reason: reason || null,
requestedBy: req.user.username || req.user.id,
requestedByUserId: req.user.id,
status: 'pending'
});


await AuditLog.create({
userId: req.user.id,
action: 'PRICING_REQUEST',
entity: 'PricingUpdate',
entityId: update.id,
changes: { newPrice },
ipAddress: req.ip,
});


res.status(201).json({ message: 'Pricing request submitted', update });
} catch (err) {
console.error('requestPricingChange:', err);
res.status(500).json({ error: 'Failed to submit pricing request' });
}
},


getPricingUpdates: async (req, res) => {
try {
const { mine, page = 1, limit = 50 } = req.query;
const offset = (page - 1) * limit;


const where = {};
if (mine === 'true') where.requestedByUserId = req.user.id;


const { count, rows } = await PricingUpdate.findAndCountAll({
where,
limit: parseInt(limit),
offset: parseInt(offset),
order: [['createdAt', 'DESC']],
});


res.json({ updates: rows, total: count });
} catch (err) {
console.error('getPricingUpdates:', err);
res.status(500).json({ error: 'Failed to fetch pricing updates' });
}
}
};