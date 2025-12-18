'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('invoices', 'approvalStage', {
      type: Sequelize.ENUM('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'),
      allowNull: true,
    });

    await queryInterface.addColumn('invoices', 'approvalStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn('invoices', 'approvedBy', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('invoices', 'approvedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('invoices', 'rejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('invoices', 'approvalStage');
    await queryInterface.removeColumn('invoices', 'approvalStatus');
    await queryInterface.removeColumn('invoices', 'approvedBy');
    await queryInterface.removeColumn('invoices', 'approvedAt');
    await queryInterface.removeColumn('invoices', 'rejectionReason');
  }
};
