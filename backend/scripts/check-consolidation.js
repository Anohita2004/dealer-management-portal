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

async function checkConsolidation() {
    try {
        await sequelize.authenticate();
        const pairs = [
            ['Invoices', 'invoices'],
            ['Users', 'users'],
            ['Dealers', 'dealers']
        ];

        for (const [p, l] of pairs) {
            console.log(`Checking ${p} vs ${l}:`);
            let pCount = -1, lCount = -1;
            try {
                const [res] = await sequelize.query(`SELECT count(*) FROM "${p}"`);
                pCount = parseInt(res[0].count);
                console.log(` - "${p}": ${pCount} rows`);
            } catch (e) { console.log(` - "${p}": MISSING`); }

            try {
                const [res] = await sequelize.query(`SELECT count(*) FROM "${l}"`);
                lCount = parseInt(res[0].count);
                console.log(` - "${l}": ${lCount} rows`);
            } catch (e) { console.log(` - "${l}": MISSING`); }
        }
    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

checkConsolidation();
