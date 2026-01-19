// src/models/Territory.js
module.exports = (sequelize, DataTypes) => {
  const Territory = sequelize.define("Territory", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: DataTypes.STRING,

    regionId: DataTypes.UUID,
    areaId: DataTypes.UUID,

    geojson: DataTypes.JSONB,
    centroidLat: DataTypes.DOUBLE,
    centroidLng: DataTypes.DOUBLE
  }, {
    tableName: "Territories"
  });

  Territory.associate = models => {
    // territory → region
    Territory.belongsTo(models.Region, {
      foreignKey: "regionId",
      as: "region"
    });

    // territory → area
    Territory.belongsTo(models.Area, {
      foreignKey: "areaId",
      as: "area"              // MUST MATCH controller
    });

    // territory → many dealers
    Territory.hasMany(models.Dealer, {
      foreignKey: "territoryId",
      as: "dealers"           // MUST MATCH controller
    });
  };

  return Territory;
};
