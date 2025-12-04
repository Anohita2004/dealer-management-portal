module.exports = (sequelize, DataTypes) => {
  const Territory = sequelize.define('Territory', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    name: DataTypes.STRING,
    regionId: DataTypes.UUID,

    // ADD THESE FIELDS
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
  }, { tableName: 'territories' });

  Territory.associate = models => {
    Territory.belongsTo(models.Region, { foreignKey: 'regionId' });
    Territory.hasMany(models.Dealer, { foreignKey: 'territoryId' });
  };

  return Territory;
};
