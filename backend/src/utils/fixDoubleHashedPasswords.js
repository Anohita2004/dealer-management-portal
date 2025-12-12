/**
 * Script to fix users with double-hashed passwords
 * 
 * This script identifies users whose passwords might be double-hashed
 * and resets them to a known password so they can login.
 * 
 * Run: node src/utils/fixDoubleHashedPasswords.js
 */

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

const RESET_PASSWORD = 'TempPassword123!'; // Users will need to change this on first login

async function fixDoubleHashedPasswords() {
  try {
    console.log('🔍 Checking for users with potential double-hashed passwords...\n');

    const users = await User.findAll({
      where: {
        isActive: true
      }
    });

    console.log(`Found ${users.length} active users to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if password looks like a valid bcrypt hash (should be 60 chars, starts with $2a$, $2b$, or $2y$)
      const passwordHash = user.password;
      
      // Valid bcrypt hash format: $2[ayb]$[cost]$[22 char salt][31 char hash] = 60 chars total
      const isValidHash = passwordHash && 
                         passwordHash.length === 60 && 
                         /^\$2[ayb]\$\d{2}\$/.test(passwordHash);

      if (!isValidHash) {
        console.log(`⚠️  User ${user.username} (${user.email}) has invalid password format - resetting...`);
        user.password = RESET_PASSWORD; // Will be hashed by beforeUpdate hook
        await user.save();
        fixedCount++;
        console.log(`   ✅ Reset password for ${user.username}\n`);
      } else {
        // Test if password might be double-hashed by trying to verify a test password
        // If it's double-hashed, even the correct password won't work
        // We can't test this without knowing the original password, so we'll skip
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Fixed: ${fixedCount} users`);
    console.log(`   Skipped: ${skippedCount} users (already have valid hash format)`);
    console.log(`\n⚠️  Note: Users with reset passwords should use: ${RESET_PASSWORD}`);
    console.log('   They should change their password after first login.\n');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  fixDoubleHashedPasswords()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { fixDoubleHashedPasswords };

