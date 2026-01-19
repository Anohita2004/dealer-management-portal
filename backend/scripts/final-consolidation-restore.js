const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

async function finalConsolidation() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        // Consolidate Invoices
        try {
            await sequelize.query(`DROP TABLE "Invoices" CASCADE`);
            console.log('✅ Dropped redundant PascalCase "Invoices"');
        } catch (e) {
            console.log(`Skip Invoices drop: ${e.message}`);
        }

        // Ensure others are correct
        const checkList = ['roles', 'permissions', 'orders', 'invoices', 'Users', 'Dealers', 'AuditLogs'];
        for (const t of checkList) {
            try {
                await sequelize.query(`SELECT 1 FROM "${t}" LIMIT 1`);
                console.log(`✨ Table "${t}" is verified.`);
            } catch (e) {
                console.log(`❌ Table "${t}" MISSING: ${e.message}`);
            }
        }

    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

finalConsolidation();
