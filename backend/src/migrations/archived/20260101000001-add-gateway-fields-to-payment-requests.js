'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Identify table name (handling case sensitivity)
        let tableName = 'payment_requests';
        try {
            await queryInterface.describeTable(tableName);
        } catch (e) {
            try {
                tableName = 'PaymentRequests';
                await queryInterface.describeTable(tableName);
            } catch (e2) {
                // Should exist by now, but just in case
                console.log('Skipping gateway fields: table missing');
                return;
            }
        }

        const tableDescription = await queryInterface.describeTable(tableName);

        if (!tableDescription.gatewayOrderId) {
            await queryInterface.addColumn(tableName, 'gatewayOrderId', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
        if (!tableDescription.gatewayPaymentId) {
            await queryInterface.addColumn(tableName, 'gatewayPaymentId', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
        if (!tableDescription.gatewaySignature) {
            await queryInterface.addColumn(tableName, 'gatewaySignature', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
        if (!tableDescription.paymentGateway) {
            await queryInterface.addColumn(tableName, 'paymentGateway', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        // No revert needed
    }
};
