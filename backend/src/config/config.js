require('dotenv').config();

// Helper to log config (sanitized)
const logConfig = (config, type) => {
  const sanitized = { ...config };
  if (sanitized.password) sanitized.password = '*****';
  console.log(`[Config] Resolved ${type} config:`, JSON.stringify(sanitized, null, 2));
};

const productionConfig = {
  dialect: 'postgres',
  logging: console.log, // Enable logging to see what's happening
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// Priority 1: DATABASE_URL (Standard Railway/Heroku)
if (process.env.DATABASE_URL) {
  console.log('[Config] Using DATABASE_URL');
  productionConfig.use_env_variable = 'DATABASE_URL';
  productionConfig.url = process.env.DATABASE_URL; // Explicitly set url for some Sequelize versions
}
// Priority 2: Individual variables
else {
  console.log('[Config] DATABASE_URL not found, using individual variables');

  productionConfig.username = process.env.DB_USER || process.env.PGUSER || process.env.POSTGRES_USER;
  productionConfig.password = process.env.DB_PASSWORD || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  productionConfig.database = process.env.DB_NAME || process.env.PGDATABASE || process.env.POSTGRES_DB;
  productionConfig.host = process.env.DB_HOST || process.env.PGHOST;
  productionConfig.port = process.env.DB_PORT || process.env.PGPORT || 5432;

  // Validate critical fields
  if (!productionConfig.host) {
    console.error('[Config] CRITICAL ERROR: Database HOST is missing! Please ensure DB_HOST, PGHOST, or DATABASE_URL is set in environment variables.');
  }
}

logConfig(productionConfig, 'production');

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
