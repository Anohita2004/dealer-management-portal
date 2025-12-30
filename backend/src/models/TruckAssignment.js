// src/models/TruckAssignment.js
module.exports = (sequelize, DataTypes) => {
  const TruckAssignment = sequelize.define(
    "TruckAssignment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "orders",
          key: "id",
        },
      },
      truckId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "trucks",
          key: "id",
        },
      },
      warehouseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "warehouses",
          key: "id",
        },
      },
      driverName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      driverPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      assignedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      assignedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM(
          "assigned",
          "picked_up",
          "in_transit",
          "delivered",
          "cancelled"
        ),
        defaultValue: "assigned",
      },
      pickupAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      estimatedDeliveryAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "truck_assignments",
      timestamps: true,
    }
  );

  TruckAssignment.associate = (models) => {
    TruckAssignment.belongsTo(models.Order, {
      foreignKey: "orderId",
      as: "order",
    });

    TruckAssignment.belongsTo(models.Truck, {
      foreignKey: "truckId",
      as: "truck",
    });

    TruckAssignment.belongsTo(models.Warehouse, {
      foreignKey: "warehouseId",
      as: "warehouse",
    });

    TruckAssignment.belongsTo(models.User, {
      foreignKey: "assignedBy",
      as: "assignedByUser",
    });

    TruckAssignment.hasMany(models.TruckLocationHistory, {
      foreignKey: "truckAssignmentId",
      as: "locationHistory",
    });
  };

  return TruckAssignment;
};

