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

async function findTableCasing() {
    try {
        const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE 'role%'
    `, { type: QueryTypes.SELECT });

        for (const t of tables) {
            const [res] = await sequelize.query(`SELECT count(*) FROM "${t.table_name}"`);
            console.log(`Table "${t.table_name}": ${res[0].count} rows.`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

findTableCasing();
