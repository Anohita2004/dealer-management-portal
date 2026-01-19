module.exports = (sequelize, DataTypes) => {
  const UserDealer = sequelize.define(
    "UserDealer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Users", key: "id" },
      },
      dealerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Dealers", key: "id" },
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "user_dealers",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "dealerId"],
          name: "user_dealers_user_dealer_unique",
        },
      ],
    }
  );

  UserDealer.associate = (models) => {
    UserDealer.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    UserDealer.belongsTo(models.Dealer, {
      foreignKey: "dealerId",
      as: "dealer",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return UserDealer;
};


