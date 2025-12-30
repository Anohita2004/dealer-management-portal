// Migration: Create WorkflowTimeline table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create table (with error handling for existing table)
    try {
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
    } catch (error) {
      if (error.original && error.original.code === '42P01') {
        // Table already exists, skip
        console.log('⚠️ Table workflow_timelines already exists, skipping creation...');
      } else {
        throw error;
      }
    }

    // Create indexes (with error handling for existing indexes)
    const addIndexSafe = async (table, columns, options) => {
      try {
        await queryInterface.addIndex(table, columns, options);
      } catch (error) {
        if (error.original && error.original.code === '42P07') {
          // Index already exists, skip
          console.log(`⚠️ Index ${options.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    };

    await addIndexSafe('workflow_timelines', ['entityType', 'entityId'], {
      name: 'workflow_timelines_entity_idx',
    });
    await addIndexSafe('workflow_timelines', ['actorId'], {
      name: 'workflow_timelines_actor_idx',
    });
    await addIndexSafe('workflow_timelines', ['stage'], {
      name: 'workflow_timelines_stage_idx',
    });
    await addIndexSafe('workflow_timelines', ['createdAt'], {
      name: 'workflow_timelines_created_at_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('workflow_timelines');
  },
};

