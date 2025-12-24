const { sequelize } = require('../src/models');
const fs = require('fs');
async function check() {
    const [results] = await sequelize.query("SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE column_name LIKE 'approval%' ORDER BY table_name;");
    const output = results.map(r => `${r.table_name}.${r.column_name}: ${r.data_type} (${r.udt_name})`).join('\n');
    fs.writeFileSync('db_columns.txt', output);
    console.log('DONE');
}
check();
