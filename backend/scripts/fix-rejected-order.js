const { Order, Dealer } = require('../src/models');
const { sequelize } = require('../src/models');

async function fixRejectedOrder() {
    try {
        // Disable logging to see output clearly
        sequelize.options.logging = false;
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const dealers = await Dealer.findAll({ where: { name: 'Ranchi Dealers' } });

        if (dealers.length === 0) {
            console.log('❌ Dealer "Ranchi Dealers" not found.');
            return;
        }

        for (const dealer of dealers) {
            console.log(`Processing Dealer: ${dealer.name}`);

            const orders = await Order.findAll({
                where: {
                    dealerId: dealer.id,
                    status: 'rejected'
                }
            });

            if (orders.length === 0) {
                console.log('   No REJECTED orders found for this dealer.');
            } else {
                for (const order of orders) {
                    console.log(`   Found Rejected Order: ${order.id}`);
                    console.log('   >>> Updating status to APPROVED...');

                    order.status = 'approved';
                    // You might also need to clear rejection reason if it exists
                    if (order.rejectionReason) order.rejectionReason = null;

                    await order.save();
                    console.log('   ✅ Order updated successfully.');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

fixRejectedOrder();
