/**
 * Comprehensive Hierarchy Seed Script
 * Creates complete organizational structure for testing dashboards
 * 
 * Run: node src/utils/seedHierarchy.js
 */

const bcrypt = require('bcryptjs');
const { 
  sequelize, 
  User, 
  Role, 
  Region, 
  Area, 
  Territory, 
  Dealer,
  Order,
  Invoice,
  PaymentRequest,
  Campaign,
  Product
} = require('../models');

const DEFAULT_PASSWORD = 'password123'; // Change in production!

async function seedHierarchy() {
  try {
    console.log('🌱 Starting comprehensive hierarchy seeding...\n');

    // 1. Get all roles (must be seeded first via seedPermissions.js)
    const roles = await Role.findAll();
    if (roles.length === 0) {
      throw new Error('❌ No roles found! Please run: node src/utils/seedPermissions.js first');
    }
    
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role;
    });

    // Verify required roles exist
    const requiredRoles = ['super_admin', 'technical_admin', 'regional_admin', 'area_manager', 
                          'territory_manager', 'dealer_admin', 'dealer_staff'];
    const missingRoles = requiredRoles.filter(r => !roleMap[r]);
    if (missingRoles.length > 0) {
      throw new Error(`❌ Missing required roles: ${missingRoles.join(', ')}. Please run: node src/utils/seedPermissions.js`);
    }

    console.log('✅ Roles loaded:', Object.keys(roleMap).join(', '));

    // 2. Create Super Admin
    console.log('\n📌 Creating Super Admin...');
    const superAdmin = await User.findOrCreate({
      where: { username: 'superadmin' },
      defaults: {
        username: 'superadmin',
        email: 'superadmin@company.com',
        password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        roleId: roleMap['super_admin'].id,
        isActive: true,
        isBlocked: false
      }
    });
    console.log(`✅ Super Admin: ${superAdmin[0].username} (ID: ${superAdmin[0].id})`);

    // 3. Create Technical Admin
    console.log('\n📌 Creating Technical Admin...');
    const technicalAdmin = await User.findOrCreate({
      where: { username: 'techadmin' },
      defaults: {
        username: 'techadmin',
        email: 'techadmin@company.com',
        password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        roleId: roleMap['technical_admin'].id,
        isActive: true,
        isBlocked: false
      }
    });
    console.log(`✅ Technical Admin: ${technicalAdmin[0].username} (ID: ${technicalAdmin[0].id})`);

    // 4. Create Regions
    console.log('\n📌 Creating Regions...');
    const regions = [];
    const regionData = [
      { name: 'North Region', centroidLat: 28.6139, centroidLng: 77.2090 }, // Delhi
      { name: 'West Region', centroidLat: 19.0760, centroidLng: 72.8777 }, // Mumbai
      { name: 'South Region', centroidLat: 12.9716, centroidLng: 77.5946 }, // Bangalore
      { name: 'East Region', centroidLat: 22.5726, centroidLng: 88.3639 }  // Kolkata
    ];

    for (const reg of regionData) {
      const [region, created] = await Region.findOrCreate({
        where: { name: reg.name },
        defaults: reg
      });
      // Save explicitly to ensure it's in the database
      if (created) {
        await region.save();
      }
      // Verify the region exists in DB by querying it
      const dbRegion = await Region.findByPk(region.id);
      if (!dbRegion) {
        throw new Error(`Failed to create region: ${reg.name}`);
      }
      regions.push(dbRegion);
      console.log(`✅ Region: ${dbRegion.name} (ID: ${dbRegion.id})`);
    }

    // 5. Create Regional Admins
    console.log('\n📌 Creating Regional Admins...');
    const regionalAdmins = [];
    const regionalAdminData = [
      { username: 'regional_admin_north', email: 'ra.north@company.com', region: regions[0] },
      { username: 'regional_admin_west', email: 'ra.west@company.com', region: regions[1] },
      { username: 'regional_admin_south', email: 'ra.south@company.com', region: regions[2] },
      { username: 'regional_admin_east', email: 'ra.east@company.com', region: regions[3] }
    ];

    for (const rad of regionalAdminData) {
      const [ra] = await User.findOrCreate({
        where: { username: rad.username },
        defaults: {
          username: rad.username,
          email: rad.email,
          password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
          roleId: roleMap['regional_admin'].id,
          regionId: rad.region.id,
          managerId: superAdmin[0].id,
          isActive: true,
          isBlocked: false
        }
      });
      regionalAdmins.push(ra);
      console.log(`✅ Regional Admin: ${ra.username} for ${rad.region.name}`);
    }

    // 6. Create Areas under each Region
    console.log('\n📌 Creating Areas...');
    const areas = [];
    const areaData = [
      { name: 'North Area 1', code: 'NA1', region: regions[0] },
      { name: 'North Area 2', code: 'NA2', region: regions[0] },
      { name: 'West Area 1', code: 'WA1', region: regions[1] },
      { name: 'West Area 2', code: 'WA2', region: regions[1] },
      { name: 'South Area 1', code: 'SA1', region: regions[2] },
      { name: 'South Area 2', code: 'SA2', region: regions[2] },
      { name: 'East Area 1', code: 'EA1', region: regions[3] }
    ];

    for (const area of areaData) {
      const [a] = await Area.findOrCreate({
        where: { name: area.name, regionId: area.region.id },
        defaults: {
          name: area.name,
          code: area.code,
          regionId: area.region.id
        }
      });
      areas.push(a);
      console.log(`✅ Area: ${a.name} in ${area.region.name}`);
    }

    // 7. Create Area Managers
    console.log('\n📌 Creating Area Managers...');
    const areaManagers = [];
    const areaManagerData = [
      { username: 'area_manager_na1', email: 'am.na1@company.com', area: areas[0], regionalAdmin: regionalAdmins[0] },
      { username: 'area_manager_na2', email: 'am.na2@company.com', area: areas[1], regionalAdmin: regionalAdmins[0] },
      { username: 'area_manager_wa1', email: 'am.wa1@company.com', area: areas[2], regionalAdmin: regionalAdmins[1] },
      { username: 'area_manager_wa2', email: 'am.wa2@company.com', area: areas[3], regionalAdmin: regionalAdmins[1] },
      { username: 'area_manager_sa1', email: 'am.sa1@company.com', area: areas[4], regionalAdmin: regionalAdmins[2] },
      { username: 'area_manager_sa2', email: 'am.sa2@company.com', area: areas[5], regionalAdmin: regionalAdmins[2] },
      { username: 'area_manager_ea1', email: 'am.ea1@company.com', area: areas[6], regionalAdmin: regionalAdmins[3] }
    ];

    for (const amd of areaManagerData) {
      const [am] = await User.findOrCreate({
        where: { username: amd.username },
        defaults: {
          username: amd.username,
          email: amd.email,
          password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
          roleId: roleMap['area_manager'].id,
          regionId: amd.area.regionId,
          areaId: amd.area.id,
          managerId: amd.regionalAdmin.id,
          isActive: true,
          isBlocked: false
        }
      });
      areaManagers.push(am);
      console.log(`✅ Area Manager: ${am.username} for ${amd.area.name}`);
    }

    // 8. Create Territories under each Area
    console.log('\n📌 Creating Territories...');
    const territories = [];
    const territoryData = [
      { name: 'Territory NA1-T1', code: 'T1', area: areas[0] },
      { name: 'Territory NA1-T2', code: 'T2', area: areas[0] },
      { name: 'Territory NA2-T1', code: 'T3', area: areas[1] },
      { name: 'Territory WA1-T1', code: 'T4', area: areas[2] },
      { name: 'Territory WA1-T2', code: 'T5', area: areas[2] },
      { name: 'Territory WA2-T1', code: 'T6', area: areas[3] },
      { name: 'Territory SA1-T1', code: 'T7', area: areas[4] },
      { name: 'Territory SA2-T1', code: 'T8', area: areas[5] },
      { name: 'Territory EA1-T1', code: 'T9', area: areas[6] }
    ];

    for (const terr of territoryData) {
      const [t] = await Territory.findOrCreate({
        where: { name: terr.name, areaId: terr.area.id },
        defaults: {
          name: terr.name,
          code: terr.code,
          regionId: terr.area.regionId,
          areaId: terr.area.id
        }
      });
      territories.push(t);
      console.log(`✅ Territory: ${t.name} in ${terr.area.name}`);
    }

    // 9. Create Territory Managers
    console.log('\n📌 Creating Territory Managers...');
    const territoryManagers = [];
    const territoryManagerData = [
      { username: 'territory_manager_t1', email: 'tm.t1@company.com', territory: territories[0], areaManager: areaManagers[0] },
      { username: 'territory_manager_t2', email: 'tm.t2@company.com', territory: territories[1], areaManager: areaManagers[0] },
      { username: 'territory_manager_t3', email: 'tm.t3@company.com', territory: territories[2], areaManager: areaManagers[1] },
      { username: 'territory_manager_t4', email: 'tm.t4@company.com', territory: territories[3], areaManager: areaManagers[2] },
      { username: 'territory_manager_t5', email: 'tm.t5@company.com', territory: territories[4], areaManager: areaManagers[2] },
      { username: 'territory_manager_t6', email: 'tm.t6@company.com', territory: territories[5], areaManager: areaManagers[3] },
      { username: 'territory_manager_t7', email: 'tm.t7@company.com', territory: territories[6], areaManager: areaManagers[4] },
      { username: 'territory_manager_t8', email: 'tm.t8@company.com', territory: territories[7], areaManager: areaManagers[5] },
      { username: 'territory_manager_t9', email: 'tm.t9@company.com', territory: territories[8], areaManager: areaManagers[6] }
    ];

    for (const tmd of territoryManagerData) {
      const [tm] = await User.findOrCreate({
        where: { username: tmd.username },
        defaults: {
          username: tmd.username,
          email: tmd.email,
          password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
          roleId: roleMap['territory_manager'].id,
          regionId: tmd.territory.regionId,
          areaId: tmd.territory.areaId,
          territoryId: tmd.territory.id,
          managerId: tmd.areaManager.id,
          isActive: true,
          isBlocked: false
        }
      });
      territoryManagers.push(tm);
      console.log(`✅ Territory Manager: ${tm.username} for ${tmd.territory.name}`);
    }

    // 10. Create Dealers
    console.log('\n📌 Creating Dealers...');
    const dealers = [];
    const dealerData = [
      { code: 'D001', name: 'ABC Distributors', city: 'Delhi', territory: territories[0], lat: 28.6139, lng: 77.2090 },
      { code: 'D002', name: 'XYZ Enterprises', city: 'Gurgaon', territory: territories[0], lat: 28.4089, lng: 77.0378 },
      { code: 'D003', name: 'PQR Trading', city: 'Noida', territory: territories[1], lat: 28.5355, lng: 77.3910 },
      { code: 'D004', name: 'Mumbai Traders', city: 'Mumbai', territory: territories[3], lat: 19.0760, lng: 72.8777 },
      { code: 'D005', name: 'Pune Distributors', city: 'Pune', territory: territories[3], lat: 18.5204, lng: 73.8567 },
      { code: 'D006', name: 'Nashik Suppliers', city: 'Nashik', territory: territories[4], lat: 19.9975, lng: 73.7898 },
      { code: 'D007', name: 'Bangalore Wholesale', city: 'Bangalore', territory: territories[6], lat: 12.9716, lng: 77.5946 },
      { code: 'D008', name: 'Chennai Traders', city: 'Chennai', territory: territories[7], lat: 13.0827, lng: 80.2707 },
      { code: 'D009', name: 'Kolkata Suppliers', city: 'Kolkata', territory: territories[8], lat: 22.5726, lng: 88.3639 }
    ];

    for (const dd of dealerData) {
      const [dealer] = await Dealer.findOrCreate({
        where: { dealerCode: dd.code },
        defaults: {
          dealerCode: dd.code,
          businessName: dd.name,
          contactPerson: `Contact ${dd.code}`,
          email: `contact@${dd.code.toLowerCase()}.com`,
          phoneNumber: `9876543${dd.code.slice(-3)}`,
          address: `Address ${dd.code}`,
          city: dd.city,
          state: dd.city === 'Delhi' || dd.city === 'Gurgaon' || dd.city === 'Noida' ? 'Delhi' : 
                 dd.city === 'Mumbai' || dd.city === 'Pune' || dd.city === 'Nashik' ? 'Maharashtra' :
                 dd.city === 'Bangalore' || dd.city === 'Chennai' ? 'Karnataka' : 'West Bengal',
          pincode: '110001',
          gstNumber: `27${dd.code}U9603R1ZM`,
          regionId: dd.territory.regionId,
          areaId: dd.territory.areaId,
          territoryId: dd.territory.id,
          managerId: territoryManagers.find(tm => tm.territoryId === dd.territory.id)?.id,
          lat: dd.lat,
          lng: dd.lng,
          isActive: true,
          isBlocked: false
        }
      });
      dealers.push(dealer);
      console.log(`✅ Dealer: ${dealer.businessName} (${dealer.dealerCode}) in ${dd.territory.name}`);
    }

    // 11. Create Dealer Admins
    console.log('\n📌 Creating Dealer Admins...');
    const dealerAdmins = [];
    for (let i = 0; i < dealers.length; i++) {
      const dealer = dealers[i];
      const tm = territoryManagers.find(tm => tm.territoryId === dealer.territoryId);
      const [da] = await User.findOrCreate({
        where: { username: `dealer_admin_${dealer.dealerCode.toLowerCase()}` },
        defaults: {
          username: `dealer_admin_${dealer.dealerCode.toLowerCase()}`,
          email: `admin@${dealer.dealerCode.toLowerCase()}.com`,
          password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
          roleId: roleMap['dealer_admin'].id,
          regionId: dealer.regionId,
          areaId: dealer.areaId,
          territoryId: dealer.territoryId,
          dealerId: dealer.id,
          managerId: tm?.id,
          isActive: true,
          isBlocked: false
        }
      });
      dealerAdmins.push(da);
      console.log(`✅ Dealer Admin: ${da.username} for ${dealer.businessName}`);
    }

    // 12. Create Dealer Staff
    console.log('\n📌 Creating Dealer Staff...');
    const dealerStaff = [];
    for (let i = 0; i < dealers.length; i++) {
      const dealer = dealers[i];
      const dealerAdmin = dealerAdmins[i];
      const [ds] = await User.findOrCreate({
        where: { username: `staff_${dealer.dealerCode.toLowerCase()}` },
        defaults: {
          username: `staff_${dealer.dealerCode.toLowerCase()}`,
          email: `staff@${dealer.dealerCode.toLowerCase()}.com`,
          password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
          roleId: roleMap['dealer_staff'].id,
          regionId: dealer.regionId,
          areaId: dealer.areaId,
          territoryId: dealer.territoryId,
          dealerId: dealer.id,
          managerId: dealerAdmin.id,
          isActive: true,
          isBlocked: false
        }
      });
      dealerStaff.push(ds);
      console.log(`✅ Dealer Staff: ${ds.username} for ${dealer.businessName}`);
    }

    // 13. Create Sample Orders (for testing dashboards)
    console.log('\n📌 Creating Sample Orders...');
    const orders = [];
    for (let i = 0; i < 5; i++) {
      const dealer = dealers[i % dealers.length];
      const staff = dealerStaff[i % dealerStaff.length];
      const order = await Order.create({
        dealerId: dealer.id,
        orderNumber: `ORD-${Date.now()}-${i}`,
        status: i % 3 === 0 ? 'Pending' : i % 3 === 1 ? 'Approved' : 'Processing',
        approvalStage: i % 3 === 0 ? 'territory_manager' : null,
        approvalStatus: i % 3 === 0 ? 'pending' : 'approved',
        totalAmount: (i + 1) * 50000,
        notes: `Sample order ${i + 1}`
      });
      orders.push(order);
    }
    console.log(`✅ Created ${orders.length} sample orders`);

    // 14. Create Sample Invoices
    console.log('\n📌 Creating Sample Invoices...');
    const invoices = [];
    for (let i = 0; i < 5; i++) {
      const dealer = dealers[i % dealers.length];
      const invoice = await Invoice.create({
        dealerId: dealer.id,
        orderId: orders[i]?.id || null,
        invoiceNumber: `INV-${Date.now()}-${i}`,
        baseAmount: (i + 1) * 40000,
        taxAmount: (i + 1) * 7200,
        totalAmount: (i + 1) * 47200,
        paidAmount: i % 2 === 0 ? (i + 1) * 47200 : 0,
        balanceAmount: i % 2 === 0 ? 0 : (i + 1) * 47200,
        status: i % 2 === 0 ? 'paid' : 'unpaid',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        approvalStatus: 'approved'
      });
      invoices.push(invoice);
    }
    console.log(`✅ Created ${invoices.length} sample invoices`);

    // 15. Create Sample Campaigns
    console.log('\n📌 Creating Sample Campaigns...');
    const campaigns = [];
    for (let i = 0; i < 3; i++) {
      const region = regions[i % regions.length];
      const campaign = await Campaign.create({
        campaignName: `Campaign ${i + 1} - ${region.name}`,
        campaignType: ['promotion', 'sales_scheme', 'seasonal_offer'][i],
        description: `Sample campaign ${i + 1}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        discountPercentage: (i + 1) * 5,
        targetAudience: [{ type: 'region', entityId: region.id }],
        isActive: true,
        approvalStatus: 'approved'
      });
      campaigns.push(campaign);
    }
    console.log(`✅ Created ${campaigns.length} sample campaigns`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ HIERARCHY SEEDING COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   - Super Admin: 1`);
    console.log(`   - Technical Admin: 1`);
    console.log(`   - Regions: ${regions.length}`);
    console.log(`   - Regional Admins: ${regionalAdmins.length}`);
    console.log(`   - Areas: ${areas.length}`);
    console.log(`   - Area Managers: ${areaManagers.length}`);
    console.log(`   - Territories: ${territories.length}`);
    console.log(`   - Territory Managers: ${territoryManagers.length}`);
    console.log(`   - Dealers: ${dealers.length}`);
    console.log(`   - Dealer Admins: ${dealerAdmins.length}`);
    console.log(`   - Dealer Staff: ${dealerStaff.length}`);
    console.log(`   - Sample Orders: ${orders.length}`);
    console.log(`   - Sample Invoices: ${invoices.length}`);
    console.log(`   - Sample Campaigns: ${campaigns.length}`);
    console.log('\n🔑 Default Password for all users: password123');
    console.log('\n👤 Test Users:');
    console.log('   - Super Admin: superadmin / password123');
    console.log('   - Technical Admin: techadmin / password123');
    console.log('   - Regional Admin (North): regional_admin_north / password123');
    console.log('   - Area Manager: area_manager_na1 / password123');
    console.log('   - Territory Manager: territory_manager_t1 / password123');
    console.log('   - Dealer Admin: dealer_admin_d001 / password123');
    console.log('   - Dealer Staff: staff_d001 / password123');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error seeding hierarchy:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedHierarchy()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedHierarchy };

