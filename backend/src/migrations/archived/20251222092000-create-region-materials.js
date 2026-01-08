'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // Check if table exists
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.region_materials')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0] || !tableExists[0].to_regclass) {
      console.log('🚧 region_materials table missing. Creating it now...');
      try {
        await queryInterface.createTable('region_materials', {
          id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
          regionId: {
            type: Sequelize.UUID, allowNull: false,
            references: { model: 'regions', key: 'id' },
            onDelete: 'CASCADE', onUpdate: 'CASCADE',
          },
          materialId: {
            type: Sequelize.UUID, allowNull: false,
            // If 'materials' missing, this safely fails in catch block
          },
          isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
          createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
          updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        });
      } catch (e) {
        console.log('❌ Failed to create region_materials (likely missing references):', e.message);
      }
    } else {
      console.log('⚠️ Table region_materials already exists, skipping creation...');
    }

    // Constraint (safe add)
    try {
      await queryInterface.addConstraint('region_materials', {
        fields: ['regionId', 'materialId'],
        type: 'unique',
        name: 'region_materials_region_material_unique',
      });
    } catch (error) {
      console.log('⚠️ Constraint check/add failed (safe to ignore if table/constraint exists):', error.message);
    }
  },

  down: async (queryInterface) => {
    // await queryInterface.dropTable('region_materials');
  },
};
