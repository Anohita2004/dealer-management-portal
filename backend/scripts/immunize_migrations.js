require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function immunizeDatabase() {
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

        // 1. Get list of archived migrations (the "bad" ones)
        const archivedDir = path.join(__dirname, '../src/migrations/archived');
        let archivedFiles = [];
        if (fs.existsSync(archivedDir)) {
            archivedFiles = fs.readdirSync(archivedDir).filter(f => f.endsWith('.js'));
        }

        // Add the current active migration too, just in case
        archivedFiles.push('999999999999-full-schema-sync.js');

        if (archivedFiles.length === 0) {
            console.log('No migrations found to immunize.');
            return;
        }

        console.log(`Found ${archivedFiles.length} migrations to mark as executed.`);

        // 2. Ensure SequelizeMeta exists and has schema
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
                "name" VARCHAR(255) NOT NULL PRIMARY KEY
            );
        `);

        // 3. Mark them as executed (Insert Ignore)
        const transaction = await sequelize.transaction();
        try {
            for (const file of archivedFiles) {
                // Use Insert ON CONFLICT DO NOTHING to match "OR IGNORE" roughly
                // Postgres: ON CONFLICT ("name") DO NOTHING
                await sequelize.query(`
                    INSERT INTO "SequelizeMeta" ("name") VALUES (:name)
                    ON CONFLICT ("name") DO NOTHING;
                `, {
                    replacements: { name: file },
                    transaction
                });
            }
            await transaction.commit();
            console.log('✅ Database immunized against old migrations.');
        } catch (err) {
            await transaction.rollback();
            console.error('❌ Failed during immunization:', err.message);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

function parseConnectionString(url) {
    if (!url) throw new Error("DATABASE_URL is missing");
    return url;
}

immunizeDatabase();
