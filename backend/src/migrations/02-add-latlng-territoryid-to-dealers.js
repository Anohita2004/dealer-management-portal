'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('dealers', 'lat', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('dealers', 'lng', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('dealers', 'territoryId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'territories', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('dealers', 'territoryId');
    await queryInterface.removeColumn('dealers', 'lat');
    await queryInterface.removeColumn('dealers', 'lng');
  }
};
