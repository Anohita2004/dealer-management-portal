'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table (with error handling for existing table)
    try {
      await queryInterface.createTable('user_dealers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
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
        isPrimary: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
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
        console.log('⚠️ Table user_dealers already exists, skipping creation...');
      } else {
        throw error;
      }
    }

    // Add constraint (with error handling for existing constraint)
    try {
      await queryInterface.addConstraint('user_dealers', {
        fields: ['userId', 'dealerId'],
        type: 'unique',
        name: 'user_dealers_user_dealer_unique',
      });
    } catch (error) {
      if (error.original && (
        error.original.code === '42P07' || // duplicate object
        error.original.code === '23505' || // unique violation
        error.message && error.message.includes('already exists')
      )) {
        console.log('⚠️ Constraint user_dealers_user_dealer_unique already exists, skipping...');
      } else {
        throw error;
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_dealers');
  },
};


