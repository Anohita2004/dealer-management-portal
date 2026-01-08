'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const safeAdd = async (table, column, props) => {
      try {
        await queryInterface.addColumn(table, column, props);
      } catch (e) {
        console.log(`⚠️ Skipping existing column ${table}.${column}`);
      }
    };

    // ---------------------------------
    // DEALERS – Onboarding workflow
    // ---------------------------------
    await safeAdd('dealers', 'status', {
      type: Sequelize.ENUM(
        'pending_approval',
        'active',
        'suspended',
        'terminated'
      ),
      allowNull: false,
      defaultValue: 'pending_approval',
    });

    await safeAdd('dealers', 'approvalStage', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await safeAdd('dealers', 'approvalStatus', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    });

    await safeAdd('dealers', 'approvedBy', {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await safeAdd('dealers', 'approvedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await safeAdd('dealers', 'rejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await safeAdd('dealers', 'currentSlaExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    const safeRemove = async (table, column) => {
      try {
        await queryInterface.removeColumn(table, column);
      } catch (e) {
        console.log(`⚠️ Skipping missing column ${table}.${column}`);
      }
    };

    const cols = [
      'status',
      'approvalStage',
      'approvalStatus',
      'approvedBy',
      'approvedAt',
      'rejectionReason',
      'currentSlaExpiresAt',
    ];

    for (const col of cols) {
      await safeRemove('dealers', col);
    }
  },
};


