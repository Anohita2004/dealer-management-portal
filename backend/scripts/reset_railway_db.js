const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'caboose.proxy.rlwy.net',
    database: 'railway',
    password: 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO',
    port: 55214,
    ssl: {
        rejectUnauthorized: false
    }
});

async function resetDb() {
    try {
        await client.connect();
        console.log('Connected to Railway DB.');

        console.log('Dropping public schema...');
        await client.query('DROP SCHEMA public CASCADE');

        console.log('Recreating public schema...');
        await client.query('CREATE SCHEMA public');
        await client.query('GRANT ALL ON SCHEMA public TO postgres');
        await client.query('GRANT ALL ON SCHEMA public TO public');

        console.log('✅ Database reset successfully (WIPED).');
    } catch (err) {
        console.error('❌ Error resetting DB:', err);
    } finally {
        await client.end();
    }
}

resetDb();
