'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('InsuranceClaims', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            delivery_order_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: { model: 'DeliveryOrders', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            material_code: { type: Sequelize.STRING, allowNull: false },
            quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
            reason: {
                type: Sequelize.ENUM('DAMAGED_IN_TRANSIT', 'SHORT_SUPPLY', 'WRONG_MATERIAL', 'OTHER'),
                allowNull: false
            },
            description: { type: Sequelize.TEXT },
            status: {
                type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SETTLED'),
                defaultValue: 'DRAFT'
            },
            evidence_urls: { type: Sequelize.JSONB, defaultValue: [] },
            sap_claim_id: { type: Sequelize.STRING },
            resolution_amount: { type: Sequelize.DECIMAL(15, 2) },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('InsuranceClaims');
    }
};
