// Migration: Add missing fields to Inventories table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('Inventories');
    
    // Add reorderLevel column
    if (!tableDescription.reorderLevel) {
      await queryInterface.addColumn('Inventories', 'reorderLevel', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      });
    }

    // Add minStock column
    if (!tableDescription.minStock) {
      await queryInterface.addColumn('Inventories', 'minStock', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      });
    }

    // Add price column
    if (!tableDescription.price) {
      await queryInterface.addColumn('Inventories', 'price', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
      });
    }

    // Add description column
    if (!tableDescription.description) {
      await queryInterface.addColumn('Inventories', 'description', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // Add materialNumber column
    if (!tableDescription.materialNumber) {
      await queryInterface.addColumn('Inventories', 'materialNumber', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // Add materialCode column
    if (!tableDescription.materialCode) {
      await queryInterface.addColumn('Inventories', 'materialCode', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Inventories', 'reorderLevel');
    await queryInterface.removeColumn('Inventories', 'minStock');
    await queryInterface.removeColumn('Inventories', 'price');
    await queryInterface.removeColumn('Inventories', 'description');
    await queryInterface.removeColumn('Inventories', 'materialNumber');
    await queryInterface.removeColumn('Inventories', 'materialCode');
  },
};

