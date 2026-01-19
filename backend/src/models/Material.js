// src/models/Material.js
module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    materialNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    uom: {
      type: DataTypes.STRING
    },
    plant: {
      type: DataTypes.STRING
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reorderLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    materialGroupId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'Materials',
    timestamps: true
  });

  Material.associate = (models) => {
    Material.belongsTo(models.MaterialGroup, {
      as: 'group',
      foreignKey: 'materialGroupId'
    });

    Material.hasMany(models.OrderItem, {
      as: "orderItems",
      foreignKey: "materialId"
    });

    // Material → DealerMaterial (dealer-specific availability)
    Material.hasMany(models.DealerMaterial, {
      as: "dealerMappings",
      foreignKey: "materialId"
    });

    // Material → RegionMaterial (region-level availability, optional)
    Material.hasMany(models.RegionMaterial, {
      as: "regionMappings",
      foreignKey: "materialId"
    });
  };

  return Material;
};
