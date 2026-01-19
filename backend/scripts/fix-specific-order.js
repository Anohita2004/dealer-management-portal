const { sequelize, Order } = require('../src/models');

async function fixSpecificOrder() {
    try {
        const orderId = '0fdbbb12-0efc-4f61-9935-34aa2430850e';

        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const order = await Order.findByPk(orderId);

        if (!order) {
            console.log(`❌ Order ${orderId} NOT FOUND.`);
            return;
        }

        console.log(`\n🔍 Found Order: ${order.id}`);
        console.log(`   Current Status: ${order.status}`);
        console.log(`   Current Stage: ${order.approvalStage}`);

        console.log('\n🔄 Updating Order to APPROVED state...');

        // Force approve the order
        order.status = 'approved';
        order.approvalStage = 'approved'; // Set stage to final approved state
        order.rejectionReason = null;

        // If you have a specific workflow log or history table, you might want to clear the rejection entry there too, 
        // but typically resetting the main order status is sufficient for the app to pick it up.

        await order.save();
        console.log('✅ Order 0fdbbb12-0efc-4f61-9935-34aa2430850e has been force-approved.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

fixSpecificOrder();
