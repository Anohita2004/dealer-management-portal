const { sequelize } = require('../config/database');

const User = require('./User')(sequelize);
const Dealer = require('./Dealer')(sequelize);
const Invoice = require('./Invoice')(sequelize);
const Document = require('./Document')(sequelize);
const Campaign = require('./Campaign')(sequelize);
const CreditDebitNote = require('./CreditDebitNote')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const AccountStatement = require('./AccountStatement')(sequelize);
const Product = require('./Product')(sequelize); // ✅ NEW

// Relationships
User.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasOne(User, { foreignKey: 'dealerId', as: 'user' });

Invoice.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Invoice, { foreignKey: 'dealerId', as: 'invoices' });

Document.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(Document, { foreignKey: 'dealerId', as: 'documents' });

CreditDebitNote.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(CreditDebitNote, { foreignKey: 'dealerId', as: 'creditDebitNotes' });

AccountStatement.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
Dealer.hasMany(AccountStatement, { foreignKey: 'dealerId', as: 'accountStatements' });

// ✅ Optional relation if you want products mapped to dealers or plants later
// Product.belongsTo(Dealer, { foreignKey: 'dealerId', as: 'dealer' });
// Dealer.hasMany(Product, { foreignKey: 'dealerId', as: 'products' });

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
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
  Product, // ✅ Export new model
  syncDatabase,
};
