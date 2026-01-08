'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 0. CREATE dealers TABLE
    // This is a "baseline" migration for the Dealers table if it doesn't exist.
    // In a mature project, this should have been Migration #00 or so.
    // Since we are running migrations on an empty DB in Railway, we must ensure the table exists first.

    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.dealers')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Check results based on dialect (Postgres)
    if (!tableExists[0] || !tableExists[0].to_regclass) {
      console.log('🚧 "dealers" table missing. Creating base table now...');
      await queryInterface.createTable('dealers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        dealerCode: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
        businessName: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        contactPerson: { type: Sequelize.STRING },
        email: { type: Sequelize.STRING },
        phoneNumber: { type: Sequelize.STRING },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING },
        state: { type: Sequelize.STRING },
        pincode: { type: Sequelize.STRING },
        gstNumber: { type: Sequelize.STRING },
        panNumber: { type: Sequelize.STRING },
        // Add minimal required fields for creation
        status: {
          type: Sequelize.ENUM('pending_approval', 'active', 'suspended', 'terminated'),
          defaultValue: 'pending_approval'
        },
        isActive: { type: Sequelize.BOOLEAN, defaultValue: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
    }

    // 1. Add 'lat' column
    try {
      await queryInterface.addColumn('dealers', 'lat', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    } catch (e) {
      // Ignore if column already exists
    }

    // 2. Add 'lng' column
    try {
      await queryInterface.addColumn('dealers', 'lng', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    } catch (e) {
      // Ignore
    }

    // 3. Add 'territoryId'
    try {
      await queryInterface.addColumn('dealers', 'territoryId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'territories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    } catch (e) {
      // Ignore
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('dealers', 'territoryId');
      await queryInterface.removeColumn('dealers', 'lat');
      await queryInterface.removeColumn('dealers', 'lng');
    } catch (e) {
      console.error('Migration rollback error', e);
    }
  }
};
