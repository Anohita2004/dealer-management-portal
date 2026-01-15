'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Create rakes table
        await queryInterface.createTable('rakes', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            rakeNumber: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            arrivalDate: {
                type: Sequelize.DATE,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('Pending', 'In Transit', 'Arrived', 'Unloading', 'Completed'),
                defaultValue: 'Pending'
            },
            source: Sequelize.STRING,
            destination: Sequelize.STRING,
            totalQuantity: Sequelize.DECIMAL(15, 2),
            damagedQuantity: {
                type: Sequelize.DECIMAL(15, 2),
                defaultValue: 0
            },
            approvalStatus: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected'),
                defaultValue: 'pending'
            },
            approvedBy: {
                type: Sequelize.UUID,
                allowNull: true
            },
            exceptions: Sequelize.TEXT,
            regionId: {
                type: Sequelize.UUID,
                allowNull: true
            },
            createdAt: Sequelize.DATE,
            updatedAt: Sequelize.DATE
        });

        // 2. Create railway_receipts table
        await queryInterface.createTable('railway_receipts', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            rrNumber: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            rrDate: {
                type: Sequelize.DATE,
                allowNull: false
            },
            rakeId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'rakes',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            consignor: Sequelize.STRING,
            consignee: Sequelize.STRING,
            freightAmount: Sequelize.DECIMAL(15, 2),
            weight: Sequelize.DECIMAL(15, 2),
            createdAt: Sequelize.DATE,
            updatedAt: Sequelize.DATE
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('railway_receipts');
        await queryInterface.dropTable('rakes');
    }
};
