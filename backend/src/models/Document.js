module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define(
    "Document",
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

      documentType: {
        type: DataTypes.ENUM(
          "statement",
          "certificate",
          "invoice",
          "credit_note",
          "debit_note",
          "other"
        ),
        allowNull: false,
      },

      documentName: { type: DataTypes.STRING, allowNull: false },
      filePath: { type: DataTypes.STRING, allowNull: false },
      fileSize: DataTypes.INTEGER,
      mimeType: DataTypes.STRING,
      uploadedBy: DataTypes.STRING,
      description: DataTypes.TEXT,

      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      approvedBy: { type: DataTypes.UUID },
      approvedAt: { type: DataTypes.DATE },
      rejectionReason: { type: DataTypes.TEXT },

      sapDocumentId: { type: DataTypes.STRING },
    },
    {
      timestamps: true,
      tableName: "documents",
    }
  );

  Document.associate = (models) => {
    Document.belongsTo(models.Dealer, {
      foreignKey: "dealerId",
      as: "dealer",
      onDelete: "CASCADE",
    });
  };

  return Document;
};
