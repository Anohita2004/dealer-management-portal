require('dotenv').config();
const { Sequelize } = require('sequelize');

async function debugPermissions() {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        // Describe Key
        try {
            const description = await sequelize.getQueryInterface().describeTable('permissions');
            console.log('Columns found:');
            Object.keys(description).forEach(col => console.log(` - ${col}`));
        } catch (e) {
            console.error('Table permissions description failed:', e.message);
        }

        // Try raw query
        try {
            const rows = await sequelize.query('SELECT * FROM permissions LIMIT 1');
            console.log('Raw query result:', rows[0]);
        } catch (e) {
            console.error('Raw query failed:', e.message);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugPermissions();
