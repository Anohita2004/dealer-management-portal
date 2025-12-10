'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dealers', 'areaId', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addConstraint('dealers', {
      fields: ['areaId'],
      type: 'foreign key',
      name: 'dealers_areaId_fk',
      references: {
        table: 'areas',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('dealers', 'dealers_areaId_fk');
    await queryInterface.removeColumn('dealers', 'areaId');
  }
};
