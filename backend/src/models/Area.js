// src/models/Area.js
module.exports = (sequelize, DataTypes) => {
  const Area = sequelize.define('Area', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    geojson: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    centroidLat: {
      type: DataTypes.DOUBLE,
      allowNull: true
    },
    centroidLng: {
      type: DataTypes.DOUBLE,
      allowNull: true
    }
  }, {
    tableName: 'areas'
  });

  Area.associate = (models) => {
    Area.belongsTo(models.Region, { foreignKey: 'regionId' });
    Area.hasMany(models.Territory, { foreignKey: 'areaId' });
    Area.hasMany(models.User, { foreignKey: 'areaId', as: 'managers' });
  };

  return Area;
};
