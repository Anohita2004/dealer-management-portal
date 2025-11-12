// src/models/PricingUpdate.js
module.exports = (sequelize, DataTypes) => {
  const PricingUpdate = sequelize.define('PricingUpdate', {
    productId: { type: DataTypes.UUID, allowNull: false },
    oldPrice: { type: DataTypes.DECIMAL(13,2) },
    newPrice: { type: DataTypes.DECIMAL(13,2), allowNull: false },
    reason: { type: DataTypes.TEXT },
    requestedBy: { type: DataTypes.STRING },
    requestedByUserId: { type: DataTypes.UUID },
    status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
    remarks: { type: DataTypes.TEXT },
    approvedBy: { type: DataTypes.STRING },
    approvedAt: { type: DataTypes.DATE },
  });

  PricingUpdate.associate = function(models) {
    PricingUpdate.belongsTo(models.Product, { foreignKey: 'productId' });
  };

  return PricingUpdate;
};
