// Migration: Add approval fields to Campaigns table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Campaigns');
    
    // Create ENUM type if it doesn't exist
    try {
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_Campaigns_approvalStatus\" AS ENUM('pending', 'approved', 'rejected');"
      );
    } catch (e) {
      if (!e.message.includes('already exists')) {
        throw e;
      }
    }
    
    if (!tableDescription.approvalStage) {
      await queryInterface.addColumn('Campaigns', 'approvalStage', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.approvalStatus) {
      await queryInterface.addColumn('Campaigns', 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      });
    }

    if (!tableDescription.rejectionReason) {
      await queryInterface.addColumn('Campaigns', 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableDescription.currentSlaExpiresAt) {
      await queryInterface.addColumn('Campaigns', 'currentSlaExpiresAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Campaigns', 'approvalStage');
    await queryInterface.removeColumn('Campaigns', 'approvalStatus');
    await queryInterface.removeColumn('Campaigns', 'rejectionReason');
    await queryInterface.removeColumn('Campaigns', 'currentSlaExpiresAt');
  },
};

