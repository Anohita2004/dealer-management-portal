const { PaymentRequest } = require('../src/models');

async function fixPaymentStatus() {
    try {
        console.log('🔄 Syncing payment status with workflow stages...');

        // Find all payments where approvalStage is NOT dealer_admin but status IS dealer_pending
        const payments = await PaymentRequest.findAll({
            where: {
                approvalStatus: 'pending',
            }
        });

        let count = 0;
        for (const p of payments) {
            const expectedStatus = `${p.approvalStage}_pending`;
            if (p.approvalStage && p.status !== expectedStatus) {
                console.log(`📍 Updating Payment ${p.id}: ${p.status} -> ${expectedStatus}`);
                p.status = expectedStatus;
                await p.save();
                count++;
            }
        }

        console.log(`✅ Successfully synced ${count} payments.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error syncing payments:', err);
        process.exit(1);
    }
}

fixPaymentStatus();
