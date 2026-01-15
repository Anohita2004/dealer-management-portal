'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Add barcode column to materials table
        await queryInterface.addColumn('materials', 'barcode', {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true
        });

        // 2. Create scanned_logs table
        await queryInterface.createTable('scanned_logs', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            barcode: {
                type: Sequelize.STRING,
                allowNull: false
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'Users', // In full-schema-sync, Users table is capitalized
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            scannedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });

        // 3. Create goods_receipts table
        await queryInterface.createTable('goods_receipts', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            receiptNumber: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            orderId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'orders',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            dealerId: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'dealers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            receivedItems: {
                type: Sequelize.JSON,
                allowNull: false
            },
            receivedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            remarks: {
                type: Sequelize.TEXT
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('goods_receipts');
        await queryInterface.dropTable('scanned_logs');
        await queryInterface.removeColumn('materials', 'barcode');
    }
};
