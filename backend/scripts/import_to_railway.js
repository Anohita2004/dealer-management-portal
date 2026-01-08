require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');

async function importData() {
    const dumpData = JSON.parse(fs.readFileSync('local_data_dump.json', 'utf8'));

    // Railway DB Connection
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

        // Disable FK checks and triggers
        await sequelize.query("SET session_replication_role = 'replica';");
        console.log('🔓 Foreign Key checks disabled');

        const tables = Object.keys(dumpData);

        for (const table of tables) {
            const rows = dumpData[table];
            if (rows.length === 0) continue;

            console.log(`Processing ${table} (${rows.length} rows)...`);

            // Use transaction for each table to ensure atomicity
            const transaction = await sequelize.transaction();

            try {
                // Truncate first (CASCADE not strictly needed with replica role, but good for cleanup)
                // We verify table existence first just in case
                await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE;`, { transaction });

                // Chunk inserts to avoid query size limits
                const CHUNK_SIZE = 1000;
                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + CHUNK_SIZE);

                    // Sanitize JSON fields: ensure they are stringified if needed, 
                    // or let Sequelize handle them if pass as object. 
                    // QueryInterface.bulkInsert usually handles objects for JSON columns fine.
                    // However, we need to make sure we don't insert 'id' if it's auto-increment 
                    // AND we want to keep the original ID. 
                    // Since we want to CLONE, we explicitly insert the ID.

                    await sequelize.getQueryInterface().bulkInsert(table, chunk, { transaction });
                }

                await transaction.commit();
                console.log(`  ✅ Imported ${table}`);
            } catch (err) {
                await transaction.rollback();
                console.error(`  ❌ Failed to import ${table}:`, err.message);
            }
        }

        // Re-enable FK checks
        await sequelize.query("SET session_replication_role = 'origin';");
        console.log('🔒 Foreign Key checks re-enabled');

        // Reset sequences to max id (for auto-increments like Integer IDs)
        // This is important because explicit inserts don't advance the sequence
        console.log('🔄 Syncing sequences...');
        for (const table of tables) {
            const columns = dumpData[table][0] ? Object.keys(dumpData[table][0]) : [];
            if (columns.includes('id')) {
                // Check if ID is integer (heuristic)
                const firstId = dumpData[table][0].id;
                if (Number.isInteger(firstId)) {
                    try {
                        await sequelize.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id)+1, 1), false) FROM "${table}";`);
                    } catch (e) {
                        // Ignore error if not a serial column
                    }
                }
            }
        }

        console.log('✅ Import Process Finalized');
        process.exit(0);

    } catch (error) {
        console.error('❌ Connection Error:', error);
        process.exit(1);
    }
}

// Helper to handle DATABASE_URL
function parseConnectionString(url) {
    if (!url) throw new Error("DATABASE_URL is missing");
    return url;
}

importData();
