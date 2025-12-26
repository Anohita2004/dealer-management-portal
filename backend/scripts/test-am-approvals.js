const { User, Role, PaymentRequest, Dealer, RBACEngine } = require('../src/models');
const reportController = require('../src/controllers/reportController');

async function testAM() {
    const user = await User.findOne({
        where: { username: 'ajc_kolkata_area_manager' },
        include: [{ model: Role, as: 'roleDetails' }]
    });

    const req = { user };
    const res = {
        json: (data) => {
            console.log('RESULT_COUNT:', data.length);
            console.log('RESULT:', JSON.stringify(data, null, 2));
        },
        status: (code) => ({ json: (data) => console.log('ERROR', code, data) })
    };

    console.log('--- Testing AM Pending Approvals ---');
    await reportController.getPendingApprovals(req, res);
}

testAM();
