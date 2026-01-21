// src/models/Order.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      dealerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      orderNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      status: {
        type: DataTypes.ENUM(
          "Pending",
          "Approved",
          "Rejected",
          "Pending Approval",
          "Processing",
          "Shipped",
          "In Transit",
          "Delivered",
          "Cancelled"
        ),
        defaultValue: "Pending",
      },

      totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },

      notes: {
        type: DataTypes.TEXT,
      },

      // ----------------------------------------
      // MULTI-STAGE APPROVAL WORKFLOW FIELDS
      // ----------------------------------------

      approvalStage: {
        type: DataTypes.STRING, // dealer_admin, regional_manager, etc.
        allowNull: true,
      },

      approvalStatus: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },

      approvedBy: {
        type: DataTypes.UUID,
        allowNull: true, // who approved/rejected the LAST stage
      },

      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      rejectionReason: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      currentSlaExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      truckAssignmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "truck_assignments",
          key: "id",
        },
        comment: "Quick lookup for truck assignment",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.Dealer, {
      as: "dealer",
      foreignKey: "dealerId",
    });

    Order.hasMany(models.OrderItem, {
      as: "items",
      foreignKey: "orderId",
    });

    Order.hasOne(models.TruckAssignment, {
      as: "truckAssignment",
      foreignKey: "orderId",
    });
  };

  return Order;
};
