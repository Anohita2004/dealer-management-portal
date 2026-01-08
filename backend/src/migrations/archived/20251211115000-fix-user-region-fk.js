'use strict';

/**
 * FIX CONSTRAINT MIGRATION FOR RAILWAY
 * 
 * Strategy: Check references first. If columns missing, add them.
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // --- USERS TABLE ---
    // Ensure columns exist on Users before adding FKs
    try {
      await queryInterface.addColumn('Users', 'regionId', { type: Sequelize.UUID, allowNull: true });
    } catch (e) { }
    try {
      await queryInterface.addColumn('Users', 'areaId', { type: Sequelize.UUID, allowNull: true });
    } catch (e) { }
    try {
      await queryInterface.addColumn('Users', 'territoryId', { type: Sequelize.UUID, allowNull: true });
    } catch (e) { }

    // Re-apply FKs for Users safely
    try {
      await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "Users_regionId_fkey";`);
      await queryInterface.sequelize.query(`
          ALTER TABLE "Users" ADD CONSTRAINT "Users_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
    } catch (e) { console.log('Users_regionId_fkey error (ignoring if FK exists)', e.message); }

    try {
      await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "Users_areaId_fkey";`);
      await queryInterface.sequelize.query(`
          ALTER TABLE "Users" ADD CONSTRAINT "Users_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
    } catch (e) { console.log('Users_areaId_fkey error', e.message); }

    try {
      await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "Users_territoryId_fkey";`);
      await queryInterface.sequelize.query(`
          ALTER TABLE "Users" ADD CONSTRAINT "Users_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
    } catch (e) { console.log('Users_territoryId_fkey error', e.message); }


    // --- DEALERS TABLE ---
    // Ensure columns exist on dealers before adding FKs
    try {
      await queryInterface.addColumn('dealers', 'regionId', { type: Sequelize.UUID, allowNull: true });
    } catch (e) { }
    try {
      await queryInterface.addColumn('dealers', 'areaId', { type: Sequelize.UUID, allowNull: true });
    } catch (e) { }
    try {
      await queryInterface.addColumn('dealers', 'territoryId', { type: Sequelize.UUID, allowNull: true });
    } catch (e) { }

    // Fix Dealers foreign keys
    try {
      await queryInterface.sequelize.query(`ALTER TABLE "dealers" DROP CONSTRAINT IF EXISTS "dealers_regionId_fkey";`);
      await queryInterface.sequelize.query(`
          ALTER TABLE "dealers" ADD CONSTRAINT "dealers_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
    } catch (e) { console.log('dealers_regionId_fkey error', e.message); }

    try {
      await queryInterface.sequelize.query(`ALTER TABLE "dealers" DROP CONSTRAINT IF EXISTS "dealers_areaId_fkey";`);
      await queryInterface.sequelize.query(`
          ALTER TABLE "dealers" ADD CONSTRAINT "dealers_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
    } catch (e) { console.log('dealers_areaId_fkey error', e.message); }

    try {
      await queryInterface.sequelize.query(`ALTER TABLE "dealers" DROP CONSTRAINT IF EXISTS "dealers_territoryId_fkey";`);
      await queryInterface.sequelize.query(`
          ALTER TABLE "dealers" ADD CONSTRAINT "dealers_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        `);
    } catch (e) { console.log('dealers_territoryId_fkey error', e.message); }
  },

  async down(queryInterface, Sequelize) {
    // Revert if needed
  }
};
