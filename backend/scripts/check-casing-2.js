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

async function checkCasing() {
    try {
        await sequelize.authenticate();
        const checks = ['RolePermissions', 'rolepermissions', 'auditlogs', 'AuditLogs'];
        for (const t of checks) {
            try {
                await sequelize.query(`SELECT 1 FROM "${t}" LIMIT 1`);
                console.log(`✅ Table "${t}" exists.`);
            } catch (e) {
                // console.log(`❌ Table "${t}" missing.`);
            }
        }
    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

checkCasing();
