module.exports = (sequelize, DataTypes) => {
  const DealerMaterial = sequelize.define(
    "DealerMaterial",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      dealerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "dealers", key: "id" },
      },
      materialId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "materials", key: "id" },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      stockQty: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "dealer_materials",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["dealerId", "materialId"],
          name: "dealer_materials_dealer_material_unique",
        },
      ],
    }
  );

  DealerMaterial.associate = (models) => {
    DealerMaterial.belongsTo(models.Dealer, {
      foreignKey: "dealerId",
      as: "dealer",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    DealerMaterial.belongsTo(models.Material, {
      foreignKey: "materialId",
      as: "material",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return DealerMaterial;
};


