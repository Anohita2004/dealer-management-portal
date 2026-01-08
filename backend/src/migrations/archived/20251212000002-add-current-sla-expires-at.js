// Migration: Add currentSlaExpiresAt to all entity tables (Robust Fix)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to safely add column
    const addColumnSafe = async (possibleTableNames, column, options) => {
      let tableName = null;

      // Find the correct table name from the list of possibilities
      for (const name of possibleTableNames) {
        try {
          const tableExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public."${name}"')`,
            { type: Sequelize.QueryTypes.SELECT }
          );
          if (tableExists[0] && tableExists[0].to_regclass) {
            tableName = name;
            break;
          }
        } catch (e) { continue; }
      }

      if (!tableName) {
        console.log(`⚠️ Could not find table matching ${possibleTableNames.join(' or ')}. Skipping SLA column add.`);
        return;
      }

      // Add column
      try {
        await queryInterface.addColumn(tableName, column, options);
      } catch (error) {
        console.log(`⚠️ Column ${column} add issue in ${tableName} (likely exists):`, error.message);
      }
    };

    // Add to orders
    await addColumnSafe(['orders', 'Orders'], 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to invoices
    await addColumnSafe(['invoices', 'Invoices'], 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to PaymentRequests
    await addColumnSafe(['payment_requests', 'PaymentRequests'], 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to PricingUpdates
    await addColumnSafe(['pricing_updates', 'PricingUpdates'], 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to documents
    await addColumnSafe(['documents', 'Documents'], 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add to Campaigns
    await addColumnSafe(['campaigns', 'Campaigns'], 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // No revert needed
  },
};
