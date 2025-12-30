'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table (with error handling for existing table)
    try {
      await queryInterface.createTable('region_materials', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      regionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'regions',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      materialId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    } catch (error) {
      if (error.original && error.original.code === '42P01') {
        // Table already exists, skip
        console.log('⚠️ Table region_materials already exists, skipping creation...');
      } else {
        throw error;
      }
    }

    // Add constraint (with error handling for existing constraint)
    try {
      await queryInterface.addConstraint('region_materials', {
        fields: ['regionId', 'materialId'],
        type: 'unique',
        name: 'region_materials_region_material_unique',
      });
    } catch (error) {
      if (error.original && (
        error.original.code === '42P07' || // duplicate object
        error.original.code === '23505' || // unique violation
        error.message && error.message.includes('already exists')
      )) {
        console.log('⚠️ Constraint region_materials_region_material_unique already exists, skipping...');
      } else {
        throw error;
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('region_materials');
  },
};


