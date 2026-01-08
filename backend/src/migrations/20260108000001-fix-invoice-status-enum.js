'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Add 'partial' value to the enum type in Postgres
        try {
            await queryInterface.sequelize.query("ALTER TYPE enum_invoices_status ADD VALUE 'partial'");
        } catch (e) {
            console.log("Value 'partial' might already exist or error adding it:", e.message);
        }

        // 2. Add 'unpaid' value to the enum type in Postgres
        try {
            await queryInterface.sequelize.query("ALTER TYPE enum_invoices_status ADD VALUE 'unpaid'");
        } catch (e) {
            console.log("Value 'unpaid' might already exist or error adding it:", e.message);
        }

        // 3. Update the column definition to use the new default value 'unpaid' and ensure Sequelize metadata is satisfied
        // Note: We list all potential values here to be safe and match the superset of DB and Model
        await queryInterface.changeColumn('invoices', 'status', {
            type: Sequelize.ENUM('pending', 'paid', 'overdue', 'cancelled', 'partial', 'unpaid'),
            defaultValue: 'unpaid'
        });
    },

    async down(queryInterface, Sequelize) {
        // Revert default value to 'pending'
        await queryInterface.changeColumn('invoices', 'status', {
            type: Sequelize.ENUM('pending', 'paid', 'overdue', 'cancelled', 'partial', 'unpaid'),
            defaultValue: 'pending'
        });
        // Note: We cannot removing enum values ('partial', 'unpaid') safely in Postgres without recreating the type and converting data.
    }
};
