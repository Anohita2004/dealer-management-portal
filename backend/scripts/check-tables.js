const { sequelize } = require('../src/models');
async function check() {
    const results = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(JSON.stringify(results[0], null, 2));
}
check();
