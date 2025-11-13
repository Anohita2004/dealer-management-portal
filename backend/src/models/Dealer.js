const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dealer = sequelize.define(
    'Dealer',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      dealerCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      businessName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contactPerson: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        validate: { isEmail: true },
      },
      phoneNumber: DataTypes.STRING,
      address: DataTypes.TEXT,
      city: DataTypes.STRING,
      state: DataTypes.STRING,
      pincode: DataTypes.STRING,
      gstNumber: DataTypes.STRING,
      panNumber: DataTypes.STRING,
      bankName: DataTypes.STRING,
      bankAccountNumber: DataTypes.STRING,
      bankIFSC: DataTypes.STRING,
      paymentTerms: DataTypes.STRING,
      creditLimit: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      outstandingAmount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
      },
      territory: DataTypes.STRING,
      region: DataTypes.STRING,
      sapCustomerNumber: DataTypes.STRING,
      sapVendorNumber: DataTypes.STRING,
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      blockReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      // inside attributes block (add near other UUID fields)
managerId: {
  type: DataTypes.UUID,
  allowNull: true,
  comment: 'User ID of the manager (tm/am) assigned to this dealer'
},

      licenseNumber: DataTypes.STRING,
      licenseDocument: DataTypes.STRING,
      verifiedBy: DataTypes.STRING,
      verifiedAt: DataTypes.DATE,
      licenses: DataTypes.JSON,
    },
    {
      timestamps: true,
      tableName: 'Dealers',
       freezeTableName: true,
    }
  );
 console.log("✅ Dealer model using table:", Dealer.getTableName());
  // ✅ Sequelize injects `models` here automatically
  Dealer.associate = (models) => {
  // 🔹 Each dealer is linked to one user account (for login & chat)
  Dealer.hasOne(models.User, {
    foreignKey: "dealerId",
    as: "user",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  // 🔹 Each dealer is managed by one manager (User)
  Dealer.belongsTo(models.User, {
    foreignKey: {
      name: "managerId",
      allowNull: true,
    },
    as: "manager",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });

  // 🔹 Each dealer can have many invoices
  Dealer.hasMany(models.Invoice, {
    foreignKey: "dealerId",
    as: "invoices",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  // 🔹 Each dealer can have many documents
  Dealer.hasMany(models.Document, {
    foreignKey: "dealerId",
    as: "documents",
  });

  // 🔹 Each dealer can have many pricing updates
  Dealer.hasMany(models.PricingUpdate, {
    foreignKey: "dealerId",
    as: "pricingUpdates",
  });
};


  return Dealer;
};

