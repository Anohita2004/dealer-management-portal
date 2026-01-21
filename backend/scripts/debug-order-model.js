const { Sequelize } = require('sequelize');
const OrderModel = require('../src/models/Order');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

const Order = OrderModel(sequelize, Sequelize.DataTypes);

console.log('Model Name:', Order.name);
console.log('Table Name:', Order.tableName);
console.log('Raw Attributes:', Object.keys(Order.rawAttributes).join(', '));

async function testFetch() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');
        const count = await Order.count();
        console.log('Count result:', count);
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

testFetch();
