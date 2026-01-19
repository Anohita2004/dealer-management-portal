const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize('railway', 'postgres', 'OYFQvqCNIbELTiKSefWkqePAVLSaAHuO', {
    host: 'caboose.proxy.rlwy.net',
    port: 55214,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    }
});

async function thoroughCleanup() {
    try {
        await sequelize.authenticate();
        const results = await sequelize.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `, { type: QueryTypes.SELECT });

        console.log('Results Sample:', JSON.stringify(results[0]));

        // Attempt to extract table names no matter the structure
        let tableNames = [];
        results.forEach(val => {
            if (typeof val === 'string') tableNames.push(val);
            else if (Array.isArray(val)) tableNames.push(...val);
            else if (val.table_name) tableNames.push(val.table_name);
            else if (val.TABLE_NAME) tableNames.push(val.TABLE_NAME);
        });

        console.log('Found tables:', tableNames.join(', '));

        const pascalMap = {
            'auditlogs': 'AuditLogs',
            'chatmessages': 'ChatMessages',
            'conversations': 'Conversations',
            'inventories': 'Inventories',
            'messages': 'Messages',
            'notifications': 'Notifications',
            'participants': 'Participants',
            'permissions': 'Permissions',
            'products': 'Products',
            'roles': 'Roles',
            'materials': 'Materials',
            'invoices': 'Invoices'
        };

        for (const t of tableNames) {
            if (!t) continue;
            const target = pascalMap[t.toLowerCase()];
            if (target && t !== target) {
                console.log(`🔄 Renaming "${t}" to "${target}"...`);
                try {
                    await sequelize.query(`ALTER TABLE "${t}" RENAME TO "${target}"`);
                    console.log(`✅ Success.`);
                } catch (e) {
                    console.error(`❌ Failed: ${e.message}`);
                }
            }
        }

        console.log('✨ Restoration Complete.');
    } catch (err) { console.error('❌ Error:', err.message); }
    finally { await sequelize.close(); }
}

thoroughCleanup();
