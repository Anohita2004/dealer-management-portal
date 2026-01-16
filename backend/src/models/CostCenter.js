// Sequelize model for CostCenter
// For PostgreSQL (default). MySQL: use same model, change connection config.
// MongoDB template at bottom (commented)

module.exports = (sequelize, DataTypes) => {
  const CostCenter = sequelize.define('CostCenter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Cost center code (KOSTL)',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Cost center name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  }, {
    tableName: 'cost_centers',
    timestamps: true,
  });

  // Add associations if needed in the future

  return CostCenter;
};

/*
// MongoDB (Mongoose) template for future use:
// const mongoose = require('mongoose');
// const CostCenterSchema = new mongoose.Schema({
//   code: { type: String, unique: true },
//   name: String,
//   description: String,
//   isActive: { type: Boolean, default: true },
// }, { timestamps: true });
// module.exports = mongoose.model('CostCenter', CostCenterSchema);
*/
