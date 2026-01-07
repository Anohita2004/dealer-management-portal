require('dotenv').config();

// Construct production config conditionally
const productionConfig = {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// If DATABASE_URL is present (standard Railway/Heroku), use it.
// Otherwise, fall back to individual environment variables.
if (process.env.DATABASE_URL) {
  productionConfig.use_env_variable = 'DATABASE_URL';
} else {
  productionConfig.username = process.env.DB_USER || process.env.PGUSER || process.env.POSTGRES_USER;
  productionConfig.password = process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  productionConfig.database = process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB;
  productionConfig.host = process.env.DB_HOST || process.env.PGHOST;
  productionConfig.port = process.env.DB_PORT || process.env.PGPORT || 5432;
}

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres'
  },
  production: productionConfig
};
