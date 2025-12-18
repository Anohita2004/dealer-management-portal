/**
 * Script to reset passwords for specific users
 * 
 * Usage:
 *   node src/utils/resetUserPasswords.js <username1> <username2> ...
 *   node src/utils/resetUserPasswords.js --all  (resets all active users)
 * 
 * Default password: TempPassword123!
 */

const { sequelize, User } = require('../models');

const DEFAULT_PASSWORD = 'TempPassword123!';

async function resetUserPasswords(usernames = []) {
  try {
    let users;

    if (usernames.length === 1 && usernames[0] === '--all') {
      console.log('🔄 Resetting passwords for ALL active users...\n');
      users = await User.findAll({
        where: { isActive: true }
      });
    } else {
      console.log(`🔄 Resetting passwords for users: ${usernames.join(', ')}...\n`);
      users = await User.findAll({
        where: {
          username: usernames,
          isActive: true
        }
      });

      if (users.length === 0) {
        console.log('❌ No active users found with the provided usernames');
        return;
      }

      if (users.length < usernames.length) {
        const foundUsernames = users.map(u => u.username);
        const notFound = usernames.filter(u => !foundUsernames.includes(u));
        console.log(`⚠️  Warning: Users not found: ${notFound.join(', ')}\n`);
      }
    }

    console.log(`Found ${users.length} user(s) to reset\n`);

    for (const user of users) {
      user.password = DEFAULT_PASSWORD; // Will be hashed by beforeUpdate hook
      await user.save();
      console.log(`✅ Reset password for: ${user.username} (${user.email})`);
    }

    console.log(`\n✅ Successfully reset ${users.length} password(s)`);
    console.log(`\n📝 Default password: ${DEFAULT_PASSWORD}`);
    console.log('   Users should change their password after first login.\n');

  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  const usernames = process.argv.slice(2);
  
  if (usernames.length === 0) {
    console.log('Usage:');
    console.log('  node src/utils/resetUserPasswords.js <username1> <username2> ...');
    console.log('  node src/utils/resetUserPasswords.js --all');
    process.exit(1);
  }

  resetUserPasswords(usernames)
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

module.exports = { resetUserPasswords };

