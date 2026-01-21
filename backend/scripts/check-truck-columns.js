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

async function checkTruckColumns() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const [results, metadata] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'trucks';
        `);

        console.log('Columns in trucks table:');
        results.forEach(r => console.log(`- ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));

    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
    } finally {
        await sequelize.close();
    }
}

checkTruckColumns();
