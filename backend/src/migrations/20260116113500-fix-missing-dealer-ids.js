'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add dealerId to AccountStatements if it doesn't exist
        const accountStatementsInfo = await queryInterface.describeTable('AccountStatements');
        if (!accountStatementsInfo.dealerId) {
            console.log('Adding dealerId to AccountStatements table...');
            await queryInterface.addColumn('AccountStatements', 'dealerId', {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'dealers', // Note: Table name is usually lowercase plural 'dealers'
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            });
        }

        // Add dealerId to CreditDebitNotes if it doesn't exist
        const creditDebitNotesInfo = await queryInterface.describeTable('CreditDebitNotes');
        if (!creditDebitNotesInfo.dealerId) {
            console.log('Adding dealerId to CreditDebitNotes table...');
            await queryInterface.addColumn('CreditDebitNotes', 'dealerId', {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'dealers',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            });
        }
    },

    async down(queryInterface, Sequelize) {
        // Remove dealerId from AccountStatements
        const accountStatementsInfo = await queryInterface.describeTable('AccountStatements');
        if (accountStatementsInfo.dealerId) {
            await queryInterface.removeColumn('AccountStatements', 'dealerId');
        }

        // Remove dealerId from CreditDebitNotes
        const creditDebitNotesInfo = await queryInterface.describeTable('CreditDebitNotes');
        if (creditDebitNotesInfo.dealerId) {
            await queryInterface.removeColumn('CreditDebitNotes', 'dealerId');
        }
    }
};
