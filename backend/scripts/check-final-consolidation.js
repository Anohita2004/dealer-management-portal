const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

async function checkFinalConsolidation() {
    try {
        const checks = ['AuditLogs', 'auditlogs', 'Invoices', 'invoices'];
        for (const t of checks) {
            try {
                const [res] = await sequelize.query(`SELECT count(*) FROM "${t}"`);
                console.log(`Table "${t}": ${res[0].count} rows.`);
            } catch (e) {
                console.log(`Table "${t}": MISSING`);
            }
        }
    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

checkFinalConsolidation();
