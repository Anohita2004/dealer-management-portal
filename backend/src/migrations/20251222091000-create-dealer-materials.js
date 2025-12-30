'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table (with error handling for existing table)
    try {
      await queryInterface.createTable('dealer_materials', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        dealerId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'dealers',
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
        price: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: true,
        },
        stockQty: {
          type: Sequelize.INTEGER,
          allowNull: true,
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
        console.log('⚠️ Table dealer_materials already exists, skipping creation...');
      } else {
        throw error;
      }
    }

    // Add constraint (with error handling for existing constraint)
    try {
      await queryInterface.addConstraint('dealer_materials', {
        fields: ['dealerId', 'materialId'],
        type: 'unique',
        name: 'dealer_materials_dealer_material_unique',
      });
    } catch (error) {
      if (error.original && (
        error.original.code === '42P07' || // duplicate object
        error.original.code === '23505' || // unique violation
        error.message && error.message.includes('already exists')
      )) {
        console.log('⚠️ Constraint dealer_materials_dealer_material_unique already exists, skipping...');
      } else {
        throw error;
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('dealer_materials');
  },
};


