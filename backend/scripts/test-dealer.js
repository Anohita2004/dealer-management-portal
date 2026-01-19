const { Sequelize } = require('sequelize');
const DealerModel = require('../src/models/Dealer');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

const Dealer = DealerModel(sequelize, Sequelize.DataTypes);

async function testDealer() {
    try {
        await sequelize.authenticate();
        const ds = await Dealer.findAll({ limit: 1 });
        console.log('✅ Found Dealers:', ds.length);
    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await sequelize.close();
    }
}

testDealer();
