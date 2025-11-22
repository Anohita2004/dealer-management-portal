module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "roles", key: "id" },
      },
      permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "permissions", key: "id" },
      },
    },
    {
      tableName: "rolepermissions",
      timestamps: true,
    }
  );

  return RolePermission;
};
