require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');

async function exportData() {
    // Local DB Connection
    const sequelize = new Sequelize(
        process.env.PGDATABASE || 'dealer_portal',
        process.env.PGUSER || 'postgres',
        process.env.PGPASSWORD || 'postgres',
        {
            host: process.env.PGHOST || 'localhost',
            port: process.env.PGPORT || 5432,
            dialect: 'postgres',
            logging: false,
            dialectOptions: { ssl: false }
        }
    );

    try {
        await sequelize.authenticate();
        console.log(`✅ Connected to Local DB: ${sequelize.config.host}:${sequelize.config.port}/${sequelize.config.database}`);

        // Get list of tables using Sequelize helper
        const allTables = await sequelize.getQueryInterface().showAllTables();
        const tables = allTables.filter(t => t !== 'SequelizeMeta').sort();

        console.log(`Found ${tables.length} tables to export:`, tables.join(', '));

        const allData = {};

        for (const table of tables) {
            console.log(`Exporting ${table}...`);
            try {
                const rows = await sequelize.query(`SELECT * FROM "${table}"`, {
                    type: sequelize.QueryTypes.SELECT
                });
                allData[table] = rows;
                console.log(`  -> ${rows.length} rows`);
            } catch (err) {
                console.error(`  ❌ Failed to export ${table}:`, err.message);
            }
        }

        fs.writeFileSync('local_data_dump.json', JSON.stringify(allData, null, 2));
        console.log('✅ Data export completed: local_data_dump.json');

        // Verify output
        const stats = fs.statSync('local_data_dump.json');
        console.log(`Dump file size: ${stats.size} bytes`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

exportData();
