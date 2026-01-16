// Sequelize model for DamageRecord
// For PostgreSQL (default). MySQL: use same model, change connection config.
// MongoDB template at bottom (commented)

module.exports = (sequelize, DataTypes) => {
  const DamageRecord = sequelize.define('DamageRecord', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    goodsReceiptId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to GoodsReceipt',
    },
    materialCode: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Material code (MATNR)',
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Damaged quantity',
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reason for damage',
    },
    reportedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who reported',
    },
    reportedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status: pending, reviewed, resolved',
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'damage_records',
    timestamps: true,
  });

  DamageRecord.associate = (models) => {
    DamageRecord.belongsTo(models.GoodsReceipt, { foreignKey: 'goodsReceiptId', as: 'goodsReceipt' });
    // Add future associations for user, etc.
  };

  return DamageRecord;
};

/*
// MongoDB (Mongoose) template for future use:
// const mongoose = require('mongoose');
// const DamageRecordSchema = new mongoose.Schema({
//   goodsReceiptId: String,
//   materialCode: String,
//   quantity: Number,
//   reason: String,
//   reportedBy: String,
//   reportedAt: Date,
//   status: { type: String, default: 'pending' },
//   remarks: String,
// }, { timestamps: true });
// module.exports = mongoose.model('DamageRecord', DamageRecordSchema);
*/
