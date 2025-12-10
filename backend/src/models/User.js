const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {

  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },

      // 🔥 Link to roles table (RBAC)
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "roles", key: "id" },
      },

      // 🔥 Link to Regions table
      regionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Regions", key: "id" },
      },

      // 🔥 Link to Areas table
      areaId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Areas", key: "id" },
      },

      // 🔥 Link to Territories table
      territoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: "Territories", key: "id" },
      },

      // (Old ENUM – we can remove later)
      role: {
        type: DataTypes.ENUM(
          "dealer",
          "tm",
          "am",
          "sm",
          "admin",
          "key_user",
          "accounts",
          "inventory"
        ),
        allowNull: false,
        defaultValue: "dealer",
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      phoneNumber: DataTypes.STRING,
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false },

      lastLogin: DataTypes.DATE,
      otp: DataTypes.STRING,
      otpExpiry: DataTypes.DATE,
    },
    {
      timestamps: true,
      tableName: "Users",
      freezeTableName: true,

      hooks: {
        beforeCreate: async (user) => {
          if (user.password)
            user.password = await bcrypt.hash(user.password, 10);
        },
        beforeUpdate: async (user) => {
          if (user.changed("password"))
            user.password = await bcrypt.hash(user.password, 10);
        },
      },
    }
  );

  // ============================
  // INSTANCE METHODS
  // ============================
  User.prototype.validatePassword = function (password) {
    return bcrypt.compare(password, this.password);
  };

  User.prototype.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  console.log(`🔐 OTP generated for user: ${this.username} → ${otp}`);

  return otp;
};


  User.prototype.validateOTP = function (otp) {
    if (!this.otp || !this.otpExpiry) return false;
    return this.otp === otp && new Date() < this.otpExpiry;
  };

  // ============================
  // ASSOCIATIONS
  // ============================
  User.associate = (models) => {
    // Dealer profile
    User.belongsTo(models.Dealer, {
      foreignKey: "dealerId",
      as: "dealer",
    });

    // Managers manage many dealers
    User.hasMany(models.Dealer, {
      foreignKey: "managerId",
      as: "managedDealers",
    });

    // RBAC Role
    User.belongsTo(models.Role, {
      foreignKey: "roleId",
      as: "roleDetails",
    });

    // Region
    User.belongsTo(models.Region, {
      foreignKey: "regionId",
      as: "region",
    });

    // Area
    User.belongsTo(models.Area, {
      foreignKey: "areaId",
      as: "area",
    });

    // Territory
    User.belongsTo(models.Territory, {
      foreignKey: "territoryId",
      as: "territory",
    });

    // Chat
    User.hasMany(models.Message, {
      foreignKey: "senderId",
      as: "sentMessages",
    });

    User.hasMany(models.Message, {
      foreignKey: "recipientId",
      as: "receivedMessages",
    });
  };

  return User;
};
