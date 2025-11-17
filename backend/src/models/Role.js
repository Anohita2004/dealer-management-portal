module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      category: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "roles",
      timestamps: true,
    }
  );

  Role.associate = (models) => {
    // Role → Users
    Role.hasMany(models.User, {
      foreignKey: "roleId",
      as: "users",
    });

    // Role → Permissions (Many-to-Many)
    Role.belongsToMany(models.Permission, {
      through: "rolepermissions",
      foreignKey: "roleId",
      otherKey: "permissionId",
      as: "permissions",  // IMPORTANT ALIAS
    });
  };

  return Role;
};
