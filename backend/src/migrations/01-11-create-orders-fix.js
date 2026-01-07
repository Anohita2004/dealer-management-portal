'use strict';

/**
 * FIX MIGRATION FOR RAILWAY DEPLOYMENT
 * 
 * This specifically targets the missing 'orders' table and any other tables 
 * that might have been missed if the previous 01-10 migration ran partially or skipped.
 */

module.exports = {
    async up(queryInterface, Sequelize) {

        // 1. ORDERS
        // Check if table exists first to avoid errors
        const tableExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public.orders')`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!tableExists[0] || !tableExists[0].to_regclass) {
            console.log('🚧 "orders" table missing. Creating it now...');
            await queryInterface.createTable('orders', {
                id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
                dealerId: { type: Sequelize.UUID, allowNull: false },
                orderNumber: { type: Sequelize.STRING, allowNull: false, unique: true },
                status: {
                    type: Sequelize.ENUM('Pending', 'Approved', 'Rejected', 'Pending Approval', 'Processing', 'Shipped', 'In Transit', 'Delivered', 'Cancelled'),
                    defaultValue: "Pending"
                },
                totalAmount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
                notes: { type: Sequelize.TEXT },

                // Approval fields
                approvalStage: { type: Sequelize.STRING },
                approvalStatus: { type: Sequelize.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
                approvedBy: { type: Sequelize.UUID },
                approvedAt: { type: Sequelize.DATE },
                rejectionReason: { type: Sequelize.STRING },

                createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
                updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
            });
        }

        // 2. ORDER ITEMS
        const itemsTableExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public.order_items')`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!itemsTableExists[0] || !itemsTableExists[0].to_regclass) {
            console.log('🚧 "order_items" table missing. Creating it now...');
            await queryInterface.createTable('order_items', {
                id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
                orderId: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: { model: 'orders', key: 'id' },
                    onDelete: 'CASCADE'
                },
                materialId: { type: Sequelize.UUID, allowNull: false },
                qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
                unitPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
                lineTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
                createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
                updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
            });
        }
    },

    async down(queryInterface, Sequelize) {
        // Only drop if we created them here, but generally safe to leave or drop manually
    }
};
