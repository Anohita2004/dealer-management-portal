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

async function revertDealers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        // Check dealers vs Dealers
        let hasDealers = false;
        let hasdealers = false;

        try {
            const [res] = await sequelize.query(`SELECT count(*) FROM "Dealers"`);
            console.log(`Dealers: ${res[0].count} rows`);
            hasDealers = true;
        } catch (e) { }

        try {
            const [res] = await sequelize.query(`SELECT count(*) FROM "dealers"`);
            console.log(`dealers: ${res[0].count} rows`);
            hasdealers = true;
        } catch (e) { }

        if (!hasDealers && hasdealers) {
            console.log('🔄 Reverting dealers -> Dealers');
            await sequelize.query(`ALTER TABLE "dealers" RENAME TO "Dealers"`);
            console.log('✅ Done');
        } else {
            console.log('ℹ️ No action needed or manual check required.');
        }

    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

revertDealers();
