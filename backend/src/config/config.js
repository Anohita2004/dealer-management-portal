require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres'
  },

  production: {
    // Fallback to standard Postgres variables (Railway default)
    username: process.env.DB_USER || process.env.PGUSER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB,
    host: process.env.DB_HOST || process.env.PGHOST,
    port: process.env.DB_PORT || process.env.PGPORT || 5432,
    dialect: 'postgres',
    logging: false, // Cleaner logs in production
    dialectOptions: {
      // Uncomment if you see "SSL/TLS required" error
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false
      // }
    }
  }
};
