'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the incorrect foreign key constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" 
      DROP CONSTRAINT IF EXISTS "Users_regionId_fkey";
    `);
    
    // Recreate with correct table name (regions, not Regions)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" 
      ADD CONSTRAINT "Users_regionId_fkey" 
      FOREIGN KEY ("regionId") 
      REFERENCES "regions"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    
    // Fix areaId and territoryId as well
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" 
      DROP CONSTRAINT IF EXISTS "Users_areaId_fkey";
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" 
      ADD CONSTRAINT "Users_areaId_fkey" 
      FOREIGN KEY ("areaId") 
      REFERENCES "areas"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" 
      DROP CONSTRAINT IF EXISTS "Users_territoryId_fkey";
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" 
      ADD CONSTRAINT "Users_territoryId_fkey" 
      FOREIGN KEY ("territoryId") 
      REFERENCES "territories"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    
    // Fix Dealers foreign keys
    await queryInterface.sequelize.query(`
      ALTER TABLE "dealers" 
      DROP CONSTRAINT IF EXISTS "dealers_regionId_fkey";
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "dealers" 
      ADD CONSTRAINT "dealers_regionId_fkey" 
      FOREIGN KEY ("regionId") 
      REFERENCES "regions"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "dealers" 
      DROP CONSTRAINT IF EXISTS "dealers_areaId_fkey";
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "dealers" 
      ADD CONSTRAINT "dealers_areaId_fkey" 
      FOREIGN KEY ("areaId") 
      REFERENCES "areas"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "dealers" 
      DROP CONSTRAINT IF EXISTS "dealers_territoryId_fkey";
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE "dealers" 
      ADD CONSTRAINT "dealers_territoryId_fkey" 
      FOREIGN KEY ("territoryId") 
      REFERENCES "territories"("id") 
      ON DELETE SET NULL 
      ON UPDATE CASCADE;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Revert if needed
  }
};

