const { sequelize } = require('../src/models');

async function forceUpdate() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const [results, metadata] = await sequelize.query(`
      UPDATE "Orders"
      SET "status" = 'approved', "updatedAt" = NOW()
      WHERE "dealerId" IN (
        SELECT "id" FROM "Dealers" WHERE "name" = 'Ranchi Dealers'
      )
      AND "status" = 'rejected'
      RETURNING "id", "status";
    `);

        if (results.length > 0) {
            console.log(`✅ Successfully updated ${results.length} order(s) to 'approved'.`);
            results.forEach(r => console.log(`   - Order ID: ${r.id}`));
        } else {
            console.log('ℹ️ No rejected orders found for "Ranchi Dealers".');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

forceUpdate();
