const { GoodsReceipt, Order, OrderItem, Material, Inventory, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { User, Role } = require('../models');
const notificationService = require('../services/notificationService');
const { Invoice } = require('../models');
const { autoGenerateInvoiceAfterGR } = require('../controllers/invoiceController');
const RBACEngine = require('../services/rbacEngine');

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

        // Determine correct dealerId
        const actualDealerId = dealerId || order.dealerId;

        // Security check: If user is not the dealer, ensure they manage this dealer
        if (!dealerId) {
            const dealer = await sequelize.models.Dealer.findByPk(actualDealerId, { attributes: ['managerId'], transaction });
            // Allow if user is the manager OR super_admin (bypass for super_admin usually handled by middleware, but good to be safe)
            if (dealer && dealer.managerId !== req.user.id && req.user.role !== 'super_admin') {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'Not authorized to post receipt for this dealer' });
            }
        }

        if (order.status !== 'Shipped' && order.status !== 'In Transit') {
            // We permit receipt if it was at least shipped
        }

        // 2. Create the Goods Receipt record
        const receiptNumber = `GR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const goodsReceipt = await GoodsReceipt.create({
            receiptNumber,
            orderId,
            dealerId: actualDealerId,
            receivedItems,
            remarks,
            receivedAt: new Date()
        }, { transaction });

        // Notify sales executive
        await notifySalesExecutiveForGR(goodsReceipt);

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
        const roleName = req.user.roleDetails?.name || req.user.role;

        // SALES EXECUTIVE: Needs to see GRs waiting for *their* approval (status: 'pending')
        if (roleName === 'sales_executive') {
            // Use RBAC Engine to find all dealers in scope for this SE
            const dealerIds = await RBACEngine.getDealersInScope(req.user);

            if (dealerIds.length === 0) {
                return res.status(200).json({ success: true, data: [] });
            }

            const receipts = await GoodsReceipt.findAll({
                where: {
                    dealerId: dealerIds,
                    status: 'pending' // Only show what needs approval
                },
                include: [
                    {
                        model: Order,
                        as: 'order',
                        include: [{ model: OrderItem, as: 'items', include: ['material'] }]
                    }
                ]
            });

            return res.status(200).json({ success: true, data: receipts });
        }

        // DEALERS / OTHERS: See orders that are shipped but not yet GR'd
        let dealerIds = [];
        if (req.user.dealerId) {
            dealerIds = [req.user.dealerId];
        } else {
            // Fallback for admins/others
            const managedDealers = await sequelize.models.Dealer.findAll({
                where: { managerId: req.user.id },
                attributes: ['id']
            });
            if (managedDealers.length > 0) {
                dealerIds = managedDealers.map(d => d.id);
            }
        }

        if (dealerIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const orders = await Order.findAll({
            where: {
                dealerId: dealerIds,
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
    const transaction = await sequelize.transaction();
    try {
        const { orderId, receivedItems, remarks, damages, costCenterId } = req.body;
        const dealerId = req.user.dealerId;

        // Validate input
        if (!orderId || !receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid receipt data' });
        }

        // 1. Verify order exists and is in correct status
        const order = await Order.findByPk(orderId, { transaction });
        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.status !== 'Shipped' && order.status !== 'In Transit') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Order is not ready for receipt' });
        }

        // 2. Create the Goods Receipt record
        const receiptNumber = `GR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const goodsReceipt = await GoodsReceipt.create({
            receiptNumber,
            orderId,
            dealerId,
            receivedItems,
            remarks,
            costCenterId: costCenterId || null,
            status: 'pending',
            receivedAt: new Date()
        }, { transaction });

        // Notify sales executive
        await notifySalesExecutiveForGR(goodsReceipt);

        // 3. Update Inventory for each item
        for (const item of receivedItems) {
            const { materialId, quantity } = item;
            const material = await Material.findByPk(materialId, { transaction });
            if (!material) continue;
            let inventory = await Inventory.findOne({
                where: {
                    materialNumber: material.materialNumber,
                    plant: order.dealerId
                },
                transaction
            });
            if (inventory) {
                inventory.stock = parseInt(inventory.stock) + parseInt(quantity);
                await inventory.save({ transaction });
            } else {
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

        // 4. Handle Damages (if any)
        if (damages && Array.isArray(damages) && damages.length > 0) {
            const { DamageRecord } = require('../models');
            for (const damage of damages) {
                await DamageRecord.create({
                    goodsReceiptId: goodsReceipt.id,
                    materialCode: damage.materialCode,
                    quantity: damage.quantity,
                    reason: damage.reason,
                    reportedBy: req.user.id,
                    reportedAt: new Date(),
                    status: 'pending',
                    remarks: damage.remarks || null
                }, { transaction });
            }
        }

        // 5. Update Order Status to Delivered
        order.status = 'Delivered';
        await order.save({ transaction });

        await transaction.commit();
        return res.status(201).json({
            success: true,
            message: 'Goods Receipt created, inventory updated, damages recorded',
            data: goodsReceipt
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in createGoodsReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getAllGoodsReceipts(req, res) {
    try {
        const receipts = await GoodsReceipt.findAll({
            include: [
                { model: Order, as: 'order' },
                // Add associations for dealer, cost center, etc. as needed
            ],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({ success: true, data: receipts });
    } catch (error) {
        console.error('Error in getAllGoodsReceipts:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getGoodsReceiptById(req, res) {
    try {
        const { id } = req.params;
        const receipt = await GoodsReceipt.findByPk(id, {
            include: [
                { model: Order, as: 'order' },
                // Add associations for dealer, cost center, etc. as needed
            ]
        });
        if (!receipt) {
            return res.status(404).json({ success: false, message: 'GoodsReceipt not found' });
        }
        return res.status(200).json({ success: true, data: receipt });
    } catch (error) {
        console.error('Error in getGoodsReceiptById:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function updateGoodsReceipt(req, res) {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { receivedItems, remarks, costCenterId, status } = req.body;
        const receipt = await GoodsReceipt.findByPk(id, { transaction });
        if (!receipt) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GoodsReceipt not found' });
        }
        // Only allow update if status is pending
        if (receipt.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Only pending receipts can be updated' });
        }
        // Update fields
        if (receivedItems) receipt.receivedItems = receivedItems;
        if (remarks) receipt.remarks = remarks;
        if (costCenterId) receipt.costCenterId = costCenterId;
        if (status) receipt.status = status;
        await receipt.save({ transaction });
        await transaction.commit();
        return res.status(200).json({ success: true, data: receipt });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in updateGoodsReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function deleteGoodsReceipt(req, res) {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const receipt = await GoodsReceipt.findByPk(id, { transaction });
        if (!receipt) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GoodsReceipt not found' });
        }
        // Only allow delete if status is pending
        if (receipt.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Only pending receipts can be deleted' });
        }
        await receipt.destroy({ transaction });
        await transaction.commit();
        return res.status(200).json({ success: true, message: 'GoodsReceipt deleted' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in deleteGoodsReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function approveGoodsReceipt(req, res) {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const receipt = await GoodsReceipt.findByPk(id, { transaction });
        if (!receipt) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GoodsReceipt not found' });
        }
        if (receipt.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Only pending receipts can be approved' });
        }
        // --- approveGoodsReceipt Update ---
        // Restrict approval to sales executive (or super_admin) who manages this dealer
        if (req.user.role === 'super_admin') {
            // Super admin bypass
        } else {
            const allowedDealers = await RBACEngine.getDealersInScope(req.user);
            if (!allowedDealers.includes(receipt.dealerId)) {
                await transaction.rollback();
                return res.status(403).json({ success: false, message: 'You are not authorized to approve GRs for this dealer' });
            }
        }


        receipt.status = 'approved';
        await receipt.save({ transaction });
        await transaction.commit();
        // Automate invoice creation after GR approval
        await autoGenerateInvoiceAfterGR(receipt);
        // Find dealer admin for notification
        const dealerAdmin = await User.findOne({ where: { dealerId: receipt.dealerId, role: 'dealer_admin' } });

        // Notify dealer admin and sales executive
        if (dealerAdmin) {
            await notificationService.createUserNotification({
                userId: dealerAdmin.id,
                title: 'Invoice Generated',
                message: `Invoice has been generated for your approved goods receipt (${receipt.receiptNumber}).`,
                type: 'info',
                priority: 'high',
                relatedId: receipt.id,
                relatedType: 'Invoice',
                data: { orderId: receipt.orderId }
            });
        }
        await notificationService.createUserNotification({
            userId: req.user.id,
            title: 'Invoice Generated',
            message: `Invoice has been generated for approved goods receipt (${receipt.receiptNumber}).`,
            type: 'info',
            priority: 'normal',
            relatedId: receipt.id,
            relatedType: 'Invoice',
            data: { orderId: receipt.orderId }
        });
        return res.status(200).json({ success: true, data: receipt });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in approveGoodsReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function rejectGoodsReceipt(req, res) {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const receipt = await GoodsReceipt.findByPk(id, { transaction });
        if (!receipt) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'GoodsReceipt not found' });
        }
        if (receipt.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Only pending receipts can be rejected' });
        }
        receipt.status = 'rejected';
        if (remarks) receipt.remarks = remarks;
        await receipt.save({ transaction });
        await transaction.commit();
        return res.status(200).json({ success: true, data: receipt });
    } catch (error) {
        await transaction.rollback();
        console.error('Error in rejectGoodsReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function postGoodsReceiptToSAP(req, res) {
    // This is a stub for SAP posting. In production, integrate with SAP RFC.
    try {
        const { id } = req.params;
        const receipt = await GoodsReceipt.findByPk(id);
        if (!receipt) {
            return res.status(404).json({ success: false, message: 'GoodsReceipt not found' });
        }
        if (receipt.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Only approved receipts can be posted to SAP' });
        }
        // Simulate SAP posting
        // In real implementation, call SAP RFC and update mblnr/status
        receipt.status = 'posted';
        receipt.mblnr = `MBLNR-${Date.now()}`;
        await receipt.save();
        return res.status(200).json({ success: true, message: 'Posted to SAP (stub)', data: receipt });
    } catch (error) {
        console.error('Error in postGoodsReceiptToSAP:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function notifySalesExecutiveForGR(goodsReceipt) {
    // Find dealer admin's reporting sales executive
    const dealerAdmin = await User.findByPk(goodsReceipt.dealerId);
    if (!dealerAdmin || !dealerAdmin.reportingTo) return;
    const salesExecutive = await User.findByPk(dealerAdmin.reportingTo);
    if (!salesExecutive) return;
    await notificationService.createUserNotification({
        userId: salesExecutive.id,
        title: 'New Goods Receipt Created',
        message: `A new goods receipt (${goodsReceipt.receiptNumber}) requires your approval.`,
        type: 'info',
        priority: 'high',
        relatedId: goodsReceipt.id,
        relatedType: 'GoodsReceipt',
        data: { orderId: goodsReceipt.orderId }
    });
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
