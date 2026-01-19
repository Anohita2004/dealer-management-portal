'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. StorageLocations
        await queryInterface.createTable('StorageLocations', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            plant: { type: Sequelize.STRING, allowNull: false },
            sloc: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.STRING },
            capacity: { type: Sequelize.INTEGER },
            block_status: { type: Sequelize.BOOLEAN, defaultValue: false },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });

        // 2. LoadingPoints
        await queryInterface.createTable('LoadingPoints', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            code: { type: Sequelize.STRING, allowNull: false },
            shipping_point: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.STRING },
            capacity: { type: Sequelize.INTEGER },
            equipment: { type: Sequelize.STRING },
            availability: { type: Sequelize.BOOLEAN, defaultValue: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });

        // 3. DeliveryOrders
        await queryInterface.createTable('DeliveryOrders', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            likp: { type: Sequelize.STRING, unique: true, allowNull: true },
            vbeln: { type: Sequelize.STRING, allowNull: false },
            storage_location_id: {
                type: Sequelize.UUID,
                references: { model: 'StorageLocations', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            loading_point_id: {
                type: Sequelize.UUID,
                references: { model: 'LoadingPoints', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            delivery_date: { type: Sequelize.DATE },
            status: {
                type: Sequelize.ENUM('DRAFT', 'ALLOCATED', 'SCHEDULED', 'PGI_PENDING', 'COMPLETED'),
                defaultValue: 'DRAFT'
            },
            items: { type: Sequelize.JSONB },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });

        // 4. DockSchedules
        await queryInterface.createTable('DockSchedules', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            loading_point_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'LoadingPoints', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            delivery_order_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'DeliveryOrders', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            scheduled_start: { type: Sequelize.DATE, allowNull: false },
            scheduled_end: { type: Sequelize.DATE, allowNull: false },
            status: {
                type: Sequelize.ENUM('SCHEDULED', 'OCCUPIED', 'COMPLETED', 'CANCELLED'),
                defaultValue: 'SCHEDULED'
            },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('DockSchedules');
        await queryInterface.dropTable('DeliveryOrders');
        await queryInterface.dropTable('LoadingPoints');
        await queryInterface.dropTable('StorageLocations');
    }
};
