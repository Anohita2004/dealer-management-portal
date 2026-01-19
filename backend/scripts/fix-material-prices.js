const { sequelize } = require('../src/config/database');
const { Material } = require('../src/models');

async function checkAndUpdatePrices() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connection Verified.');

        // 1. Check current prices
        const materials = await Material.findAll();
        console.log(`Found ${materials.length} materials.`);

        const materialsWithNullPrice = materials.filter(m => m.price === null || m.price === undefined || m.price === '0.00' || m.price === 0);

        console.log(`Found ${materialsWithNullPrice.length} materials with null/zero price.`);

        if (materialsWithNullPrice.length > 0) {
            console.log('Updating prices...');
            for (const material of materialsWithNullPrice) {
                // Generate a random price between 100 and 1000
                const randomPrice = (Math.random() * (1000 - 100) + 100).toFixed(2);

                // If it's a specific known material, try to be more realistic (optional, but good for demo)
                let price = randomPrice;
                if (material.name && material.name.toLowerCase().includes('cement')) price = 500.00;
                if (material.name && material.name.toLowerCase().includes('white')) price = 300.00;
                if (material.name && material.name.toLowerCase().includes('adhesive')) price = 150.00;

                console.log(`Updating ${material.materialNumber} (${material.name}) to price: ${price}`);

                material.price = price;
                await material.save();
            }
            console.log('✅ All prices updated.');
        } else {
            console.log('No materials needed updating.');
            // Log a few to verify
            materials.slice(0, 5).forEach(m => console.log(`${m.materialNumber}: ${m.price}`));
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndUpdatePrices();
