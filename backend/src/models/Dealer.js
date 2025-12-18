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

      // ❌ removed old 'region: DataTypes.STRING,'

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
      lat: DataTypes.FLOAT,
lng: DataTypes.FLOAT,
territoryId: DataTypes.UUID,

      // ✅ REAL REGION RELATION
      regionId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      areaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "dealers",
      freezeTableName: true,
    }
  );

Dealer.associate = (models) => {
    Dealer.hasOne(models.User, {
      foreignKey: "dealerId",
      as: "user",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
Dealer.belongsTo(models.Territory, { foreignKey: 'territoryId' });

    Dealer.belongsTo(models.User, {
      foreignKey: { name: "managerId", allowNull: true },
      as: "manager",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    Dealer.hasMany(models.Invoice, {
      foreignKey: "dealerId",
      as: "invoices",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Dealer.hasMany(models.Document, {
      foreignKey: "dealerId",
      as: "documents",
    });

    Dealer.hasMany(models.PricingUpdate, {
      foreignKey: "dealerId",
      as: "pricingUpdates",
    });

    // ✅ FIXED: Region relationship
    Dealer.belongsTo(models.Region, {
      foreignKey: "regionId",
      as: "region",
    });

    Dealer.belongsTo(models.Area, {
      foreignKey: "areaId",
      as: "area",
    });
  };

  return Dealer;
};
