const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dealer = sequelize.define('Dealer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    dealerCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contactPerson: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phoneNumber: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING
    },
    state: {
      type: DataTypes.STRING
    },
    pincode: {
      type: DataTypes.STRING
    },
    gstNumber: {
      type: DataTypes.STRING
    },
    panNumber: {
      type: DataTypes.STRING
    },
    bankName: {
      type: DataTypes.STRING
    },
    bankAccountNumber: {
      type: DataTypes.STRING
    },
    bankIFSC: {
      type: DataTypes.STRING
    },
    paymentTerms: {
      type: DataTypes.STRING
    },
    creditLimit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    outstandingAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    territory: {
      type: DataTypes.STRING
    },
    region: {
      type: DataTypes.STRING
    },
    sapCustomerNumber: {
      type: DataTypes.STRING
    },
    sapVendorNumber: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    licenses: {
      type: DataTypes.JSON
    }
  }, {
    timestamps: true
  });

  return Dealer;
};
