// src/models/SalesGroup.js
module.exports = (sequelize, DataTypes) => {
  const SalesGroup = sequelize.define('SalesGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    region: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'sales_groups'
  });

  SalesGroup.associate = (models) => {
    // Many-to-many with Dealer via SalesGroupMembers
    SalesGroup.belongsToMany(models.Dealer, {
      through: 'SalesGroupMembers',
      as: 'dealers',
      foreignKey: 'salesGroupId',
      otherKey: 'dealerId'
    });
  };

  return SalesGroup;
};
