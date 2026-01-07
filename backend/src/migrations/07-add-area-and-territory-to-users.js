'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add 'areaId' column (redundancy check for baseline migration)
    try {
      await queryInterface.addColumn('Users', 'areaId', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    } catch (error) {
      // Ignore "column already exists"
      console.log('ℹ️ Column areaId already exists on Users, skipping add.');
    }

    // 2. Add 'territoryId' column
    try {
      await queryInterface.addColumn('Users', 'territoryId', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    } catch (error) {
      console.log('ℹ️ Column territoryId already exists on Users, skipping add.');
    }

    // 3. Add foreign key constraints (only if they don't exist)
    // Checking constraints is harder across dialects, so we wrap in try/catch 
    // expecting "duplicate constraint" errors if re-run.

    try {
      await queryInterface.addConstraint('Users', {
        fields: ['areaId'],
        type: 'foreign key',
        name: 'users_areaId_fk',
        references: { table: 'areas', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      console.log('ℹ️ Constraint users_areaId_fk likely exists, skipping.');
    }

    try {
      await queryInterface.addConstraint('Users', {
        fields: ['territoryId'],
        type: 'foreign key',
        name: 'users_territoryId_fk',
        references: { table: 'territories', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      console.log('ℹ️ Constraint users_territoryId_fk likely exists, skipping.');
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeConstraint('Users', 'users_territoryId_fk');
    } catch (e) { }
    try {
      await queryInterface.removeConstraint('Users', 'users_areaId_fk');
    } catch (e) { }
    try {
      await queryInterface.removeColumn('Users', 'territoryId');
    } catch (e) { }
    try {
      await queryInterface.removeColumn('Users', 'areaId');
    } catch (e) { }
  }
};
