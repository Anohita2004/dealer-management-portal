'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('regions', 'geojson', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('regions', 'centroidLat', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn('regions', 'centroidLng', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('regions', 'geojson');
    await queryInterface.removeColumn('regions', 'centroidLat');
    await queryInterface.removeColumn('regions', 'centroidLng');
  }
};
