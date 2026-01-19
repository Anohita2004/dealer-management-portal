const { Sequelize } = require('sequelize');
const RoleModel = require('../src/models/Role');
const PermissionModel = require('../src/models/Permission');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

const Role = RoleModel(sequelize, Sequelize.DataTypes);
const Permission = PermissionModel(sequelize, Sequelize.DataTypes);

async function testAuth() {
    try {
        await sequelize.authenticate();
        const roles = await Role.findAll({ limit: 1 });
        console.log('✅ Found Roles:', roles.length);
        const perms = await Permission.findAll({ limit: 1 });
        console.log('✅ Found Permissions:', perms.length);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await sequelize.close();
    }
}

testAuth();
