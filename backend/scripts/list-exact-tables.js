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

async function listExactTables() {
    try {
        const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `, { type: QueryTypes.SELECT });

        console.log('EXACT TABLE LIST:');
        tables.forEach(t => {
            console.log(`- "${t.table_name}"`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

listExactTables();
