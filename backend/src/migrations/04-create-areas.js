'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('areas', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      regionId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      geojson: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      centroidLat: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      centroidLng: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      }
    });

    // Add foreign key constraint
    await queryInterface.addConstraint('areas', {
      fields: ['regionId'],
      type: 'foreign key',
      name: 'areas_regionId_fk',
      references: {
        table: 'regions',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('areas');
  }
};
