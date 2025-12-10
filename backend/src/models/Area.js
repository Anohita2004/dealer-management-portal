// src/models/Area.js
module.exports = (sequelize, DataTypes) => {
  const Area = sequelize.define(
    'Area',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
      },
      name: DataTypes.STRING,
      regionId: DataTypes.UUID,
      geojson: DataTypes.JSONB,
      centroidLat: DataTypes.DOUBLE,
      centroidLng: DataTypes.DOUBLE
    },
    { tableName: "areas" }
  );

  Area.associate = (models) => {
    Area.belongsTo(models.Region, { foreignKey: "regionId", as: "region" });

    Area.hasMany(models.Territory, { foreignKey: "areaId", as: "territories" });

    Area.hasMany(models.Dealer, { foreignKey: "areaId", as: "dealers" });
  };

  return Area;
};
