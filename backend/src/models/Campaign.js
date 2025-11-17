const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    campaignName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    campaignType: {
      type: DataTypes.ENUM('promotion', 'sales_scheme', 'seasonal_offer'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    productGroup: {
      type: DataTypes.STRING
    },
    discountPercentage: {
      type: DataTypes.DECIMAL(5, 2)
    },
    discountAmount: {
      type: DataTypes.DECIMAL(15, 2)
    },
    targetAudience: {
      type: DataTypes.JSON
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    terms: {
      type: DataTypes.TEXT
    },
    bannerImage: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: true
  });

  return Campaign;
};
