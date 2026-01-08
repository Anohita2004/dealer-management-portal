// Migration: Add approval fields to PaymentRequests table (Fixed for Case Sensitivity)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Identify the correct table name
    // Postgres is case-sensitive if quoted. Our baseline created "payment_requests" (snake_case).
    // The legacy code looks for "PaymentRequests".

    // We try to check "payment_requests" first.
    let tableName = 'payment_requests';
    let tableExists = false;

    try {
      await queryInterface.describeTable(tableName);
      tableExists = true;
    } catch (e) {
      // Fallback: try "PaymentRequests" just in case other migrations created it that way
      try {
        tableName = 'PaymentRequests';
        await queryInterface.describeTable(tableName);
        tableExists = true;
      } catch (e2) {
        // Both failed. We must create it.
        console.log('🚧 payment_requests table missing. Creating it now...');
      }
    }

    if (!tableExists) {
      // Create table from scratch
      await queryInterface.createTable('payment_requests', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        amount: { type: Sequelize.DECIMAL(15, 2) },
        status: { type: Sequelize.STRING, defaultValue: 'pending' },
        dealerId: { type: Sequelize.UUID },

        // New fields directly here
        approvalStage: { type: Sequelize.STRING, allowNull: true },
        approvalStatus: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected'),
          defaultValue: 'pending',
          allowNull: false
        },
        rejectionReason: { type: Sequelize.TEXT, allowNull: true },

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
    // No revert necessary
  },
};
