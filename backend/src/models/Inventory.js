const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  const Inventory = sequelize.define('Inventory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    plant: {
      type: DataTypes.STRING,
      allowNull: false
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    uom: {
      type: DataTypes.STRING,
      defaultValue: 'Units'
    },
    lastUpdatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    sapMaterialNumber: {
      type: DataTypes.STRING
    },
    reorderLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    materialNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    materialCode: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    timestamps: true
  });

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Material, {
      foreignKey: 'materialNumber',
      targetKey: 'materialNumber',
      as: 'material'
    });
  };

  return Inventory;
};
