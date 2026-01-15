const { Sequelize } = require('sequelize');

const RAILWAY_DB_URL = "postgresql://postgres:OYFQvqCNIbELTiKSefWkqePAVLSaAHuO@caboose.proxy.rlwy.net:55214/railway";

async function verify() {
    const sequelize = new Sequelize(RAILWAY_DB_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
    });

    try {
        await sequelize.authenticate();

        const [columns] = await sequelize.query(`
            SELECT column_name, table_name 
            FROM information_schema.columns 
            WHERE column_name = 'barcode';
        `);

        console.log('Columns found:', columns);

        const [tables] = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('materials', 'Materials', 'scanned_logs', 'goods_receipts');
        `);

        console.log('Tables found:', tables.map(t => t.table_name));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

verify();
