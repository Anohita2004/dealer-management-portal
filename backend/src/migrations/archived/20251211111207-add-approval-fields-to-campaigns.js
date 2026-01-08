'use strict';

/**
 * FIX CAMPAIGNS MIGRATION FOR RAILWAY
 * 
 * Strategy: Create table if missing, otherwise patch columns safely.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'Campaigns';

    // 1. Check if table exists
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."${tableName}"')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0] || !tableExists[0].to_regclass) {
      console.log(`🚧 "${tableName}" table missing. Creating it now...`);

      // Create table with ALL necessary fields (merging logic)
      await queryInterface.createTable(tableName, {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        campaignName: { type: Sequelize.STRING, allowNull: false },
        campaignType: {
          type: Sequelize.ENUM('promotion', 'sales_scheme', 'seasonal_offer'),
          allowNull: false
        },
        description: Sequelize.TEXT,
        startDate: { type: Sequelize.DATE, allowNull: false },
        endDate: { type: Sequelize.DATE, allowNull: false },
        productGroup: Sequelize.STRING,
        discountPercentage: Sequelize.DECIMAL(5, 2),
        discountAmount: Sequelize.DECIMAL(15, 2),
        targetAudience: Sequelize.JSON,
        isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
        terms: Sequelize.TEXT,
        bannerImage: Sequelize.STRING,
        areaId: { type: Sequelize.UUID, allowNull: true },

        // Approval workflow fields
        approvalStage: {
          type: Sequelize.ENUM('area_manager', 'regional_admin', 'super_admin'),
          allowNull: true
        },
        approvalStatus: {
          type: Sequelize.ENUM('pending', 'approved', 'rejected'),
          defaultValue: 'pending',
          allowNull: false
        },
        approvedBy: Sequelize.STRING,
        approvedAt: Sequelize.DATE,
        rejectionReason: Sequelize.TEXT,
        currentSlaExpiresAt: Sequelize.DATE,

        createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
      });
      return;
    }

    // 2. If table exists, proceed with SAFE column addition
    try {
      await queryInterface.addColumn(tableName, 'approvalStage', {
        type: Sequelize.ENUM('area_manager', 'regional_admin', 'super_admin'),
        allowNull: true
      });
    } catch (e) { console.log('approvalStage exists, skipping'); }

    try {
      await queryInterface.addColumn(tableName, 'approvalStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      });
    } catch (e) { console.log('approvalStatus exists, skipping'); }

    try {
      await queryInterface.addColumn(tableName, 'approvedBy', { type: Sequelize.STRING, allowNull: true });
    } catch (e) { console.log('approvedBy exists, skipping'); }

    try {
      await queryInterface.addColumn(tableName, 'approvedAt', { type: Sequelize.DATE, allowNull: true });
    } catch (e) { console.log('approvedAt exists, skipping'); }

    try {
      await queryInterface.addColumn(tableName, 'rejectionReason', { type: Sequelize.TEXT, allowNull: true });
    } catch (e) { console.log('rejectionReason exists, skipping'); }
  },

  async down(queryInterface, Sequelize) {
    // No revert necessary
  }
};
