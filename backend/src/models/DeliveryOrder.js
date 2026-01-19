module.exports = (sequelize, DataTypes) => {
  const DeliveryOrder = sequelize.define(
    "DeliveryOrder",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      likp: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true, // Null initially, populated from SAP
        comment: "SAP Delivery Document Number",
      },
      vbeln: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Sales Order Number (from Order model or external)",
      },
      storage_location_id: {
        type: DataTypes.UUID,
        references: { model: "StorageLocations", key: "id" },
      },
      loading_point_id: {
        type: DataTypes.UUID,
        references: { model: "LoadingPoints", key: "id" },
      },
      delivery_date: {
        type: DataTypes.DATE,
      },
      status: {
        type: DataTypes.ENUM("DRAFT", "ALLOCATED", "SCHEDULED", "PGI_PENDING", "COMPLETED"),
        defaultValue: "DRAFT",
      },
      items: {
        type: DataTypes.JSONB,
        comment: "Snapshot of items in the delivery",
      },
    },
    {
      tableName: "DeliveryOrders",
      timestamps: true,
    }
  );

  DeliveryOrder.associate = (models) => {
    DeliveryOrder.belongsTo(models.StorageLocation, { foreignKey: 'storage_location_id', as: 'storageLocation' });
    DeliveryOrder.belongsTo(models.LoadingPoint, { foreignKey: 'loading_point_id', as: 'loadingPoint' });
    DeliveryOrder.hasOne(models.DockSchedule, { foreignKey: 'delivery_order_id', as: 'dockSchedule' });
  };

  return DeliveryOrder;
};
