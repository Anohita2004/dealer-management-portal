'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'Campaigns';
    
    // Check if columns already exist
    const [columns] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      AND column_name IN ('approvalStage', 'approvalStatus', 'approvedBy', 'approvedAt', 'rejectionReason');
    `);
    
    const existingColumns = columns.map(col => col.column_name);
    
    // Add approvalStage if it doesn't exist
    if (!existingColumns.includes('approvalStage')) {
      await queryInterface.addColumn(tableName, 'approvalStage', {
        type: Sequelize.ENUM('area_manager', 'regional_admin', 'super_admin'),
        allowNull: true
      });
    }
    
    // Add approvalStatus if it doesn't exist
    if (!existingColumns.includes('approvalStatus')) {
      await queryInterface.addColumn(tableName, 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      });
    }
    
    // Add approvedBy if it doesn't exist
    if (!existingColumns.includes('approvedBy')) {
      await queryInterface.addColumn(tableName, 'approvedBy', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    
    // Add approvedAt if it doesn't exist
    if (!existingColumns.includes('approvedAt')) {
      await queryInterface.addColumn(tableName, 'approvedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    
    // Add rejectionReason if it doesn't exist
    if (!existingColumns.includes('rejectionReason')) {
      await queryInterface.addColumn(tableName, 'rejectionReason', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableName = 'Campaigns';
    
    // Check which columns exist before removing
    const [columns] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      AND column_name IN ('approvalStage', 'approvalStatus', 'approvedBy', 'approvedAt', 'rejectionReason');
    `);
    
    const existingColumns = columns.map(col => col.column_name);
    
    // Remove only columns that exist
    if (existingColumns.includes('rejectionReason')) {
      await queryInterface.removeColumn(tableName, 'rejectionReason');
    }
    if (existingColumns.includes('approvedAt')) {
      await queryInterface.removeColumn(tableName, 'approvedAt');
    }
    if (existingColumns.includes('approvedBy')) {
      await queryInterface.removeColumn(tableName, 'approvedBy');
    }
    if (existingColumns.includes('approvalStatus')) {
      await queryInterface.removeColumn(tableName, 'approvalStatus');
    }
    if (existingColumns.includes('approvalStage')) {
      await queryInterface.removeColumn(tableName, 'approvalStage');
    }
    
    // Drop ENUM types if they exist
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Campaigns_approvalStage";
    `);
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Campaigns_approvalStatus";
    `);
  }
};
