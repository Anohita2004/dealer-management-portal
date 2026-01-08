
const fs = require('fs');
const path = require('path');

const snapshot = JSON.parse(fs.readFileSync('schema_snapshot_full.json', 'utf8'));

let migrationContent = `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ${JSON.stringify(Object.keys(snapshot))};
    
    // Disable FK checks to allow creating tables in any order
    await queryInterface.sequelize.query('SET session_replication_role = "replica";'); // Postgres specific

`;

for (const [tableName, columns] of Object.entries(snapshot)) {
    migrationContent += `    console.log('Creating table: ${tableName}');\n`;
    migrationContent += `    await queryInterface.createTable('${tableName}', {\n`;

    for (const [colName, details] of Object.entries(columns)) {
        migrationContent += `      "${colName}": {\n`;

        // Type mapping
        let sequelizeType = 'Sequelize.STRING';
        const typeUpper = details.type.toUpperCase();

        if (typeUpper.includes('UUID')) sequelizeType = 'Sequelize.UUID';
        else if (typeUpper.includes('INT')) sequelizeType = 'Sequelize.INTEGER';
        else if (typeUpper.includes('BOOL')) sequelizeType = 'Sequelize.BOOLEAN';
        else if (typeUpper.includes('TIMESTAMP') || typeUpper.includes('DATE')) sequelizeType = 'Sequelize.DATE';
        else if (typeUpper.includes('TEXT')) sequelizeType = 'Sequelize.TEXT';
        else if (typeUpper.includes('NUMERIC') || typeUpper.includes('DOUBLE')) sequelizeType = 'Sequelize.DECIMAL';
        else if (typeUpper.includes('JSON')) sequelizeType = 'Sequelize.JSON';
        else if (typeUpper === 'USER-DEFINED') sequelizeType = 'Sequelize.STRING'; // Map Enums to String for safety

        migrationContent += `        type: ${sequelizeType},\n`;
        migrationContent += `        allowNull: ${details.allowNull},\n`;
        migrationContent += `        primaryKey: ${details.primaryKey},\n`;

        if (details.defaultValue) {
            let def = details.defaultValue;
            // Clean up default value strings like "'pending'::character varying"
            if (typeof def === 'string') {
                if (def.includes('::')) def = def.split('::')[0];
                if (def.startsWith("'") && def.endsWith("'")) def = def.slice(1, -1);

                // Handle sequences - convert to autoIncrement
                if (def.includes('nextval')) {
                    migrationContent += `        autoIncrement: true,\n`;
                    // Do NOT add defaultValue line for nextval
                }
                // Handle functions
                else if (def.includes('gen_random_uuid') || def.includes('now') || def.includes('CURRENT_TIMESTAMP')) {
                    migrationContent += `        defaultValue: Sequelize.literal('${details.defaultValue}'),\n`;
                } else {
                    migrationContent += `        defaultValue: "${def}",\n`;
                }
            } else {
                migrationContent += `        defaultValue: ${def},\n`;
            }
        }

        migrationContent += `      },\n`;
    }

    migrationContent += `    });\n\n`;
}

migrationContent += `
    // Re-enable FK checks
    await queryInterface.sequelize.query('SET session_replication_role = "origin";');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
};`;

fs.writeFileSync(path.join('src', 'migrations', '999999999999-full-schema-sync.js'), migrationContent);
console.log('Migration generated.');
