require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');

async function verifySchema() {
    const sequelize = new Sequelize(parseConnectionString(process.env.DATABASE_URL), {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Railway DB');

        const snapshot = JSON.parse(fs.readFileSync('schema_snapshot_full.json', 'utf8'));
        const queryInterface = sequelize.getQueryInterface();
        const railwayTables = await queryInterface.showAllTables();

        console.log(`Checking ${railwayTables.length} tables against snapshot...`);

        const mismatches = [];

        for (const tableName of railwayTables) {
            if (tableName === 'SequelizeMeta') continue;

            if (!snapshot[tableName]) {
                // Table exists in DB but not in snapshot (maybe extra?)
                // console.log(`Difference: Table ${tableName} exists in DB but not in Snapshot.`);
                continue;
            }

            const dbDescription = await queryInterface.describeTable(tableName);
            const snapshotColumns = snapshot[tableName];

            const missingCols = [];

            for (const colName of Object.keys(snapshotColumns)) {
                if (!dbDescription[colName]) {
                    missingCols.push(colName);
                }
            }

            if (missingCols.length > 0) {
                console.log(`❌ Table '${tableName}' is missing columns: ${missingCols.join(', ')}`);
                mismatches.push(tableName);
            }
        }

        // Also check for tables missing entirely from DB
        for (const tableName of Object.keys(snapshot)) {
            if (!railwayTables.includes(tableName)) {
                console.log(`❌ Table '${tableName}' is MISSING entirely from DB.`);
                mismatches.push(tableName);
            }
        }

        if (mismatches.length === 0) {
            console.log('✅ ALL TABLES VALIDATED. Schema matches snapshot.');
        } else {
            console.log(`⚠️ Found issues in ${mismatches.length} tables.`);
            fs.writeFileSync('schema_mismatches.json', JSON.stringify(mismatches));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

function parseConnectionString(url) {
    if (!url) throw new Error("DATABASE_URL is missing");
    return url;
}

verifySchema();
