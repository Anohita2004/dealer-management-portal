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

      username: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true, validate:{isEmail:true} },
      password: { type: DataTypes.STRING, allowNull: false },

      // 🔥 RBAC
      roleId: { type: DataTypes.INTEGER, references:{ model:"roles", key:"id" } },

      // 🔥 Org hierarchy mapping
      regionId:   { type: DataTypes.UUID, references:{ model:"regions", key:"id" }},
      areaId:     { type: DataTypes.UUID, references:{ model:"areas", key:"id" }},
      territoryId:{ type: DataTypes.UUID, references:{ model:"territories", key:"id" }},
      dealerId:   { type: DataTypes.UUID, allowNull:true },

      // 🔥 NEW → who this user reports to
      managerId:  { type: DataTypes.UUID, allowNull:true, references:{ model:"Users", key:"id" }},

      // 🔥 Sales team assignment for Sales Managers
      salesGroupId: { type: DataTypes.INTEGER, allowNull:true, references:{ model:"sales_groups", key:"id" }},

      phoneNumber: DataTypes.STRING,
      isActive: { type: DataTypes.BOOLEAN, defaultValue:true },
      isBlocked:{ type: DataTypes.BOOLEAN, defaultValue:false },

      lastLogin: DataTypes.DATE,
      otp: DataTypes.STRING,
      otpExpiry: DataTypes.DATE,

      // Legacy ENUM — safe to remove later
      role: {
        type: DataTypes.ENUM("dealer","tm","am","sm","admin","key_user","accounts","inventory"),
        defaultValue:"dealer"
      }
    },
    {
      tableName:"Users",
      timestamps:true,
      freezeTableName:true,

      hooks:{
        beforeCreate:async(user)=>{ 
          if(user.password && !user.password.match(/^\$2[ayb]\$.{56}$/)) {
            user.password = await bcrypt.hash(user.password,10); 
          }
        },
        beforeUpdate:async(user)=>{ 
          if(user.changed("password") && user.password && !user.password.match(/^\$2[ayb]\$.{56}$/)) {
            user.password = await bcrypt.hash(user.password,10); 
          }
        }
      }
    }
  );

  // =====================================================
  //        RELATIONSHIPS (NOW WITH HIERARCHY)
  // =====================================================
  User.associate = (models) => {

    // SELF HIERARCHY 🔥🔥🔥
    User.belongsTo(models.User,{ foreignKey:"managerId", as:"manager" });
    User.hasMany(models.User,{ foreignKey:"managerId", as:"subordinates" });

    // Dealer access
    User.belongsTo(models.Dealer,{ foreignKey:"dealerId", as:"dealer" });
    User.hasMany(models.Dealer,{ foreignKey:"managerId", as:"managedDealers" });

    // RBAC
    User.belongsTo(models.Role,{ foreignKey:"roleId", as:"roleDetails" });

    User.belongsTo(models.Region,{ foreignKey:"regionId", as:"region" });
    User.belongsTo(models.Area,{ foreignKey:"areaId", as:"area" });
    User.belongsTo(models.Territory,{ foreignKey:"territoryId", as:"territory" });

    // Sales team
    User.belongsTo(models.SalesGroup,{ foreignKey:"salesGroupId", as:"salesGroup" });

    // Chat/messages
    User.hasMany(models.Message,{ foreignKey:"senderId", as:"sentMessages" });
    User.hasMany(models.Message,{ foreignKey:"recipientId", as:"receivedMessages" });
  };

  // =================
  // INSTANCE METHODS
  // =================
  User.prototype.validatePassword = async function(pwd){ 
    if(!pwd || !this.password) return false;
    return await bcrypt.compare(pwd,this.password); 
  };

  User.prototype.generateOTP = function(){
    const otp = Math.floor(100000 + Math.random()*900000).toString();
    this.otp = otp;
    this.otpExpiry = new Date(Date.now()+10*60*1000);
    return otp;
  };

  User.prototype.validateOTP = function(otp){
    if(!this.otp || !this.otpExpiry) return false;
    return this.otp === otp && new Date() < this.otpExpiry;
  };

  return User;
};

 

 