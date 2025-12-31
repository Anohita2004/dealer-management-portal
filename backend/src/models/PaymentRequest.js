module.exports = (sequelize, DataTypes) => {
  const PaymentRequest = sequelize.define("PaymentRequest", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },

    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    dealerId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    amount: { type: DataTypes.FLOAT, allowNull: false },
    paymentMode: { type: DataTypes.STRING, allowNull: false },
    utrNumber: { type: DataTypes.STRING },
    proofFile: { type: DataTypes.STRING },

    status: {
      type: DataTypes.STRING,
      defaultValue: "dealer_pending"
    },

    dealerApprovalStatus: {
      type: DataTypes.STRING,
      defaultValue: "pending"
    },

    dealerApprovalRemarks: { type: DataTypes.TEXT },
    dealerApprovedAt: { type: DataTypes.DATE },
    dealerApprovedBy: { type: DataTypes.STRING },

    remarks: { type: DataTypes.TEXT },
    approvedAt: { type: DataTypes.DATE },
    approvedBy: { type: DataTypes.STRING },
    currentSlaExpiresAt: { type: DataTypes.DATE, allowNull: true },

    // Approval workflow fields
    approvalStage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approvalStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    rejectionReason: { type: DataTypes.TEXT },

    // Gateway integration fields
    gatewayOrderId: { type: DataTypes.STRING },
    gatewayPaymentId: { type: DataTypes.STRING },
    gatewaySignature: { type: DataTypes.STRING },
    paymentGateway: { type: DataTypes.STRING },
  });

  PaymentRequest.associate = (models) => {
    PaymentRequest.belongsTo(models.Invoice, { foreignKey: "invoiceId", as: "invoice" });
    PaymentRequest.belongsTo(models.Dealer, { foreignKey: "dealerId", as: "dealer" });
  };

  return PaymentRequest;
};
