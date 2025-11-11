// src/models/PricingUpdate.js
module.exports = (sequelize, DataTypes) => {
  const PricingUpdate = sequelize.define('PricingUpdate', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    oldPrice: { type: DataTypes.FLOAT, allowNull: false },
    newPrice: { type: DataTypes.FLOAT, allowNull: false },
    reason: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
    requestedBy: { type: DataTypes.STRING },
    approvedBy: { type: DataTypes.STRING },
    approvedAt: { type: DataTypes.DATE }
  }, {
    tableName: 'pricing_updates'
  });

  PricingUpdate.associate = (models) => {
    PricingUpdate.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return PricingUpdate;
};
