'use strict';

/**
 * FINAL ALIGNMENT MIGRATION
 * 
 * Ensures table names match the Sequelize Models (PascalCase vs snake_case).
 * specifically targeting PaymentRequests and PricingUpdates which were likely created as snake_case
 * by previous baseline migrations but the models expect PascalCase.
 */

module.exports = {
    async up(queryInterface, Sequelize) {

        // 1. Fix PaymentRequests (payment_requests -> PaymentRequests)
        const prSnakeExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public.payment_requests')`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        const prPascalExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public."PaymentRequests"')`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (prSnakeExists[0] && prSnakeExists[0].to_regclass &&
            (!prPascalExists[0] || !prPascalExists[0].to_regclass)) {
            console.log('🔄 Renaming payment_requests -> PaymentRequests');
            await queryInterface.renameTable('payment_requests', 'PaymentRequests');
        }

        // 2. Fix PricingUpdates (pricing_updates -> PricingUpdates)
        const puSnakeExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public.pricing_updates')`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        const puPascalExists = await queryInterface.sequelize.query(
            `SELECT to_regclass('public."PricingUpdates"')`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (puSnakeExists[0] && puSnakeExists[0].to_regclass &&
            (!puPascalExists[0] || !puPascalExists[0].to_regclass)) {
            console.log('🔄 Renaming pricing_updates -> PricingUpdates');
            await queryInterface.renameTable('pricing_updates', 'PricingUpdates');
        }
    },

    async down(queryInterface, Sequelize) {
        // Revert rename if needed
        await queryInterface.renameTable('PaymentRequests', 'payment_requests');
        await queryInterface.renameTable('PricingUpdates', 'pricing_updates');
    }
};
