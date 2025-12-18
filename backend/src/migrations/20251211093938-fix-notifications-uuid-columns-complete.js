'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'Notifications';
    
    // First, delete all existing data to avoid null issues
    await queryInterface.sequelize.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    
    // Get current column info
    const [columns] = await queryInterface.sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}';
    `);
    
    const columnMap = {};
    columns.forEach(col => {
      columnMap[col.column_name] = { type: col.data_type, nullable: col.is_nullable };
    });
    
    // Fix id column
    if (columnMap.id && columnMap.id.type !== 'uuid') {
      // Drop primary key and column
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${tableName}_pkey";
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" DROP COLUMN "id";
      `);
    }
    
    // Recreate id column as UUID
    if (!columnMap.id || columnMap.id.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" 
        ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" ADD PRIMARY KEY ("id");
      `);
    } else if (columnMap.id.nullable === 'YES') {
      // Fix nullability
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" ALTER COLUMN "id" SET NOT NULL;
      `);
    }
    
    // Fix relatedId column
    if (columnMap.relatedId && columnMap.relatedId.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" DROP COLUMN "relatedId";
      `);
    }
    if (!columnMap.relatedId || columnMap.relatedId.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" 
        ADD COLUMN "relatedId" UUID;
      `);
    }
    
    // Fix senderId column
    if (columnMap.senderId && columnMap.senderId.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" DROP COLUMN "senderId";
      `);
    }
    if (!columnMap.senderId || columnMap.senderId.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" 
        ADD COLUMN "senderId" UUID;
      `);
    }
    
    // Fix recipientId column
    if (columnMap.recipientId && columnMap.recipientId.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" DROP COLUMN "recipientId";
      `);
    }
    if (!columnMap.recipientId || columnMap.recipientId.type !== 'uuid') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${tableName}" 
        ADD COLUMN "recipientId" UUID;
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert if needed
  }
};

