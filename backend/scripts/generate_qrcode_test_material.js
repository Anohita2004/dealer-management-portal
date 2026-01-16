const { sequelize, Material } = require('../src/models');

async function setupTestMaterial() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected.');

        const barcode = 'WAREHOUSE-MAT-001';
        const materialNumber = 'MAT-TEST-001';

        const [material, created] = await Material.findOrCreate({
            where: { barcode },
            defaults: {
                materialNumber: materialNumber,
                name: 'Test Warehouse Item (Cement 50kg)',
                description: 'A test material for QR scanning verification',
                uom: 'BAG',
                plant: 'MUMBAI',
                stock: 100,
                barcode: barcode
            }
        });

        if (created) {
            console.log(`✅ Created new test material: ${material.name}`);
        } else {
            console.log(`ℹ️ Test material already exists: ${material.name}`);
        }

        console.log('\n==================================================');
        console.log('🧪 QR CODE TEST DATA');
        console.log('==================================================');
        console.log(`Material Name:  ${material.name}`);
        console.log(`Material No:    ${material.materialNumber}`);
        console.log(`Barcode Value:  ${material.barcode}`);
        console.log('==================================================');

        // Generate a simple QR code URL for the user
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(barcode)}`;

        console.log('\n📱 TO TEST SCANNING:');
        console.log('1. Open this URL in your browser to see the QR Code:');
        console.log(`   ${qrUrl}`);
        console.log('2. Open your mobile app (logged in) and use the Scan feature.');
        console.log('3. Scan the QR code image from your screen.');

        console.log('\n💻 TO TEST VIA API (CURL):');
        console.log(`curl -X POST http://localhost:3000/api/barcodes/scan \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -H "Authorization: Bearer <YOUR_AUTH_TOKEN>" \\`);
        console.log(`  -d "{\\"barcode\\": \\"${barcode}\\"}"`);
        console.log('==================================================\n');

    } catch (error) {
        console.error('❌ Error setting up test material:', error);
    } finally {
        await sequelize.close();
    }
}

setupTestMaterial();
