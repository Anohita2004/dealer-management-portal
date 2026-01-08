require('dotenv').config();
const { Sequelize } = require('sequelize');

async function fixPermissions() {
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

        // 1. DROP permissions table
        await sequelize.query('DROP TABLE IF EXISTS permissions CASCADE');
        console.log('✅ Dropped permissions table');

        // 2. CREATE permissions table correctly
        await sequelize.query(`
            CREATE TABLE permissions (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) NOT NULL,
                description VARCHAR(255),
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ Created permissions table');

        // 3. Re-import data for permissions
        const fs = require('fs');
        const dump = JSON.parse(fs.readFileSync('local_data_dump.json', 'utf8'));
        const perms = dump['permissions'];

        if (perms && perms.length > 0) {
            // Adjust sequence
            await sequelize.query("SET session_replication_role = 'replica';");

            // We need to make sure we map fields correctly if dump has different casing? 
            // Dump: id, key, description, createdAt, updatedAt. Match!

            await sequelize.query(`TRUNCATE TABLE permissions CASCADE`); // clear just in case

            // Bulk insert
            const CHUNK_SIZE = 100;
            for (let i = 0; i < perms.length; i += CHUNK_SIZE) {
                const chunk = perms.slice(i, i + CHUNK_SIZE);
                await sequelize.getQueryInterface().bulkInsert('permissions', chunk);
            }
            console.log(`✅ Imported ${perms.length} permissions`);

            await sequelize.query("SET session_replication_role = 'origin';");

            // Fix sequence
            await sequelize.query(`SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions) + 1)`);
            console.log('✅ Sequence corrected');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

function parseConnectionString(url) {
    if (!url) throw new Error("DATABASE_URL is missing");
    return url;
}

fixPermissions();
