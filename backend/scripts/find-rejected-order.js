const { Order, Dealer } = require('../src/models');
const { sequelize } = require('../src/models');

async function findRejectedOrder() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const dealers = await Dealer.findAll({ where: { name: 'Ranchi Dealers' } });

        if (dealers.length === 0) {
            console.log('❌ Dealer "Ranchi Dealers" not found.');
            return;
        }

        for (const dealer of dealers) {
            console.log(`\n🔍 Checking Dealer: ${dealer.name} (${dealer.id})`);
            const orders = await Order.findAll({
                where: { dealerId: dealer.id }
            });

            if (orders.length === 0) {
                console.log('   No orders found for this dealer.');
            } else {
                console.log(`   Found ${orders.length} orders:`);
                orders.forEach(o => {
                    const icon = o.status === 'rejected' ? '🔴' : '⚪';
                    console.log(`   ${icon} Order ID: ${o.id} | Status: ${o.status} | Total: ${o.totalAmount}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

findRejectedOrder();
