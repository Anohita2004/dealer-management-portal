const { GoodsReceipt, Order, OrderItem, Material, Inventory, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Post a Goods Receipt (GR).
 * This updates inventory, order status, and records the receipt.
 * POST /api/goods-receipt/post
 */
const postGoodsReceipt = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { orderId, receivedItems, remarks } = req.body;
        const dealerId = req.user.dealerId; // Assumes dealer context from JWT

        if (!orderId || !receivedItems || !Array.isArray(receivedItems)) {
            return res.status(400).json({ success: false, message: 'Invalid receipt data' });
        }

        // 1. Verify order exists and is in "Shipped" status
        const order = await Order.findByPk(orderId, { transaction });
        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.status !== 'Shipped' && order.status !== 'In Transit') {
            // We permit receipt if it was at least shipped
        }

        // 2. Create the Goods Receipt record
        const receiptNumber = `GR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const goodsReceipt = await GoodsReceipt.create({
            receiptNumber,
            orderId,
            dealerId,
            receivedItems,
            remarks,
            receivedAt: new Date()
        }, { transaction });

        // 3. Update Inventory for each item
        for (const item of receivedItems) {
            const { materialId, quantity } = item;

            const material = await Material.findByPk(materialId, { transaction });
            if (!material) continue;

            // Find or create inventory record for this dealer/material
            let inventory = await Inventory.findOne({
                where: {
                    materialNumber: material.materialNumber,
                    plant: order.dealerId // Assuming dealerId is used to identify the local "plant"
                },
                transaction
            });

            if (inventory) {
                inventory.stock = parseInt(inventory.stock) + parseInt(quantity);
                await inventory.save({ transaction });
            } else {
                // Create new inventory entry if doesn't exist
                await Inventory.create({
                    name: material.name,
                    materialNumber: material.materialNumber,
                    plant: order.dealerId,
                    stock: quantity,
                    uom: material.uom,
                    description: material.description
                }, { transaction });
            }
        }

        // 4. Update Order Status to Delivered
        order.status = 'Delivered';
        await order.save({ transaction });

        await transaction.commit();

        return res.status(201).json({
            success: true,
            message: 'Goods Receipt posted successfully and inventory updated',
            data: goodsReceipt
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in postGoodsReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get pending shipments for the current dealer.
 */
const getPendingReceipts = async (req, res) => {
    try {
        const dealerId = req.user.dealerId;
        const orders = await Order.findAll({
            where: {
                dealerId,
                status: ['Shipped', 'In Transit']
            },
            include: [{ model: OrderItem, as: 'items', include: [{ model: Material, as: 'material' }] }]
        });

        return res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Error in getPendingReceipts:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// --- CRUD and workflow stubs for advanced workflow ---
// These stubs return 501 Not Implemented and can be filled in as needed
async function createGoodsReceipt(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function getAllGoodsReceipts(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function getGoodsReceiptById(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function updateGoodsReceipt(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function deleteGoodsReceipt(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function approveGoodsReceipt(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function rejectGoodsReceipt(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

async function postGoodsReceiptToSAP(req, res) {
    return res.status(501).json({ message: 'Not implemented yet' });
}

module.exports = {
    postGoodsReceipt,
    getPendingReceipts,
    createGoodsReceipt,
    getAllGoodsReceipts,
    getGoodsReceiptById,
    updateGoodsReceipt,
    deleteGoodsReceipt,
    approveGoodsReceipt,
    rejectGoodsReceipt,
    postGoodsReceiptToSAP
};
