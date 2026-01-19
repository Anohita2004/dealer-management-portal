const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

async function checkUsers() {
    try {
        const [res] = await sequelize.query(`SELECT count(*) FROM "Users"`);
        console.log('Users count:', res[0].count);
    } catch (err) {
        console.log('Users table error:', err.message);
        try {
            const [res2] = await sequelize.query(`SELECT count(*) FROM "users"`);
            console.log('users (lower) count:', res2[0].count);
        } catch (err2) {
            console.log('users (lower) table error:', err2.message);
        }
    } finally {
        await sequelize.close();
    }
}

checkUsers();
