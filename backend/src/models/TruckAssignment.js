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
          model: "Warehouses",
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
          "en_route_to_warehouse",
          "picked_up",
          "in_transit",
          "delivered",
          "cancelled"
        ),
        defaultValue: "assigned",
      },
      startLocationLat: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        comment: "Driver's start location latitude when tracking begins",
      },
      startLocationLng: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        comment: "Driver's start location longitude when tracking begins",
      },
      startTrackingAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when GPS tracking started",
      },
      warehouseArrivedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Timestamp when truck arrived at warehouse (geofencing detected)",
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
      currentEta: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Real-time ETA to dealer location (updated dynamically)",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "TruckAssignments",
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

