// src/models/Warehouse.js
module.exports = (sequelize, DataTypes) => {
  const Warehouse = sequelize.define(
    "Warehouse",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      warehouseCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.TEXT,
      },
      city: {
        type: DataTypes.STRING,
      },
      state: {
        type: DataTypes.STRING,
      },
      pincode: {
        type: DataTypes.STRING,
      },
      lat: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      lng: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      regionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Regions",
          key: "id",
        },
      },
      areaId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "Areas",
          key: "id",
        },
      },
      contactPerson: {
        type: DataTypes.STRING,
      },
      phoneNumber: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
        validate: {
          isEmail: true,
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "Warehouses",
      timestamps: true,
    }
  );

  Warehouse.associate = (models) => {
    Warehouse.belongsTo(models.Region, {
      foreignKey: "regionId",
      as: "region",
    });

    Warehouse.belongsTo(models.Area, {
      foreignKey: "areaId",
      as: "area",
    });

    Warehouse.hasMany(models.TruckAssignment, {
      foreignKey: "warehouseId",
      as: "assignments",
    });
  };

  return Warehouse;
};

