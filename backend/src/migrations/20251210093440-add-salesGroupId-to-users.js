'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('Users', 'salesGroupId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sales_groups',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    } catch (error) {
      console.log('ℹ️ Column salesGroupId already exists on Users, skipping.');
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('Users', 'salesGroupId');
    } catch (e) { }
  }
};
