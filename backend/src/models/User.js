const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
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
        validate: {
          isEmail: true,
        },
      },

      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      role: {
        type: DataTypes.ENUM(
          "dealer",
          "tm", // Territory Manager
          "am", // Area Manager
          "sm", // Sales Manager
          "admin",
          "key_user",
          "accounts",
          "inventory"
        ),
        allowNull: false,
        defaultValue: "dealer",
      },

      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      otp: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      otpExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      hooks: {
        // Hash password before creation or update
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
      },
    }
  );

  // ✅ Instance Methods
  User.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.generateOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // valid 10 mins
    console.log(`🔐 OTP for user '${this.username}': ${otp}`);
    return otp;
  };

  User.prototype.validateOTP = function (otp) {
    if (!this.otp || !this.otpExpiry) return false;
    if (new Date() > this.otpExpiry) return false;
    return this.otp === otp;
  };

  // ✅ Associations
 User.associate = (models) => {
  // 🔹 Dealers link back to their dealer profile
  User.belongsTo(models.Dealer, {
    foreignKey: {
      name: "dealerId",
      allowNull: true, // managers/admins won’t have dealerId
    },
    as: "dealer",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  // 🔹 Managers (TM/AM/SM) manage many dealers
  User.hasMany(models.Dealer, {
    foreignKey: "managerId",
    as: "managedDealers",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  // 💬 Chat relationships
  User.hasMany(models.Message, {
    foreignKey: "senderId",
    as: "sentMessages",
    onDelete: "CASCADE",
  });

  User.hasMany(models.Message, {
    foreignKey: "recipientId",
    as: "receivedMessages",
    onDelete: "CASCADE",
  });
};

  return User;
};
