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

async function checkAccess() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');
        const count = await Dealer.count();
        console.log(`✅ Dealers count (PascalCase): ${count}`);
    } catch (err) {
        console.error(`❌ Error accessing Dealers: ${err.message}`);
    } finally {
        await sequelize.close();
    }
}

checkAccess();
