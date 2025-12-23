module.exports = (sequelize, DataTypes) => {
  const Region = sequelize.define(
    "Region",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      geojson: DataTypes.JSON,
      centroidLat: DataTypes.FLOAT,
      centroidLng: DataTypes.FLOAT,

    },
    {
      tableName: "regions",
      timestamps: true,
    }
  );

  Region.associate = (models) => {
    Region.hasMany(models.User, {
      foreignKey: "regionId",
      as: "users",
    });

    // ✅ Dealer association
    Region.hasMany(models.Dealer, {
      foreignKey: "regionId",
      as: "dealers",
    });

    // ✅ Area association
    Region.hasMany(models.Area, {
      foreignKey: "regionId",
      as: "areas",
    });

    // ✅ Region-material mapping
    Region.hasMany(models.RegionMaterial, {
      foreignKey: "regionId",
      as: "materialMappings",
    });
  };

  return Region;
};
