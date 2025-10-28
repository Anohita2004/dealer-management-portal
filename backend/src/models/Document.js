const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentType: {
      type: DataTypes.ENUM('statement', 'certificate', 'invoice', 'credit_note', 'debit_note', 'other'),
      allowNull: false
    },
    documentName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER
    },
    mimeType: {
      type: DataTypes.STRING
    },
    uploadedBy: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    sapDocumentId: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: true
  });

  return Document;
};
