// scripts/check-enum-status.js
// Check truck_assignments status enum values

const { sequelize } = require('../src/config/database');

async function checkEnum() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check enum values
    const [results] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::enum_truck_assignments_status))::text AS status_value;
    `);
    
    console.log('Current status enum values:');
    results.forEach(r => console.log(`  - ${r.status_value}`));
    
    // Check if en_route_to_warehouse exists
    const hasNewStatus = results.some(r => r.status_value === 'en_route_to_warehouse');
    if (hasNewStatus) {
      console.log('\n✅ en_route_to_warehouse status exists');
    } else {
      console.log('\n⚠️  en_route_to_warehouse status not found - may need manual enum update');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
    await sequelize.close();
    process.exit(1);
  }
}

checkEnum();

