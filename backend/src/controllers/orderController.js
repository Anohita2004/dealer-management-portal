// src/controllers/orderController.js
// src/controllers/orderController.js
const { Order, OrderItem, Material, Dealer, sequelize } = require('../models');


exports.placeOrder = async (req, res) => {
const t = await sequelize.transaction();
try {
const dealerId = req.user?.dealerId || req.body.dealerId;
if (!dealerId) return res.status(400).json({ error: 'Missing dealerId' });
const { items = [], notes } = req.body;
if (!items.length) return res.status(400).json({ error: 'No items' });


let total = 0;
for (const it of items) {
const mat = await Material.findByPk(it.materialId);
if (!mat) {
await t.rollback();
return res.status(404).json({ error: `Material ${it.materialId} not found` });
}
total += Number(it.qty) * Number(it.unitPrice || 0);
}


const order = await Order.create({
dealerId,
orderNumber: `ORD-${Date.now()}`,
status: 'Pending',
totalAmount: total,
notes
}, { transaction: t });


for (const it of items) {
const lineTotal = Number(it.qty) * Number(it.unitPrice || 0);
await OrderItem.create({ orderId: order.id, materialId: it.materialId, qty: it.qty, unitPrice: it.unitPrice, lineTotal }, { transaction: t });
}


// optional notifications: implement as you like (email, socket, notification table)


await t.commit();
res.status(201).json({ orderId: order.id, orderNumber: order.orderNumber });
} catch (err) {
await t.rollback();
console.error('placeOrder:', err);
res.status(500).json({ error: 'Failed to place order', details: err.message });
}
};


exports.getOrdersForDealer = async (req, res) => {
try {
const where = {};
if (req.user?.role === 'dealer') where.dealerId = req.user.dealerId;
const orders = await Order.findAll({ where, include: [{ model: OrderItem, as: 'items', include: [{ model: Material, as: 'material' }] }], order: [['createdAt','DESC']] });
res.json({ orders });
} catch (err) {
console.error('getOrdersForDealer:', err);
res.status(500).json({ error: 'Failed to fetch orders' });
}
};


exports.updateOrderStatus = async (req, res) => {
const t = await sequelize.transaction();
try {
const { id } = req.params;
const { status } = req.body;
const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: 'items' }] });
if (!order) return res.status(404).json({ error: 'Order not found' });
order.status = status;
await order.save({ transaction: t });


// If moving to "Shipped" or "Processing" update material stock
if (['Shipped','Processing'].includes(status)) {
for (const item of order.items) {
const mat = await Material.findByPk(item.materialId);
if (mat) {
mat.stock = Math.max(0, (mat.stock || 0) - item.qty);
await mat.save({ transaction: t });
}
}
}


await t.commit();
res.json({ order });
} catch (err) {
await t.rollback();
console.error('updateOrderStatus:', err);
res.status(500).json({ error: 'Failed to update status' });
}
};
exports.approveOrder = async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = "Approved";
  await order.save();

  res.json({ message: "Order approved" });
};
exports.rejectOrder = async (req, res) => {
  const { reason } = req.body;
  const order = await Order.findByPk(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = "Rejected";
  order.notes = reason;
  await order.save();

  res.json({ message: "Order rejected" });
};
exports.getMyOrders = async (req, res) => {
  try {
    const dealerId = req.user?.dealerId;

    const orders = await Order.findAll({
      where: { dealerId },
      include: [
        {
          model: OrderItem,
          include: [{ model: Material }]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ orders });
  } catch (err) {
    console.error("getMyOrders:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            { model: Material, as: "material" }
          ]
        },
        {
          model: Dealer,
          as: "dealer"
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load orders" });
  }
};
