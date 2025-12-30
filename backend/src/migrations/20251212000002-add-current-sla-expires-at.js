// Migration: Add currentSlaExpiresAt to all entity tables
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to safely add column
    const addColumnSafe = async (table, column, options) => {
      try {
        await queryInterface.addColumn(table, column, options);
      } catch (error) {
        if (error.original && (
          error.original.code === '42701' || // duplicate column
          error.message && error.message.includes('already exists')
        )) {
          console.log(`⚠️ Column ${column} already exists in ${table}, skipping...`);
        } else {
          throw error;
        }
      }
    };

    // Add to orders
    await addColumnSafe('orders', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to invoices
    await addColumnSafe('invoices', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to PaymentRequests
    await addColumnSafe('PaymentRequests', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to PricingUpdates
    await addColumnSafe('PricingUpdates', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to documents
    await addColumnSafe('documents', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to Campaigns
    await addColumnSafe('Campaigns', 'currentSlaExpiresAt', {
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

