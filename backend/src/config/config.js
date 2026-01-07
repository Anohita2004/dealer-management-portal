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
    // Railway/Heroku often provide a single URL variable. This is the most reliable method.
    use_env_variable: 'DATABASE_URL',
    // Fallbacks if DATABASE_URL isn't set
    username: process.env.DB_USER || process.env.PGUSER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    database: process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB,
    host: process.env.DB_HOST || process.env.PGHOST,
    port: process.env.DB_PORT || process.env.PGPORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      // Required for Railway/Heroku Postgres connections
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
