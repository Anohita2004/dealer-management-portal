// Migration: Add approval fields to documents table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('documents');
    
    // Create ENUM type if it doesn't exist
    try {
      await queryInterface.sequelize.query(
        "CREATE TYPE \"enum_documents_approvalStatus\" AS ENUM('pending', 'approved', 'rejected');"
      );
    } catch (e) {
      if (!e.message.includes('already exists')) {
        throw e;
      }
    }
    
    if (!tableDescription.approvalStage) {
      await queryInterface.addColumn('documents', 'approvalStage', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableDescription.approvalStatus) {
      await queryInterface.addColumn('documents', 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('documents', 'approvalStage');
    await queryInterface.removeColumn('documents', 'approvalStatus');
  },
};

