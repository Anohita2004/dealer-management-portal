'use strict';

/**
 * BASELINE MIGRATION FOR RAILWAY DEPLOYMENT
 * 
 * This migration creates the core tables that were likely created via `sequelize.sync()` 
 * in the development environment and are missing from the migration history.
 * 
 * It is positioned to run after `01-create-territories` but before `02-add-latlng-dealers`.
 */

module.exports = {
    async up(queryInterface, Sequelize) {

        // 1. ROLES
        await queryInterface.createTable('roles', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: Sequelize.STRING, allowNull: false, unique: true },
            category: { type: Sequelize.STRING, allowNull: true },
            description: { type: Sequelize.STRING, allowNull: true },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 2. PERMISSIONS
        await queryInterface.createTable('permissions', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            resource: { type: Sequelize.STRING },
            action: { type: Sequelize.STRING },
            attributes: { type: Sequelize.STRING, defaultValue: '*' },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 3. ROLE PERMISSIONS
        await queryInterface.createTable('rolepermissions', {
            roleId: {
                type: Sequelize.INTEGER,
                references: { model: 'roles', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            permissionId: {
                type: Sequelize.INTEGER,
                references: { model: 'permissions', key: 'id' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 4. SALES GROUPS
        await queryInterface.createTable('sales_groups', {
            id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.STRING },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 5. USERS
        await queryInterface.createTable('Users', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            username: { type: Sequelize.STRING, allowNull: false, unique: true },
            email: { type: Sequelize.STRING, allowNull: false, unique: true },
            password: { type: Sequelize.STRING, allowNull: false },

            roleId: { type: Sequelize.INTEGER, references: { model: 'roles', key: 'id' } },
            salesGroupId: { type: Sequelize.INTEGER, references: { model: 'sales_groups', key: 'id' } },

            regionId: { type: Sequelize.UUID, references: { model: 'regions', key: 'id' } },
            territoryId: { type: Sequelize.UUID, references: { model: 'territories', key: 'id' } },
            areaId: { type: Sequelize.UUID },
            dealerId: { type: Sequelize.UUID },

            managerId: { type: Sequelize.UUID, references: { model: 'Users', key: 'id' } },

            phoneNumber: { type: Sequelize.STRING },
            isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
            isBlocked: { type: Sequelize.BOOLEAN, defaultValue: false },
            lastLogin: { type: Sequelize.DATE },
            otp: { type: Sequelize.STRING },
            otpExpiry: { type: Sequelize.DATE },
            role: { type: Sequelize.STRING }, // Legacy enum

            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 6. INVOICES
        await queryInterface.createTable('invoices', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            invoiceNumber: { type: Sequelize.STRING, allowNull: false, unique: true },
            amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
            status: { type: Sequelize.ENUM('pending', 'paid', 'overdue', 'cancelled'), defaultValue: 'pending' },
            dueDate: { type: Sequelize.DATE },
            dealerId: { type: Sequelize.UUID },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 7. DOCUMENTS
        await queryInterface.createTable('documents', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            title: { type: Sequelize.STRING },
            type: { type: Sequelize.STRING },
            url: { type: Sequelize.STRING },
            dealerId: { type: Sequelize.UUID },
            status: { type: Sequelize.STRING, defaultValue: 'active' },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 8. PAYMENT REQUESTS
        await queryInterface.createTable('payment_requests', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            amount: { type: Sequelize.DECIMAL(15, 2) },
            status: { type: Sequelize.STRING, defaultValue: 'pending' },
            dealerId: { type: Sequelize.UUID },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });

        // 9. ORDERS (Adding this to fix the missing relation error)
        await queryInterface.createTable('orders', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            dealerId: { type: Sequelize.UUID, allowNull: false }, // Constraint added later if needed
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

        // 10. ORDER ITEMS
        await queryInterface.createTable('order_items', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            orderId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'orders', key: 'id' },
                onDelete: 'CASCADE'
            },
            materialId: { type: Sequelize.UUID, allowNull: false }, // Ref to material if exists
            qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
            unitPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
            lineTotal: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
            createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
            updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('order_items');
        await queryInterface.dropTable('orders');
        await queryInterface.dropTable('payment_requests');
        await queryInterface.dropTable('documents');
        await queryInterface.dropTable('invoices');
        await queryInterface.dropTable('Users');
        await queryInterface.dropTable('sales_groups');
        await queryInterface.dropTable('rolepermissions');
        await queryInterface.dropTable('permissions');
        await queryInterface.dropTable('roles');
    }
};
