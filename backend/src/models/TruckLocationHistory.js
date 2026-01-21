// src/models/TruckLocationHistory.js
module.exports = (sequelize, DataTypes) => {
  const TruckLocationHistory = sequelize.define(
    "TruckLocationHistory",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      truckId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "trucks",
          key: "id",
        },
      },
      truckAssignmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "TruckAssignments",
          key: "id",
        },
      },
      lat: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      lng: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      speed: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        comment: "Speed in km/h",
      },
      heading: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        comment: "Heading in degrees (0-360)",
      },
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "truck_location_history",
      timestamps: true,
      indexes: [
        {
          fields: ["truckId", "timestamp"],
          name: "truck_location_history_truck_timestamp_idx",
        },
        {
          fields: ["truckAssignmentId"],
          name: "truck_location_history_assignment_idx",
        },
      ],
    }
  );

  TruckLocationHistory.associate = (models) => {
    TruckLocationHistory.belongsTo(models.Truck, {
      foreignKey: "truckId",
      as: "truck",
    });

    TruckLocationHistory.belongsTo(models.TruckAssignment, {
      foreignKey: "truckAssignmentId",
      as: "assignment",
    });
  };

  return TruckLocationHistory;
};

