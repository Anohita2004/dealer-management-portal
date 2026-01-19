'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. PhysicalInventories
        await queryInterface.createTable('PhysicalInventories', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            plant: { type: Sequelize.STRING, allowNull: false },
            storage_location: { type: Sequelize.STRING, allowNull: false },
            description: { type: Sequelize.STRING },
            status: {
                type: Sequelize.ENUM('PLANNED', 'IN_PROGRESS', 'REVIEW', 'POSTED', 'CANCELLED'),
                defaultValue: 'PLANNED'
            },
            planned_date: { type: Sequelize.DATEONLY, allowNull: false },
            posted_date: { type: Sequelize.DATE },
            sap_doc_no: { type: Sequelize.STRING },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });

        // 2. InventoryCounts
        await queryInterface.createTable('InventoryCounts', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            physical_inventory_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'PhysicalInventories', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            material_code: { type: Sequelize.STRING, allowNull: false },
            material_desc: { type: Sequelize.STRING },
            batch: { type: Sequelize.STRING },
            book_qty: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
            physical_qty: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
            variance: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
            uom: { type: Sequelize.STRING, defaultValue: 'EA' },
            status: {
                type: Sequelize.ENUM('PENDING', 'COUNTED', 'VERIFIED'),
                defaultValue: 'PENDING'
            },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('InventoryCounts');
        await queryInterface.dropTable('PhysicalInventories');
    }
};
