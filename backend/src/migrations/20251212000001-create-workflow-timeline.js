// Migration: Create WorkflowTimeline table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('workflow_timelines', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      entityType: {
        type: Sequelize.ENUM(
          'order',
          'invoice',
          'payment',
          'pricing',
          'document',
          'campaign'
        ),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      stage: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      action: {
        type: Sequelize.ENUM('submitted', 'approved', 'rejected'),
        allowNull: false,
      },
      actorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      slaStart: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      slaEnd: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes
    await queryInterface.addIndex('workflow_timelines', ['entityType', 'entityId'], {
      name: 'workflow_timelines_entity_idx',
    });
    await queryInterface.addIndex('workflow_timelines', ['actorId'], {
      name: 'workflow_timelines_actor_idx',
    });
    await queryInterface.addIndex('workflow_timelines', ['stage'], {
      name: 'workflow_timelines_stage_idx',
    });
    await queryInterface.addIndex('workflow_timelines', ['createdAt'], {
      name: 'workflow_timelines_created_at_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('workflow_timelines');
  },
};

