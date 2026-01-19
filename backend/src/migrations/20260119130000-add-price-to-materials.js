'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('materials', 'price', {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        });

        // Seed some initial prices
        await queryInterface.sequelize.query(`
      UPDATE materials SET price = 500.00 WHERE "materialNumber" = 'M-1001'; -- Cement
      UPDATE materials SET price = 300.00 WHERE "materialNumber" = 'M-1002'; -- White Cement
      UPDATE materials SET price = 150.00 WHERE "materialNumber" = 'M-2001'; -- Adhesive
    `);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('materials', 'price');
    }
};
