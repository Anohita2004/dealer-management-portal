const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

console.log('🔌 Initializing Database Connection...');

// 1. Try connecting via Connection String (DATABASE_URL) primarily
if (process.env.DATABASE_URL) {
  console.log('✅ Using DATABASE_URL for connection.');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    }
  });
} else {
  // 2. Fallback to individual variables
  // Railway usually provides these, but DATABASE_URL is safer.
  // If running in production w/o DATABASE_URL, this might fail if DB_USER is empty.

  console.log('⚠️ DATABASE_URL not found, using individual DB_* variables.');
  // Check for Railway specific variables if standard ones are missing
  const host = process.env.PGHOST || process.env.DB_HOST;
  const user = process.env.PGUSER || process.env.DB_USER;
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.PGDATABASE || process.env.DB_NAME;
  const port = process.env.PGPORT || process.env.DB_PORT;

  if (!user) {
    console.error('❌ Critical Error: DB_USER/PGUSER is undefined!');
  }

  sequelize = new Sequelize(
    database,
    user,
    password,
    {
      host: host,
      port: port,
      dialect: 'postgres',
      logging: false,
      // Only use SSL if we are sure we are remote (e.g., host contains 'railway')
      // or explicitly requested. Standard Railway internal connection usually needs it.
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the PostgreSQL database:', error);
  }
};

module.exports = { sequelize, testConnection };
