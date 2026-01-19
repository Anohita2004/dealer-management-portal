module.exports = (sequelize, DataTypes) => {
  const RegionMaterial = sequelize.define(
    "RegionMaterial",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Regions", key: "id" },
      },
      materialId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Materials", key: "id" },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "RegionMaterials",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["regionId", "materialId"],
          name: "region_materials_region_material_unique",
        },
      ],
    }
  );

  RegionMaterial.associate = (models) => {
    RegionMaterial.belongsTo(models.Region, {
      foreignKey: "regionId",
      as: "region",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    RegionMaterial.belongsTo(models.Material, {
      foreignKey: "materialId",
      as: "material",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return RegionMaterial;
};


