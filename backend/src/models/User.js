const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
  type: DataTypes.ENUM('dealer', 'tm', 'am', 'sm', 'admin', 'key_user', 'accounts'),
  allowNull: false,
  defaultValue: 'dealer'
},

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    lastLogin: {
      type: DataTypes.DATE
    },
    otp: {
      type: DataTypes.STRING
    },
    otpExpiry: {
      type: DataTypes.DATE
    },
    phoneNumber: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  // 👇 Log OTP for development/testing
  console.log(`🔐 OTP for user '${this.username}': ${otp}`);

  return otp;
};


  User.prototype.validateOTP = function(otp) {
    if (!this.otp || !this.otpExpiry) return false;
    if (new Date() > this.otpExpiry) return false;
    return this.otp === otp;
  };

  return User;
};
