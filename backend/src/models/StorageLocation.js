module.exports = (sequelize, DataTypes) => {
  const StorageLocation = sequelize.define(
    "StorageLocation",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plant: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Plant Code (e.g., 1001)",
      },
      sloc: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Storage Location Code (e.g., FG01)",
      },
      description: {
        type: DataTypes.STRING,
      },
      capacity: {
        type: DataTypes.INTEGER,
      },
      block_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "StorageLocations",
      timestamps: true,
    }
  );

  StorageLocation.associate = (models) => {
    StorageLocation.hasMany(models.DeliveryOrder, { foreignKey: 'storage_location_id', as: 'deliveryOrders' });
  };

  return StorageLocation;
};
