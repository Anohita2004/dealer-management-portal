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

async function renameToMatchError() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        const map = {
            'Roles': 'roles',
            'Permissions': 'permissions'
        };

        for (const [p, l] of Object.entries(map)) {
            try {
                await sequelize.query(`ALTER TABLE "${p}" RENAME TO "${l}"`);
                console.log(`✅ Renamed ${p} to ${l}`);
            } catch (e) {
                console.log(`Skip ${p}: ${e.message}`);
            }
        }
    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

renameToMatchError();
