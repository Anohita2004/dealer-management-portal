const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  const AccountStatement = sequelize.define('AccountStatement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    statementDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    documentType: {
      type: DataTypes.STRING
    },
    documentNumber: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    debitAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    creditAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    productGroup: {
      type: DataTypes.STRING
    },
    sapDocumentNumber: {
      type: DataTypes.STRING
    },
    dealerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'dealers',
        key: 'id'
      }
    }
  }, {
    timestamps: true
  });

  AccountStatement.associate = (models) => {
    AccountStatement.belongsTo(models.Dealer, {
      foreignKey: 'dealerId',
      as: 'dealer'
    });
  };

  return AccountStatement;
};
