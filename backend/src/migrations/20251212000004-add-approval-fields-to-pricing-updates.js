// Migration: Add approval fields to PricingUpdates table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('PricingUpdates');
    
    // Create ENUM type if it doesn't exist
    try {
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_PricingUpdates_approvalStatus\" AS ENUM('pending', 'approved', 'rejected');"
      );
    } catch (e) {
      if (!e.message.includes('already exists')) {
        throw e;
      }
    }
    
    if (!tableDescription.approvalStage) {
      await queryInterface.addColumn('PricingUpdates', 'approvalStage', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.approvalStatus) {
      await queryInterface.addColumn('PricingUpdates', 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      });
    }

    if (!tableDescription.rejectionReason) {
      await queryInterface.addColumn('PricingUpdates', 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PricingUpdates', 'approvalStage');
    await queryInterface.removeColumn('PricingUpdates', 'approvalStatus');
    await queryInterface.removeColumn('PricingUpdates', 'rejectionReason');
  },
};

