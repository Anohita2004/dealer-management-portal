const { sequelize } = require('./src/models');

async function inspectSchema() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const tables = ['Dealers', 'Users', 'Products', 'Invoices', 'Campaigns', 'CreditDebitNotes', 'AccountStatements'];
        // Note: Table names might be lowercase or pluralized in DB. I'll include likely variations if first check fails, 
        // but usually sequelize.getQueryInterface().describeTable takes the actual table name.

        // Helper to try variations
        const describe = async (tableName) => {
            try {
                const schema = await sequelize.getQueryInterface().describeTable(tableName);
                console.log(`\n=== SCEMA FOR: ${tableName} ===`);
                console.log(JSON.stringify(schema, null, 2));
            } catch (e) {
                try {
                    // Try lowercase plural
                    const plural = tableName.toLowerCase() + 's';
                    const schema = await sequelize.getQueryInterface().describeTable(plural);
                    console.log(`\n=== SCEMA FOR: ${plural} (fallback) ===`);
                    console.log(JSON.stringify(schema, null, 2));
                } catch (e2) {
                    console.log(`Could not describe table ${tableName}: ${e.message}`);
                }
            }
        };

        for (const table of tables) {
            await describe(table);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

inspectSchema();
