const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// =======================
// Import Models
// =======================
const User = require('./User')(sequelize, DataTypes);
const Dealer = require('./Dealer')(sequelize, DataTypes);
const Invoice = require('./Invoice')(sequelize, DataTypes);
const Document = require('./Document')(sequelize, DataTypes);
const Campaign = require('./Campaign')(sequelize, DataTypes);
const CreditDebitNote = require('./CreditDebitNote')(sequelize, DataTypes);
const AuditLog = require('./AuditLog')(sequelize, DataTypes);
const AccountStatement = require('./AccountStatement')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const Message = require('./Message')(sequelize, DataTypes);
const PricingUpdate = require('./PricingUpdate')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);


// =======================
// Define Associations
// =======================

// User ↔ Dealer
User.belongsTo(Dealer, {
  foreignKey: { name: 'dealerId', allowNull: true },
  as: 'dealer',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Dealer.hasMany(User, { foreignKey: 'dealerId', as: 'users' });

// Dealer ↔ Invoice
Invoice.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Invoice, { foreignKey: 'dealerId', as: 'invoices' });

// Dealer ↔ Document
Document.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Document, { foreignKey: 'dealerId', as: 'documents' });

// Dealer ↔ CreditDebitNote
CreditDebitNote.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(CreditDebitNote, { foreignKey: 'dealerId', as: 'creditDebitNotes' });

// Dealer ↔ AccountStatement
AccountStatement.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(AccountStatement, { foreignKey: 'dealerId', as: 'accountStatements' });

// User ↔ Message
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'recipientId', as: 'receivedMessages' });
// User ↔ Notification
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(Notification, { foreignKey: 'recipientId', as: 'receivedNotifications' });
User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });


// PricingUpdate ↔ Dealer
PricingUpdate.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(PricingUpdate, { foreignKey: 'dealerId', as: 'pricingUpdates' });

// ✅ PricingUpdate ↔ Product (newly added)
PricingUpdate.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(PricingUpdate, { foreignKey: 'productId', as: 'pricingUpdates' });

// =======================
// Sync Helper
// =======================
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
  }
};

// =======================
// Exports
// =======================
module.exports = {
  sequelize,
  User,
  Dealer,
  Invoice,
  Document,
  Campaign,
  CreditDebitNote,
  AuditLog,
  AccountStatement,
  Product,
  Message,
  PricingUpdate,
  Notification,
  syncDatabase,
};
