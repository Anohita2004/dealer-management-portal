'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('territories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      regionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'regions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('territories');
  }
};
