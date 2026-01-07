// Migration: Add missing fields to Inventories (Fixed for case and missing table)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // 1. Determine correct table name & existence
    let tableName = 'inventories';
    let tableExists = false;

    try {
      await queryInterface.describeTable(tableName);
      tableExists = true;
    } catch (e) {
      try {
        tableName = 'Inventories';
        await queryInterface.describeTable(tableName);
        tableExists = true;
      } catch (e2) {
        console.log('🚧 Inventories table missing. Creating it now...');
      }
    }

    // 2. Create if missing
    if (!tableExists) {
      await queryInterface.createTable('inventories', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        dealerId: { type: Sequelize.UUID },
        productId: { type: Sequelize.UUID },
        quantity: { type: Sequelize.INTEGER, defaultValue: 0 },

        // New fields
        reorderLevel: { type: Sequelize.INTEGER, defaultValue: 0 },
        minStock: { type: Sequelize.INTEGER, defaultValue: 0 },
        price: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
        description: { type: Sequelize.TEXT },
        materialNumber: { type: Sequelize.STRING },
        materialCode: { type: Sequelize.STRING },

        createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
      });
      return;
    }

    // 3. Add Columns to existing table
    const tableDescription = await queryInterface.describeTable(tableName);

    // Helper to add if missing
    const addIfMissing = async (colName, opts) => {
      if (!tableDescription[colName]) {
        try {
          await queryInterface.addColumn(tableName, colName, opts);
        } catch (e) { console.log(`Skipping ${colName} (already exists probably)`); }
      }
    };

    await addIfMissing('reorderLevel', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
    await addIfMissing('minStock', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
    await addIfMissing('price', { type: Sequelize.DECIMAL(12, 2), allowNull: true, defaultValue: 0 });
    await addIfMissing('description', { type: Sequelize.TEXT, allowNull: true });
    await addIfMissing('materialNumber', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('materialCode', { type: Sequelize.STRING, allowNull: true });
  },

  down: async (queryInterface, Sequelize) => {
    // No revert needed
  },
};
