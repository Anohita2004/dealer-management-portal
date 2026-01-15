const { Sequelize } = require('sequelize');

const RAILWAY_DB_URL = "postgresql://postgres:OYFQvqCNIbELTiKSefWkqePAVLSaAHuO@caboose.proxy.rlwy.net:55214/railway";

async function updateSchema() {
    const sequelize = new Sequelize(RAILWAY_DB_URL, {
        dialect: 'postgres',
        logging: console.log,
        dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Railway DB');

        console.log('--- Creating rakes table ---');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "rakes" (
                "id" UUID PRIMARY KEY,
                "rakeNumber" VARCHAR(255) NOT NULL UNIQUE,
                "arrivalDate" TIMESTAMP WITH TIME ZONE NOT NULL,
                "status" VARCHAR(50) DEFAULT 'Pending',
                "source" VARCHAR(255),
                "destination" VARCHAR(255),
                "totalQuantity" DECIMAL(15, 2),
                "damagedQuantity" DECIMAL(15, 2) DEFAULT 0,
                "approvalStatus" VARCHAR(50) DEFAULT 'pending',
                "approvedBy" UUID,
                "exceptions" TEXT,
                "regionId" UUID,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);

        console.log('--- Creating railway_receipts table ---');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "railway_receipts" (
                "id" UUID PRIMARY KEY,
                "rrNumber" VARCHAR(255) NOT NULL UNIQUE,
                "rrDate" TIMESTAMP WITH TIME ZONE NOT NULL,
                "rakeId" UUID REFERENCES "rakes"("id") ON DELETE SET NULL ON UPDATE CASCADE,
                "consignor" VARCHAR(255),
                "consignee" VARCHAR(255),
                "freightAmount" DECIMAL(15, 2),
                "weight" DECIMAL(15, 2),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
            );
        `);

        console.log('\n🚀 Rake and RR tables created on Railway!');
    } catch (error) {
        console.error('❌ Failed to update Railway schema:', error);
    } finally {
        await sequelize.close();
    }
}

updateSchema();
