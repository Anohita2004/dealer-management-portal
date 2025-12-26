const { PaymentRequest, Dealer, User, Role } = require('../src/models');
const fs = require('fs');

async function checkPayment() {
    const id = 'ddaeb2ff-6a4a-4c6d-b33c-97553c779dda';
    const payment = await PaymentRequest.findByPk(id, {
        include: [{ model: Dealer, as: 'dealer' }]
    });

    if (!payment) {
        fs.writeFileSync('payment_debug.json', JSON.stringify({ error: 'Payment not found' }));
        return;
    }

    const ams = await User.findAll({
        include: [{ model: Role, as: 'roleDetails', where: { name: 'area_manager' } }]
    });

    const debugData = {
        paymentId: payment.id,
        approvalStage: payment.approvalStage,
        approvalStatus: payment.approvalStatus,
        dealerAreaId: payment.dealer?.areaId,
        areaManagers: ams.map(u => ({
            username: u.username,
            areaId: u.areaId,
            match: u.areaId === payment.dealer?.areaId
        }))
    };

    fs.writeFileSync('payment_debug.json', JSON.stringify(debugData, null, 2));
}

checkPayment();
