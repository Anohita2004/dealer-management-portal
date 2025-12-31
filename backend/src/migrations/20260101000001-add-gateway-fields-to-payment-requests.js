'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('PaymentRequests', 'gatewayOrderId', {
            type: Sequelize.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('PaymentRequests', 'gatewayPaymentId', {
            type: Sequelize.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('PaymentRequests', 'gatewaySignature', {
            type: Sequelize.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('PaymentRequests', 'paymentGateway', {
            type: Sequelize.STRING,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('PaymentRequests', 'gatewayOrderId');
        await queryInterface.removeColumn('PaymentRequests', 'gatewayPaymentId');
        await queryInterface.removeColumn('PaymentRequests', 'gatewaySignature');
        await queryInterface.removeColumn('PaymentRequests', 'paymentGateway');
    }
};
