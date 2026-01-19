// Sequelize model for DeliveryOrder
// For PostgreSQL (default). MySQL: use same model, change connection config.
// MongoDB template at bottom (commented)

module.exports = (sequelize, DataTypes) => {
  const DeliveryOrder = sequelize.define('DeliveryOrder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    doNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Delivery Order number (LIKP)',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to Sales Order',
    },
    plant: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Plant code (WERKS)',
    },
    storageLocationId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Allocated storage location',
    },
    loadingPointId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Allocated loading point',
    },
    dock: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Dock or equipment assigned',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Scheduled loading time',
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      comment: 'pending, scheduled, dispatched, delivered, error',
    },
    likp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'SAP Delivery number (LIKP) after posting',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'delivery_orders',
    timestamps: true,
  });

  // Add associations if needed in the future

  return DeliveryOrder;
};

/*
// MongoDB (Mongoose) template for future use:
// const mongoose = require('mongoose');
// const DeliveryOrderSchema = new mongoose.Schema({
//   doNumber: String,
//   orderId: String,
//   plant: String,
//   storageLocationId: String,
//   loadingPointId: String,
//   dock: String,
//   scheduledAt: Date,
//   status: { type: String, default: 'pending' },
//   likp: String,
//   remarks: String,
// }, { timestamps: true });
// module.exports = mongoose.model('DeliveryOrder', DeliveryOrderSchema);
*/
