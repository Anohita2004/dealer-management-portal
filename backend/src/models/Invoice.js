const { DataTypes } = require('sequelize');
module.exports = (sequelize, DataTypes) => {

  const Invoice = sequelize.define('Invoice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    dueDate: {
      type: DataTypes.DATE
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    paidAmount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    balanceAmount: {
      type: DataTypes.DECIMAL(15, 2)
    },
    status: {
      type: DataTypes.ENUM('paid', 'unpaid', 'partial', 'overdue'),
      defaultValue: 'unpaid'
    },
    productGroup: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    pdfPath: {
      type: DataTypes.STRING
    },
    sapDocumentNumber: {
      type: DataTypes.STRING
    },
    paymentDate: {
      type: DataTypes.DATE
    }
  }, {
    timestamps: true
  });

  return Invoice;
};
