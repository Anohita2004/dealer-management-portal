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

      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },

      invoiceDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      dueDate: DataTypes.DATE,

      /* ============================================================
         NEW UNIFIED AMOUNT SYSTEM
      ============================================================ */

      baseAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      taxAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      paidAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      balanceAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      /* ============================================================
         STATUS + META
      ============================================================ */

      status: {
        type: DataTypes.ENUM("paid", "unpaid", "partial", "overdue"),
        defaultValue: "unpaid",
      },

      productGroup: DataTypes.STRING,
      description: DataTypes.TEXT,
      pdfPath: DataTypes.STRING,
      sapDocumentNumber: DataTypes.STRING,
      paymentDate: DataTypes.DATE,

      // Approval workflow fields
      approvalStage: {
        type: DataTypes.ENUM('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'),
        allowNull: true
      },
      approvalStatus: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      approvedBy: DataTypes.STRING,
      approvedAt: DataTypes.DATE,
      rejectionReason: DataTypes.TEXT,
      currentSlaExpiresAt: DataTypes.DATE
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

    Invoice.belongsTo(models.Order, {
      foreignKey: "orderId",
      as: "order",
      onDelete: "SET NULL"
    });
  };

  return Invoice;
};
