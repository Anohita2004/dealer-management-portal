const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

async function updateProductionOrder() {
    try {
        console.log('🔄 Connecting to Railway Production DB...');
        await sequelize.authenticate();
        console.log('✅ Connected to Production DB.');

        const orderId = '0fdbbb12-0efc-4f61-9935-34aa2430850e';

        const [results, metadata] = await sequelize.query(`
      UPDATE "Orders"
      SET "status" = 'approved', "approvalStage" = 'approved', "rejectionReason" = NULL
      WHERE "id" = :id
      RETURNING "id", "status", "approvalStage";
    `, {
            replacements: { id: orderId }
        });

        if (results.length > 0) {
            console.log(`✅ Production Order ${orderId} UPDATED successfully.`);
            console.log(results[0]);
        } else {
            console.log(`❌ Order ${orderId} not found in Production DB.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

updateProductionOrder();
