'use strict';

/**
 * Seed helper to create:
 * - One sales_executive user
 * - Assign a few dealers to them via UserDealer
 * - Map some materials to those dealers via DealerMaterial
 *
 * Run: node src/utils/seedSalesExecutiveData.js
 */

const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Role,
  Dealer,
  Material,
  UserDealer,
  DealerMaterial,
} = require('../models');

const DEFAULT_PASSWORD = 'password123';

async function seedSalesExecutiveData() {
  try {
    console.log('🌱 Seeding Sales Executive role data...');

    // 1. Find sales_executive role
    const salesExecRole = await Role.findOne({ where: { name: 'sales_executive' } });
    if (!salesExecRole) {
      throw new Error(
        "Role 'sales_executive' not found. Please run: node src/utils/seedPermissions.js first."
      );
    }

    // 2. Pick a few existing dealers (first 2–3)
    const dealers = await Dealer.findAll({ limit: 3, order: [['createdAt', 'ASC']] });
    if (!dealers.length) {
      throw new Error('No dealers found. Please run hierarchy seeding or create some dealers.');
    }

    // 3. Ensure we have some materials
    let materials = await Material.findAll({ limit: 5, order: [['createdAt', 'ASC']] });
    if (!materials.length) {
      console.log('ℹ️ No materials found, creating a few sample materials...');
      const samples = [
        { materialNumber: 'MAT-001', name: 'Sample Material 1' },
        { materialNumber: 'MAT-002', name: 'Sample Material 2' },
        { materialNumber: 'MAT-003', name: 'Sample Material 3' },
      ];
      for (const s of samples) {
        const [m] = await Material.findOrCreate({
          where: { materialNumber: s.materialNumber },
          defaults: {
            materialNumber: s.materialNumber,
            name: s.name,
            description: s.name,
            uom: 'PCS',
          },
        });
        materials.push(m);
      }
    }

    // 4. Create or find a Sales Executive user
    const [user] = await User.findOrCreate({
      where: { username: 'sales_exec_demo' },
      defaults: {
        username: 'sales_exec_demo',
        email: 'sales_exec_demo@company.com',
        password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        roleId: salesExecRole.id,
        isActive: true,
        isBlocked: false,
      },
    });

    console.log(`✅ Sales Executive user: ${user.username} (ID: ${user.id})`);

    // 5. Assign dealers to this Sales Executive via UserDealer
    for (const dealer of dealers) {
      const [mapping] = await UserDealer.findOrCreate({
        where: { userId: user.id, dealerId: dealer.id },
        defaults: { isPrimary: false },
      });
      console.log(
        `✅ Mapped Sales Executive -> Dealer: ${user.username} -> ${dealer.businessName} (${dealer.dealerCode})`
      );
    }

    // 6. Map materials to those dealers via DealerMaterial (dealer-specific availability)
    for (const dealer of dealers) {
      for (const material of materials) {
        const [dm] = await DealerMaterial.findOrCreate({
          where: { dealerId: dealer.id, materialId: material.id },
          defaults: {
            isActive: true,
            price: 100,
            stockQty: 100,
          },
        });
        if (dm._options && dm._options.isNewRecord) {
          console.log(
            `✅ DealerMaterial mapping created: ${dealer.dealerCode} -> ${material.materialNumber}`
          );
        }
      }
    }

    console.log('\n✅ Sales Executive seed complete.');
    console.log('👉 You can log in as: sales_exec_demo / password123');
  } catch (err) {
    console.error('❌ Error in seedSalesExecutiveData:', err);
    throw err;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seedSalesExecutiveData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedSalesExecutiveData };


