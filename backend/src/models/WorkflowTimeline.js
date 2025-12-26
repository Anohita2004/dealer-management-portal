// src/models/WorkflowTimeline.js
// Complete workflow history tracking model

module.exports = (sequelize, DataTypes) => {
  const WorkflowTimeline = sequelize.define(
    'WorkflowTimeline',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // Entity reference
      entityType: {
        type: DataTypes.ENUM(
          'order',
          'invoice',
          'payment',
          'pricing',
          'document',
          'campaign',
          'dealer'
        ),
        allowNull: false,
      },

      entityId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      // Stage information
      stage: {
        type: DataTypes.STRING,
        allowNull: false, // e.g., 'dealer_admin', 'territory_manager', etc.
      },

      // Action taken
      action: {
        type: DataTypes.ENUM('submitted', 'approved', 'rejected'),
        allowNull: false,
      },

      // Actor information
      actorId: {
        type: DataTypes.UUID,
        allowNull: true, // null for system actions
        references: {
          model: 'Users',
          key: 'id',
        },
      },

      // Remarks and rejection reason
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // SLA tracking
      slaStart: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      slaEnd: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // Metadata
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: 'workflow_timelines',
      timestamps: true,
      indexes: [
        {
          fields: ['entityType', 'entityId'],
        },
        {
          fields: ['actorId'],
        },
        {
          fields: ['stage'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    }
  );

  WorkflowTimeline.associate = (models) => {
    WorkflowTimeline.belongsTo(models.User, {
      foreignKey: 'actorId',
      as: 'actor',
      onDelete: 'SET NULL',
    });
  };

  return WorkflowTimeline;
};

