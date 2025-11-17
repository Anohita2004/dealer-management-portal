module.exports = (sequelize, DataTypes) => {
  const Region = sequelize.define(
    "Region",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
    },
    {
      tableName: "Regions",
      timestamps: true,
    }
  );

  Region.associate = (models) => {
    Region.hasMany(models.User, {
      foreignKey: "regionId",
      as: "users",
    });
  };

  return Region;
};
