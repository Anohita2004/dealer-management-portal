const { DataTypes } = require('sequelize');
module.exports = (sequelize, DataTypes) => {

  const CreditDebitNote = sequelize.define('CreditDebitNote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    noteNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    noteType: {
      type: DataTypes.ENUM('credit', 'debit'),
      allowNull: false
    },
    noteDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    reasonCode: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    referenceInvoiceNumber: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    pdfPath: {
      type: DataTypes.STRING
    },
    sapDocumentNumber: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: true
  });

  CreditDebitNote.associate = (models) => {
    CreditDebitNote.belongsTo(models.Dealer, {
      foreignKey: 'dealerId',
      as: 'dealer'
    });
  };

  return CreditDebitNote;
};
