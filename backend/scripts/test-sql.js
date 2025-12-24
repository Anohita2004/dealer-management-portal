const { User, Role, Order, Dealer } = require('../src/models');
const RBACEngine = require('../src/services/rbacEngine');

async function test() {
    const user = await User.findOne({
        where: { username: 'ajc_kolkata_territory_manager' },
        include: [{ model: Role, as: 'roleDetails' }]
    });

    const role = user.roleDetails?.name || user.role;
    const scopeWhere = await RBACEngine.buildScopeWhereClause(user, "Order");

    const workflowCondition = {
        approvalStage: role,
        approvalStatus: "pending",
    };

    try {
        console.log('--- Testing Orders ---');
        await Order.findAll({
            where: { ...scopeWhere, ...workflowCondition },
            include: [{ model: Dealer, as: "dealer", attributes: ["businessName"] }],
            logging: (sql) => console.log('SQL:', sql)
        });
        console.log('SUCCESS');
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}
test();
