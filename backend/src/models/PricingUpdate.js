module.exports = (sequelize, DataTypes) => {
  const PricingUpdate = sequelize.define('PricingUpdate', {
    productId: { type: DataTypes.UUID, allowNull: false },
    dealerId: { type: DataTypes.UUID, allowNull: false },
    oldPrice: { type: DataTypes.DECIMAL(13, 2) },
    newPrice: { type: DataTypes.DECIMAL(13, 2), allowNull: false },
    reason: { type: DataTypes.TEXT },
    requestedBy: { type: DataTypes.STRING },
    requestedByUserId: { type: DataTypes.UUID },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    remarks: { type: DataTypes.TEXT },
    approvedBy: { type: DataTypes.STRING },
    approvedAt: { type: DataTypes.DATE },
    currentSlaExpiresAt: { type: DataTypes.DATE, allowNull: true },

    // Approval workflow fields
    approvalStage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    rejectionReason: { type: DataTypes.TEXT },
  });

  PricingUpdate.associate = (models) => {
    // ✅ Each pricing update belongs to a product
    PricingUpdate.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // ✅ Each pricing update belongs to a dealer
    PricingUpdate.belongsTo(models.Dealer, {
      foreignKey: 'dealerId',
      as: 'dealer',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  };

  return PricingUpdate;
};
