// Migration: Add approval fields to PricingUpdates table (Fixed for Case Sensitivity and Missing Table)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Identify the correct table name
    let tableName = 'pricing_updates';
    let tableExists = false;

    // Try finding the table
    try {
      await queryInterface.describeTable(tableName);
      tableExists = true;
    } catch (e) {
      try {
        tableName = 'PricingUpdates';
        await queryInterface.describeTable(tableName);
        tableExists = true;
      } catch (e2) {
        console.log('🚧 PricingUpdates table missing. Creating it now...');
      }
    }

    if (!tableExists) {
      // Create table from scratch matching the expected model
      await queryInterface.createTable('pricing_updates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        productGroup: { type: Sequelize.STRING },
        materialId: { type: Sequelize.UUID }, // nullable if matches group
        dealerId: { type: Sequelize.UUID },   // nullable if matches region
        regionId: { type: Sequelize.UUID },

        oldPrice: { type: Sequelize.DECIMAL(10, 2) },
        newPrice: { type: Sequelize.DECIMAL(10, 2) },
        effectiveDate: { type: Sequelize.DATE },

        // Approval fields
        approvalStage: { type: Sequelize.STRING, allowNull: true },
        approvalStatus: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected'),
          defaultValue: 'pending',
          allowNull: false
        },
        rejectionReason: { type: Sequelize.TEXT, allowNull: true },
        currentSlaExpiresAt: { type: Sequelize.DATE, allowNull: true },

        createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
      });
      return; // Done
    }

    // 2. Add columns to the detected table
    const tableDescription = await queryInterface.describeTable(tableName);

    if (!tableDescription.approvalStage) {
      await queryInterface.addColumn(tableName, 'approvalStage', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.approvalStatus) {
      await queryInterface.addColumn(tableName, 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      });
    }

    if (!tableDescription.rejectionReason) {
      await queryInterface.addColumn(tableName, 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No revert needed
  },
};
