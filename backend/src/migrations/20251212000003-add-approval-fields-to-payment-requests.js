// Migration: Add approval fields to PaymentRequests table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns already exist before adding
    const tableDescription = await queryInterface.describeTable('PaymentRequests');
    
    // Create ENUM type if it doesn't exist
    try {
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_PaymentRequests_approvalStatus\" AS ENUM('pending', 'approved', 'rejected');"
      );
    } catch (e) {
      // ENUM type might already exist, ignore error
      if (!e.message.includes('already exists')) {
        throw e;
      }
    }
    
    if (!tableDescription.approvalStage) {
      await queryInterface.addColumn('PaymentRequests', 'approvalStage', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.approvalStatus) {
      await queryInterface.addColumn('PaymentRequests', 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      });
    }

    if (!tableDescription.rejectionReason) {
      await queryInterface.addColumn('PaymentRequests', 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PaymentRequests', 'approvalStage');
    await queryInterface.removeColumn('PaymentRequests', 'approvalStatus');
    await queryInterface.removeColumn('PaymentRequests', 'rejectionReason');
  },
};

