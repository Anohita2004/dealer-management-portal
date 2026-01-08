require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');

async function inspectSchema() {
    let sequelize;

    // Custom setup to enforce NO SSL for local inspection
    const host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
    const user = process.env.PGUSER || process.env.DB_USER || 'postgres';
    const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';
    const database = process.env.PGDATABASE || process.env.DB_NAME || 'dealer_portal';
    const port = process.env.PGPORT || process.env.DB_PORT || 5432;

    console.log(`Connecting to ${host}:${port}/${database} as ${user}...`);

    sequelize = new Sequelize(database, user, password, {
        host: host,
        port: port,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: false
        }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB (No SSL)');

        // Use Sequelize helper to get tables
        const tables = await sequelize.getQueryInterface().showAllTables();

        // Exclude SequelizeMeta
        const tablesToCheck = tables
            .filter(t => t !== 'SequelizeMeta')
            .sort();

        console.log(`Found ${tablesToCheck.length} tables:`, tablesToCheck.join(', '));

        const processedTables = new Set();
        const allSchemas = {};

        for (const tableName of tablesToCheck) {
            try {
                const schema = await sequelize.getQueryInterface().describeTable(tableName);

                // simplify schema output
                const refined = {};
                for (const [col, details] of Object.entries(schema)) {
                    refined[col] = {
                        type: details.type,
                        allowNull: details.allowNull,
                        defaultValue: details.defaultValue,
                        primaryKey: details.primaryKey
                    };
                }
                allSchemas[tableName] = refined;
                processedTables.add(tableName.toLowerCase());
            } catch (e) {
                console.error(`Error describing ${tableName}:`, e.message);
            }
        }

        fs.writeFileSync('schema_snapshot_full.json', JSON.stringify(allSchemas, null, 2));
        console.log('✅ Full Schema snapshot written to schema_snapshot_full.json');

        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

inspectSchema();
