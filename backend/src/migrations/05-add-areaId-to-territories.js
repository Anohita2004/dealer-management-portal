'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('territories', 'areaId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addConstraint('territories', {
      fields: ['areaId'],
      type: 'foreign key',
      name: 'territories_areaId_fk',
      references: {
        table: 'areas',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('territories', 'territories_areaId_fk');
    await queryInterface.removeColumn('territories', 'areaId');
  }
};
