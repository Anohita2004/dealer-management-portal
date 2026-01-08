require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');

const TARGET_TABLES = ['regions', 'territories', 'areas'];

async function forceFixTables() {
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
        console.log('✅ Connected');

        const schemaSnapshot = JSON.parse(fs.readFileSync('schema_snapshot_full.json', 'utf8'));
        const dataDump = JSON.parse(fs.readFileSync('local_data_dump.json', 'utf8'));

        await sequelize.query("SET session_replication_role = 'replica';");

        for (const tableName of TARGET_TABLES) {
            if (!schemaSnapshot[tableName]) {
                console.warn(`⚠️ Table ${tableName} not found in snapshot. Skipping.`);
                continue;
            }

            console.log(`\n🔧 Fixing ${tableName}...`);

            // 1. Drop Table directly
            await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
            console.log(`  Dropped ${tableName}`);

            // 2. Generate CREATE TABLE SQL
            // We use simple generation mapping.
            let columnsSql = [];
            const columns = schemaSnapshot[tableName];

            for (const [colName, colDef] of Object.entries(columns)) {
                let type = colDef.type;
                // Fix USER-DEFINED types for safety (map to VARCHAR if definition shouldn't matter for storage, 
                // but if it's an enum we might need to be careful. For now, assuming VARCHAR is safe for restoration)
                if (type === 'USER-DEFINED') type = 'VARCHAR(255)';
                if (type.includes('TIMESTAMP')) type = 'TIMESTAMPTZ';

                // Handle primary key
                let chunk = `"${colName}" ${type}`;

                if (colDef.primaryKey) chunk += ' PRIMARY KEY';
                else if (colDef.allowNull === false) chunk += ' NOT NULL';

                // Handle defaults (simplified)
                if (colDef.defaultValue) {
                    let def = colDef.defaultValue;
                    if (typeof def === 'string') {
                        if (!def.includes('minvalue') && !def.includes('::')) { // avoid some sequence artifacts
                            if (def === 'gen_random_uuid()') chunk += " DEFAULT gen_random_uuid()";
                            else if (def.includes('now') || def === 'CURRENT_TIMESTAMP') chunk += " DEFAULT NOW()";
                            else if (!def.includes('(')) chunk += ` DEFAULT '${def.replace(/'/g, "")}'`;
                        }
                    }
                }

                columnsSql.push(chunk);
            }

            const createSql = `CREATE TABLE "${tableName}" (\n  ${columnsSql.join(',\n  ')}\n);`;

            try {
                await sequelize.query(createSql);
                console.log(`  Created ${tableName}`);
            } catch (e) {
                console.error(`  ❌ Creation failed: ${e.message}`);
                console.error(createSql);
                continue;
            }

            // 3. Import Data
            if (dataDump[tableName] && dataDump[tableName].length > 0) {
                const rows = dataDump[tableName];

                // Bulk insert
                const CHUNK_SIZE = 100;
                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE);
                    // Need to stringify JSON columns manually if using raw SQL, 
                    // but sequelize.queryInterface.bulkInsert usually handles it.
                    // Let's use bulkInsert queryInterface
                    try {
                        await sequelize.getQueryInterface().bulkInsert(tableName, chunk);
                    } catch (err) {
                        // Fallback?
                        console.error(`  Insert failed chunk ${i}: ${err.message}`);
                    }
                }
                console.log(`  Imported ${rows.length} rows`);
            } else {
                console.log(`  No data to import for ${tableName}`);
            }
        }

        await sequelize.query("SET session_replication_role = 'origin';");
        console.log('\n✅ Fix Complete');

    } catch (error) {
        console.error('Error:', error);
    }
}

function parseConnectionString(url) {
    if (!url) throw new Error("DATABASE_URL is missing");
    return url;
}

forceFixTables();
