module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "permissions",
      timestamps: true,
    }
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, {
      through: "rolepermissions",
      foreignKey: "permissionId",
      otherKey: "roleId",
      as: "roles", // ALIAS
    });
  };

  return Permission;
};
