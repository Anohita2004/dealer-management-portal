module.exports = (sequelize, DataTypes) => {

  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    campaignName: { type: DataTypes.STRING, allowNull:false },
    campaignType: { 
      type: DataTypes.ENUM('promotion','sales_scheme','seasonal_offer'),
      allowNull:false
    },
    description: DataTypes.TEXT,

    startDate: { type: DataTypes.DATE, allowNull:false },
    endDate: { type: DataTypes.DATE, allowNull:false },

    productGroup: DataTypes.STRING,
    discountPercentage: DataTypes.DECIMAL(5,2),
    discountAmount: DataTypes.DECIMAL(15,2),

    targetAudience: DataTypes.JSON,

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    terms: DataTypes.TEXT,
    bannerImage: DataTypes.STRING,

    areaId: { type: DataTypes.UUID, allowNull:true }
  }, {
    timestamps:true,
    tableName:"Campaigns"
  });

  // 🔥 Add association (critical)
  Campaign.associate = models => {
    Campaign.belongsTo(models.Area, {
      foreignKey:"areaId",
      as:"area",
      onDelete:"SET NULL"
    });
  };

  return Campaign;
};
