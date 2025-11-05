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
  // add to Document model definition
status: {
  type: DataTypes.ENUM('pending', 'approved', 'rejected'),
  defaultValue: 'pending'
},
approvedBy: {
  type: DataTypes.UUID, // user id who approved/rejected
  allowNull: true
},
approvedAt: {
  type: DataTypes.DATE,
  allowNull: true
},
rejectionReason: {
  type: DataTypes.TEXT,
  allowNull: true
},


    sapDocumentId: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: true
  },
);

  return Document;
};
