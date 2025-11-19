module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    "Invoice",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      dealerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      invoiceNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
      invoiceDate: { type: DataTypes.DATE, allowNull: false },
      dueDate: DataTypes.DATE,

      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      taxAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },

      paidAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      balanceAmount: DataTypes.DECIMAL(15, 2),

      status: {
        type: DataTypes.ENUM("paid", "unpaid", "partial", "overdue"),
        defaultValue: "unpaid",
      },

      productGroup: DataTypes.STRING,
      description: DataTypes.TEXT,
      pdfPath: DataTypes.STRING,
      sapDocumentNumber: DataTypes.STRING,
      paymentDate: DataTypes.DATE,
    },
    {
      timestamps: true,
      tableName: "invoices",
    }
  );

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Dealer, {
      foreignKey: "dealerId",
      as: "dealer",
      onDelete: "CASCADE",
    });
  };

  return Invoice;
};
