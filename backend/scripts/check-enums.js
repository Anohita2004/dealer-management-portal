const { sequelize } = require('../src/models');
const fs = require('fs');
async function check() {
    const [results] = await sequelize.query("SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname LIKE 'enum_%' ORDER BY t.typname, e.enumsortorder;");
    const enums = {};
    results.forEach(r => {
        if (!enums[r.typname]) enums[r.typname] = [];
        enums[r.typname].push(r.enumlabel);
    });
    fs.writeFileSync('enum_report.json', JSON.stringify(enums, null, 2));
    console.log('DONE');
}
check();
