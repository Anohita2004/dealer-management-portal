const fs = require("fs");
const path = require("path");
const { sequelize } = require("../config/database");
const Sequelize = require("sequelize");

const db = {};
const basename = path.basename(__filename);

// Load all models
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js"
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Run associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Removed auto-sync since we use migrations
// db.syncDatabase = async () => {
//   try {
//     await db.sequelize.sync({ alter: false, force: false });

//     console.log("✅ Database synchronized successfully.");
//   } catch (error) {
//     console.error("❌ Error synchronizing database:", error);
//   }
// };

// EXPORT ALL
module.exports = db;
