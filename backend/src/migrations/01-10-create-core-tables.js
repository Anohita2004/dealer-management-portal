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
        // Dependencies: roles, sales_groups, regions(00), territories(01).
        // Note: 'areas' is created in 04, so we created the column but CANNOT add the constraint yet.
        // Note: 'dealers' is created in 02 (or my patch), so we can't Link dealerId yet.
        await queryInterface.createTable('Users', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            username: { type: Sequelize.STRING, allowNull: false, unique: true },
            email: { type: Sequelize.STRING, allowNull: false, unique: true },
            password: { type: Sequelize.STRING, allowNull: false },

            roleId: { type: Sequelize.INTEGER, references: { model: 'roles', key: 'id' } },
            salesGroupId: { type: Sequelize.INTEGER, references: { model: 'sales_groups', key: 'id' } },

            // Regions/Territories (Tables exist)
            regionId: { type: Sequelize.UUID, references: { model: 'regions', key: 'id' } },
            territoryId: { type: Sequelize.UUID, references: { model: 'territories', key: 'id' } },

            // Areas (Table 04 - does not exist yet)
            areaId: { type: Sequelize.UUID }, // No constraint yet

            // Dealers (Table 02 - potentially missing)
            dealerId: { type: Sequelize.UUID }, // No constraint yet

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

            dealerId: { type: Sequelize.UUID }, // Constraint added later if dealer table missing

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
    },

    async down(queryInterface, Sequelize) {
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
