const { sequelize } = require('../config/database');

// Models
const User = require('./User')(sequelize);
const Dealer = require('./Dealer')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const Document = require('./Document')(sequelize);
const Campaign = require('./Campaign')(sequelize);
const CreditDebitNote = require('./CreditDebitNote')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const AccountStatement = require('./AccountStatement')(sequelize);
const Product = require('./Product')(sequelize);
const Message = require('./Message')(sequelize);

// =======================
// Relationships
// =======================

// ✅ User ↔ Dealer (fixed)
User.belongsTo(Dealer, {
  foreignKey: {
    name: 'dealerId',
    allowNull: true,
  },
  as: 'dealer',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

Dealer.hasMany(User, {
  foreignKey: 'dealerId',
  as: 'users'
});

// Invoice ↔ Dealer
Invoice.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Invoice, { foreignKey: 'dealerId', as: 'invoices' });

// Document ↔ Dealer
Document.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Document, { foreignKey: 'dealerId', as: 'documents' });

// CreditDebitNote ↔ Dealer
CreditDebitNote.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(CreditDebitNote, { foreignKey: 'dealerId', as: 'creditDebitNotes' });

// AccountStatement ↔ Dealer
AccountStatement.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(AccountStatement, { foreignKey: 'dealerId', as: 'accountStatements' });

// ✅ Message relationships
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'recipientId', as: 'receivedMessages' });

// =======================
// Database Sync Function
// =======================
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true }); // safe for dev
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
  syncDatabase,
};
