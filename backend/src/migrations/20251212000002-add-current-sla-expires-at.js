// Migration: Add currentSlaExpiresAt to all entity tables
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add to orders
    await queryInterface.addColumn('orders', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to invoices
    await queryInterface.addColumn('invoices', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to PaymentRequests
    await queryInterface.addColumn('PaymentRequests', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to PricingUpdates
    await queryInterface.addColumn('PricingUpdates', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to documents
    await queryInterface.addColumn('documents', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to Campaigns
    await queryInterface.addColumn('Campaigns', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('orders', 'currentSlaExpiresAt');
    await queryInterface.removeColumn('invoices', 'currentSlaExpiresAt');
    await queryInterface.removeColumn('PaymentRequests', 'currentSlaExpiresAt');
    await queryInterface.removeColumn('PricingUpdates', 'currentSlaExpiresAt');
    await queryInterface.removeColumn('documents', 'currentSlaExpiresAt');
    await queryInterface.removeColumn('Campaigns', 'currentSlaExpiresAt');
  },
};

