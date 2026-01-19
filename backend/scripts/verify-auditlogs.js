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

async function verifyAuditLogs() {
    try {
        await sequelize.authenticate();
        const [res] = await sequelize.query(`SELECT 1 FROM "AuditLogs" LIMIT 1`);
        console.log('✅ AuditLogs table exists.');
    } catch (err) {
        console.log('❌ AuditLogs table error:', err.message);
        try {
            await sequelize.query(`ALTER TABLE "auditlogs" RENAME TO "AuditLogs"`);
            console.log('✅ Fixed: Renamed auditlogs to AuditLogs.');
        } catch (err2) {
            console.log('❌ Fixed failed:', err2.message);
        }
    } finally {
        await sequelize.close();
    }
}

verifyAuditLogs();
