'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('dealers');

        const columnsToAdd = [
            { name: 'bankName', type: Sequelize.STRING },
            { name: 'bankAccountNumber', type: Sequelize.STRING },
            { name: 'bankIFSC', type: Sequelize.STRING },
            { name: 'paymentTerms', type: Sequelize.STRING },
            { name: 'creditLimit', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            { name: 'outstandingAmount', type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
            { name: 'territory', type: Sequelize.STRING },
            { name: 'sapCustomerNumber', type: Sequelize.STRING },
            { name: 'sapVendorNumber', type: Sequelize.STRING },
            { name: 'isBlocked', type: Sequelize.BOOLEAN, defaultValue: false },
            { name: 'blockReason', type: Sequelize.TEXT },
            { name: 'isVerified', type: Sequelize.BOOLEAN, defaultValue: false },
            { name: 'managerId', type: Sequelize.UUID, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
            { name: 'licenseNumber', type: Sequelize.STRING },
            { name: 'licenseDocument', type: Sequelize.STRING },
            { name: 'verifiedBy', type: Sequelize.STRING },
            { name: 'verifiedAt', type: Sequelize.DATE },
            { name: 'licenses', type: Sequelize.JSON }
        ];

        for (const column of columnsToAdd) {
            if (!tableInfo[column.name]) {
                await queryInterface.addColumn('dealers', column.name, {
                    type: column.type,
                    defaultValue: column.defaultValue,
                    references: column.references,
                    onUpdate: column.onUpdate,
                    onDelete: column.onDelete
                });
            }
        }
    },

    async down(queryInterface, Sequelize) {
        const columnsToRemove = [
            'bankName', 'bankAccountNumber', 'bankIFSC', 'paymentTerms',
            'creditLimit', 'outstandingAmount', 'territory',
            'sapCustomerNumber', 'sapVendorNumber',
            'isBlocked', 'blockReason', 'isVerified',
            'managerId', 'licenseNumber', 'licenseDocument',
            'verifiedBy', 'verifiedAt', 'licenses'
        ];

        for (const col of columnsToRemove) {
            await queryInterface.removeColumn('dealers', col);
        }
    }
};
