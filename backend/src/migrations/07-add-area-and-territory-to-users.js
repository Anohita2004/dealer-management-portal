'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'areaId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'territoryId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    // Add foreign key constraints
    await queryInterface.addConstraint('Users', {
      fields: ['areaId'],
      type: 'foreign key',
      name: 'users_areaId_fk',
      references: {
        table: 'areas',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('Users', {
      fields: ['territoryId'],
      type: 'foreign key',
      name: 'users_territoryId_fk',
      references: {
        table: 'territories',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('Users', 'users_territoryId_fk');
    await queryInterface.removeConstraint('Users', 'users_areaId_fk');

    await queryInterface.removeColumn('Users', 'territoryId');
    await queryInterface.removeColumn('Users', 'areaId');
  }
};
