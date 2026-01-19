// Sequelize model for StorageLocation
// For PostgreSQL (default). MySQL: use same model, change connection config.
// MongoDB template at bottom (commented)

module.exports = (sequelize, DataTypes) => {
  const StorageLocation = sequelize.define('StorageLocation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sloc: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Storage location code (SLOC)',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    plant: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Plant code (WERKS)',
    },
    capacity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Total capacity',
    },
    qtyOnHand: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Current quantity on hand',
    },
    blockStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Blocked/Available',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  }, {
    tableName: 'storage_locations',
    timestamps: true,
  });

  // Add associations if needed in the future

  return StorageLocation;
};

/*
// MongoDB (Mongoose) template for future use:
// const mongoose = require('mongoose');
// const StorageLocationSchema = new mongoose.Schema({
//   sloc: { type: String, unique: true },
//   description: String,
//   plant: String,
//   capacity: Number,
//   qtyOnHand: Number,
//   blockStatus: String,
//   isActive: { type: Boolean, default: true },
// }, { timestamps: true });
// module.exports = mongoose.model('StorageLocation', StorageLocationSchema);
*/
