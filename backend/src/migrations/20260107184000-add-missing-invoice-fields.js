'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('invoices');

        const columnsToAdd = [
            // Unified Amount System
            { name: 'baseAmount', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            { name: 'taxAmount', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            { name: 'totalAmount', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            { name: 'paidAmount', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            { name: 'balanceAmount', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },

            // Date Fields (Missing invoiceDate!)
            { name: 'invoiceDate', type: Sequelize.DATE, allowNull: true },

            // Metadata
            { name: 'productGroup', type: Sequelize.STRING },
            { name: 'description', type: Sequelize.TEXT },
            { name: 'pdfPath', type: Sequelize.STRING },
            { name: 'sapDocumentNumber', type: Sequelize.STRING },
            { name: 'paymentDate', type: Sequelize.DATE },

            // Approval Workflow
            { name: 'approvalStage', type: Sequelize.STRING },
            { name: 'approvalStatus', type: Sequelize.STRING, defaultValue: 'pending' },
            { name: 'approvedBy', type: Sequelize.STRING },
            { name: 'approvedAt', type: Sequelize.DATE },
            { name: 'rejectionReason', type: Sequelize.TEXT },
            { name: 'currentSlaExpiresAt', type: Sequelize.DATE },
            { name: 'orderId', type: Sequelize.UUID, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }
        ];

        for (const column of columnsToAdd) {
            if (!tableInfo[column.name]) {
                await queryInterface.addColumn('invoices', column.name, {
                    type: column.type,
                    defaultValue: column.defaultValue,
                    allowNull: column.allowNull,
                    references: column.references,
                    onUpdate: column.onUpdate,
                    onDelete: column.onDelete
                });
            }
        }
    },

    async down(queryInterface, Sequelize) {
        const columnsToRemove = [
            'baseAmount', 'taxAmount', 'totalAmount', 'paidAmount', 'balanceAmount',
            'invoiceDate', 'productGroup', 'description', 'pdfPath', 'sapDocumentNumber',
            'paymentDate', 'approvalStage', 'approvalStatus', 'approvedBy', 'approvedAt',
            'rejectionReason', 'currentSlaExpiresAt', 'orderId'
        ];

        for (const col of columnsToRemove) {
            await queryInterface.removeColumn('invoices', col);
        }
    }
};
