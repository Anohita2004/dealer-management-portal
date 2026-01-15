require('dotenv').config();
const { sequelize } = require('./src/models');

async function checkSchema() {
    try {
        const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'barcode';
    `);

        if (results.length > 0) {
            console.log('✅ Column "barcode" exists in table "materials".');
        } else {
            console.log('❌ Column "barcode" does NOT exist in table "materials".');
        }

        const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('scanned_logs', 'goods_receipts');
    `);

        console.log('Tables found:', tables.map(t => t.table_name));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSchema();
