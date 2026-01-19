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

async function fixDealers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        // Check Dealers vs dealers
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

        if (hasDealers && !hasdealers) {
            console.log('🔄 Renaming Dealers -> dealers');
            await sequelize.query(`ALTER TABLE "Dealers" RENAME TO "dealers"`);
            console.log('✅ Done');
        } else if (!hasDealers && hasdealers) {
            console.log('✅ already has "dealers".');
        } else if (hasDealers && hasdealers) {
            console.log('⚠️ Both exist. Assuming "dealers" is what we want?');
            // If Dealers has data and dealers is empty, drop dealers and rename Dealers.
            // For now, assume manual intervention if both exist.
        }

    } catch (err) { console.error(err); }
    finally { await sequelize.close(); }
}

fixDealers();
