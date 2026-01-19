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

async function verifyOthers() {
    try {
        await sequelize.authenticate();
        const tables = ['AuditLogs', 'Users', 'Dealers', 'Roles', 'Permissions', 'orders', 'invoices'];
        for (const t of tables) {
            try {
                await sequelize.query(`SELECT 1 FROM "${t}" LIMIT 1`);
                console.log(`✅ ${t} exists.`);
            } catch (e) {
                console.log(`❌ ${t} missing: ${e.message}`);
            }
        }
    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

verifyOthers();
