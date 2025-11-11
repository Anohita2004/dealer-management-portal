const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize'); // ✅ REQUIRED

// Models
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
const PricingUpdate = require('./PricingUpdate')(sequelize, DataTypes); // ✅ FIXED

// Relationships
// =======================

User.belongsTo(Dealer, {
  foreignKey: { name: 'dealerId', allowNull: true },
  as: 'dealer',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Dealer.hasMany(User, { foreignKey: 'dealerId', as: 'users' });

Invoice.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Invoice, { foreignKey: 'dealerId', as: 'invoices' });

Document.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Document, { foreignKey: 'dealerId', as: 'documents' });

CreditDebitNote.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(CreditDebitNote, { foreignKey: 'dealerId', as: 'creditDebitNotes' });

AccountStatement.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(AccountStatement, { foreignKey: 'dealerId', as: 'accountStatements' });

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'recipientId', as: 'receivedMessages' });

// ✅ PricingUpdate relationships
PricingUpdate.belongsTo(Dealer, { foreignKey: "dealerId", as: "dealer" });
Dealer.hasMany(PricingUpdate, { foreignKey: "dealerId", as: "pricingUpdates" });

// =======================
// Sync
// =======================
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
  }
};

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
  PricingUpdate, // ✅ EXPORT IT
  syncDatabase,
};
