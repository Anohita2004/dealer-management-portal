// scripts/verify-gps-columns.js
// Verify GPS tracking columns exist

const { sequelize } = require('../src/config/database');

async function verifyColumns() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check columns
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'truck_assignments'
      AND column_name IN (
        'startLocationLat',
        'startLocationLng',
        'startTrackingAt',
        'warehouseArrivedAt',
        'currentEta'
      )
      ORDER BY column_name;
    `);
    
    console.log('GPS Tracking Columns:');
    const expectedColumns = [
      'startLocationLat',
      'startLocationLng',
      'startTrackingAt',
      'warehouseArrivedAt',
      'currentEta'
    ];
    
    const foundColumns = results.map(r => r.column_name);
    expectedColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        const colInfo = results.find(r => r.column_name === col);
        console.log(`  ✅ ${col} (${colInfo.data_type}, nullable: ${colInfo.is_nullable})`);
      } else {
        console.log(`  ❌ ${col} - MISSING`);
      }
    });

    if (foundColumns.length === expectedColumns.length) {
      console.log('\n✅ All GPS tracking columns exist!');
    } else {
      console.log('\n⚠️  Some columns are missing');
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

verifyColumns();

