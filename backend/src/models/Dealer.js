module.exports = (sequelize, DataTypes) => {

  const Dealer = sequelize.define(
    "Dealer",
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
      email: { type: DataTypes.STRING, validate: { isEmail: true } },
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

      creditLimit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      outstandingAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

      territory: DataTypes.STRING,
      region: DataTypes.STRING,

      sapCustomerNumber: DataTypes.STRING,
      sapVendorNumber: DataTypes.STRING,

      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false },
      blockReason: DataTypes.TEXT,
      isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },

      managerId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "User ID of TM/AM/RM managing this dealer",
      },

      licenseNumber: DataTypes.STRING,
      licenseDocument: DataTypes.STRING,
      verifiedBy: DataTypes.STRING,
      verifiedAt: DataTypes.DATE,
      licenses: DataTypes.JSON,
    },
    {
      timestamps: true,
      tableName: "dealers",
      freezeTableName: true,
    }
  );

  // ================================
  // ASSOCIATIONS
  // ================================
  Dealer.associate = (models) => {
    // Dealer ←→ User (Dealer login)
    Dealer.hasOne(models.User, {
      foreignKey: "dealerId",
      as: "user",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // Dealer ←→ User (Manager)
    Dealer.belongsTo(models.User, {
      foreignKey: { name: "managerId", allowNull: true },
      as: "manager",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // Dealer ←→ Invoices
    Dealer.hasMany(models.Invoice, {
      foreignKey: "dealerId",
      as: "invoices",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Dealer ←→ Documents
    Dealer.hasMany(models.Document, {
      foreignKey: "dealerId",
      as: "documents",
    });

    // Dealer ←→ Pricing Updates
    Dealer.hasMany(models.PricingUpdate, {
      foreignKey: "dealerId",
      as: "pricingUpdates",
    });
  };

  return Dealer;
};
