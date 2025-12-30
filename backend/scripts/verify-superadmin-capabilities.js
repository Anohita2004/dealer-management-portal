const { Region, Area, Territory, Dealer, Material, Campaign, Order, OrderItem, sequelize } = require('../src/models');
const inventoryService = require('../src/services/inventoryService'); // Adjust path
const { Op } = require('sequelize');

async function verifySuperAdminCapabilities() {
    const t = await sequelize.transaction();
    try {
        console.log('🚀 Starting Super Admin Capabilities Verification...\n');

        // 1. Geography Creation
        console.log('1️⃣  Testing Geography Creation (Region -> Area -> Territory)...');
        const region = await Region.create({
            name: `Test Region ${Date.now()}`,
            geojson: { type: 'Polygon', coordinates: [] }
        }, { transaction: t });

        const area = await Area.create({
            name: `Test Area ${Date.now()}`,
            regionId: region.id
        }, { transaction: t });

        const territory = await Territory.create({
            name: `Test Territory ${Date.now()}`,
            areaId: area.id,
            regionId: region.id
        }, { transaction: t });

        console.log(`   ✅ Created Region: ${region.name} (${region.id})`);
        console.log(`   ✅ Created Area: ${area.name} (${area.id})`);
        console.log(`   ✅ Created Territory: ${territory.name} (${territory.id})`);

        // 2. Dealer Assignment
        console.log('\n2️⃣  Testing Dealer Assignment...');
        const dealer = await Dealer.create({
            businessName: `Test Dealer ${Date.now()}`,
            dealerCode: `D${Date.now()}`,
            regionId: region.id,
            areaId: area.id,
            territoryId: territory.id, // Assigned to all 3
            isActive: true,
            status: 'active'
        }, { transaction: t });
        console.log(`   ✅ Created Dealer assigned to Territory: ${dealer.businessName}`);

        // 3. Material & Inventory
        console.log('\n3️⃣  Testing Material & Inventory Management...');
        const material = await Material.create({
            materialNumber: `MAT-${Date.now()}`,
            name: 'Test Material',
            stock: 100, // Initial stock
            plant: 'P001'
        }, { transaction: t });
        console.log(`   ✅ Created Material with Stock: ${material.stock}`);

        // 4. Campaign Assignment
        console.log('\n4️⃣  Testing Campaign Assignment (Targeting Region)...');
        const campaign = await Campaign.create({
            campaignName: 'Test Regional Campaign',
            campaignType: 'promotion',
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            targetAudience: [{ type: 'region', entityId: region.id }], // Target the region
            isActive: true
        }, { transaction: t });
        console.log(`   ✅ Created Campaign targeting Region: ${region.id}`);

        // Verify targeting logic (simulate finding campaigns for this dealer)
        // The logic in campaignController checks for: targetAudience contains {type:'region', entityId: dealer.regionId}
        const isTargeted = campaign.targetAudience.some(target =>
            (target.type === 'region' && target.entityId === dealer.regionId)
        );
        console.log(`   ✅ Verification: Does Campaign target Dealer's Region? ${isTargeted ? 'YES' : 'NO'}`);

        // 5. Order & Stock Deduction
        console.log('\n5️⃣  Testing Order Placement & Stock Deduction...');
        const order = await Order.create({
            dealerId: dealer.id,
            orderNumber: `ORD-${Date.now()}`,
            status: 'Approved',
            approvalStatus: 'approved',
            totalAmount: 100
        }, { transaction: t });

        await OrderItem.create({
            orderId: order.id,
            materialId: material.id,
            qty: 10,
            unitPrice: 10
        }, { transaction: t });

        // Manually trigger stock reduction (usually called by workflow/controller)
        // We need to reload order with items for the service to work
        const reloadedOrder = await Order.findByPk(order.id, {
            include: [{ model: OrderItem, as: 'items' }],
            transaction: t
        });

        // Call the service method directly to test logic
        // reduceStockOnOrderApproval usually creates a transaction if none passed, or uses the one passed.
        // We'll reimplement the core logic here to verify it inside OUR transaction efficiently without mocking the service's transaction handling entirely if it's complex.
        // Actually, inventoryService.reduceStockOnOrderApproval accepts a transaction.

        await inventoryService.reduceStockOnOrderApproval(order.id, t);

        const updatedMaterial = await Material.findByPk(material.id, { transaction: t });
        console.log(`   ✅ Stock after Order (Qty 10): ${updatedMaterial.stock} (Expected: 90)`);

        if (updatedMaterial.stock === 90) {
            console.log('   🎉 STOCK MANAGEMENT LOGIC VERIFIED!');
        } else {
            console.error('   ❌ Stock verification failed!');
        }

        // Rollback
        await t.rollback();
        console.log('\n✅ Verification Complete. Transaction rolled back (no DB changes persisted).');

    } catch (error) {
        console.error('❌ Verification Error:', error);
        if (t) await t.rollback();
    }
}

verifySuperAdminCapabilities();
