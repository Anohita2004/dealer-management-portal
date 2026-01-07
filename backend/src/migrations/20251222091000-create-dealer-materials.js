'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // Check if table exists
    const tableExists = await queryInterface.sequelize.query(
      `SELECT to_regclass('public.dealer_materials')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!tableExists[0] || !tableExists[0].to_regclass) {
      console.log('🚧 dealer_materials table missing. Creating it now...');
      try {
        await queryInterface.createTable('dealer_materials', {
          id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
          dealerId: {
            type: Sequelize.UUID, allowNull: false,
            references: { model: 'dealers', key: 'id' },
            onDelete: 'CASCADE', onUpdate: 'CASCADE',
          },
          materialId: {
            type: Sequelize.UUID, allowNull: false,
            // Note: If 'materials' table doesn't exist yet, this ref will fail.
          },
          isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
          price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
          stockQty: { type: Sequelize.INTEGER, allowNull: true },
          createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
          updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
        });
      } catch (e) {
        console.log('❌ Failed to create dealer_materials (ignoring if referenced table missing)', e.message);
      }
    } else {
      console.log('⚠️ Table dealer_materials already exists, skipping creation...');
    }

    // Attempt to add constraint
    try {
      await queryInterface.addConstraint('dealer_materials', {
        fields: ['dealerId', 'materialId'],
        type: 'unique',
        name: 'dealer_materials_dealer_material_unique',
      });
    } catch (error) {
      // Safely ignore if table or constraint exists
      console.log('⚠️ Constraint add failed (this is fine if table/constraint exists):', error.message);
    }
  },

  down: async (queryInterface) => {
    // await queryInterface.dropTable('dealer_materials');
  },
};
