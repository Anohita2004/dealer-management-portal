const { Sequelize } = require('sequelize');
const AuditLogModel = require('../src/models/AuditLog');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

const AuditLog = AuditLogModel(sequelize, Sequelize.DataTypes);

async function testAuditLog() {
    try {
        await sequelize.authenticate();
        const logs = await AuditLog.findAll({ limit: 1 });
        console.log('✅ Success! Found AuditLogs:', logs.length);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await sequelize.close();
    }
}

testAuditLog();
