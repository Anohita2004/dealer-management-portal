// src/models/Truck.js
module.exports = (sequelize, DataTypes) => {
  const Truck = sequelize.define(
    "Truck",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      truckName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      licenseNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      truckType: {
        type: DataTypes.ENUM("small", "medium", "large"),
        defaultValue: "medium",
      },
      capacity: {
        type: DataTypes.DECIMAL(10, 2),
        comment: "Capacity in tons/units",
      },
      status: {
        type: DataTypes.ENUM(
          "available",
          "assigned",
          "in_transit",
          "maintenance",
          "inactive"
        ),
        defaultValue: "available",
      },
      currentLat: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      currentLng: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      lastLocationUpdate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      regionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "regions",
          key: "id",
        },
        comment: "For scoping trucks by region",
      },
    },
    {
      tableName: "trucks",
      timestamps: true,
    }
  );

  Truck.associate = (models) => {
    Truck.belongsTo(models.Region, {
      foreignKey: "regionId",
      as: "region",
    });

    Truck.hasMany(models.TruckAssignment, {
      foreignKey: "truckId",
      as: "assignments",
    });

    Truck.hasMany(models.TruckLocationHistory, {
      foreignKey: "truckId",
      as: "locationHistory",
    });
  };

  return Truck;
};

