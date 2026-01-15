const { Sequelize } = require('sequelize');
require('dotenv').config();

const RAILWAY_DB_URL = "postgresql://postgres:OYFQvqCNIbELTiKSefWkqePAVLSaAHuO@caboose.proxy.rlwy.net:55214/railway";

async function updateSchema() {
    const sequelize = new Sequelize(RAILWAY_DB_URL, {
        dialect: 'postgres',
        logging: console.log,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Railway DB');

        console.log('--- Adding barcode column to materials ---');
        try {
            await sequelize.query('ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "barcode" VARCHAR(255) UNIQUE;');
            console.log('✅ Added "barcode" to "materials"');
        } catch (e) {
            console.error('❌ Error adding barcode column:', e.message);
        }

        console.log('--- Creating scanned_logs table ---');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "scanned_logs" (
                "id" UUID PRIMARY KEY,
                "barcode" VARCHAR(255) NOT NULL,
                "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "scannedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);
        console.log('✅ Table "scanned_logs" checked/created');

        console.log('--- Creating goods_receipts table ---');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "goods_receipts" (
                "id" UUID PRIMARY KEY,
                "receiptNumber" VARCHAR(255) NOT NULL UNIQUE,
                "orderId" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "dealerId" UUID NOT NULL REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                "receivedItems" JSON NOT NULL,
                "receivedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "remarks" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);
        console.log('✅ Table "goods_receipts" checked/created');

        console.log('\n🚀 Schema update completed successfully on Railway!');
    } catch (error) {
        console.error('❌ Failed to update Railway schema:', error);
    } finally {
        await sequelize.close();
    }
}

updateSchema();
