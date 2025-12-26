const { Role, Permission } = require('../src/models');

async function fixPermissions() {
    try {
        console.log('🔄 Fixing Pricing permissions for Dealer Admin and Staff using Sequelize models...');

        // Role names: dealer_admin, dealer_staff
        // Permission keys: pricing.view, pricing.request, pricing.manage

        const roleNames = ['dealer_admin', 'dealer_staff'];
        const permissionKeys = ['pricing.view', 'pricing.request', 'pricing.manage'];

        const permissions = await Permission.findAll({
            where: { key: permissionKeys }
        });

        console.log(`Found ${permissions.length} permissions.`);

        for (const roleName of roleNames) {
            const role = await Role.findOne({ where: { name: roleName } });
            if (role) {
                console.log(`Updating role: ${roleName}`);
                await role.addPermissions(permissions);
            } else {
                console.warn(`Role not found: ${roleName}`);
            }
        }

        console.log('✅ Permissions updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing permissions:', err);
        process.exit(1);
    }
}

fixPermissions();
