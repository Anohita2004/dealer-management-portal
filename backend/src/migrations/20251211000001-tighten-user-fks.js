'use strict';

/**
 * Tighten User foreign keys for role + hierarchy without breaking existing data.
 * Notes:
 * - All FKs remain nullable to avoid blocking legacy rows.
 * - Constraints are additive and idempotent (ignored if already exist).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const addConstraintSafe = async (table, constraint) => {
      try {
        await queryInterface.addConstraint(table, constraint);
      } catch (err) {
        // ignore if constraint exists
        if (!/already exists/i.test(err.message)) {
          throw err;
        }
      }
    };

    // Clean up invalid foreign keys before adding constraints
    await queryInterface.sequelize.query(`
      UPDATE "Users" 
      SET "regionId" = NULL 
      WHERE "regionId" IS NOT NULL 
      AND "regionId" NOT IN (SELECT id FROM regions)
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Users" 
      SET "areaId" = NULL 
      WHERE "areaId" IS NOT NULL 
      AND "areaId" NOT IN (SELECT id FROM areas)
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Users" 
      SET "territoryId" = NULL 
      WHERE "territoryId" IS NOT NULL 
      AND "territoryId" NOT IN (SELECT id FROM territories)
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Users" 
      SET "dealerId" = NULL 
      WHERE "dealerId" IS NOT NULL 
      AND "dealerId" NOT IN (SELECT id FROM dealers)
    `);

    await addConstraintSafe('Users', {
      fields: ['roleId'],
      type: 'foreign key',
      name: 'users_roleId_fk',
      references: { table: 'roles', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await addConstraintSafe('Users', {
      fields: ['managerId'],
      type: 'foreign key',
      name: 'users_managerId_fk',
      references: { table: 'Users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await addConstraintSafe('Users', {
      fields: ['dealerId'],
      type: 'foreign key',
      name: 'users_dealerId_fk',
      references: { table: 'dealers', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await addConstraintSafe('Users', {
      fields: ['regionId'],
      type: 'foreign key',
      name: 'users_regionId_fk',
      references: { table: 'regions', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await addConstraintSafe('Users', {
      fields: ['areaId'],
      type: 'foreign key',
      name: 'users_areaId_fk_v2',
      references: { table: 'areas', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await addConstraintSafe('Users', {
      fields: ['territoryId'],
      type: 'foreign key',
      name: 'users_territoryId_fk_v2',
      references: { table: 'territories', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface) {
    const drop = async (table, name) => {
      try {
        await queryInterface.removeConstraint(table, name);
      } catch (err) {
        if (!/does not exist/i.test(err.message)) {
          throw err;
        }
      }
    };

    await drop('Users', 'users_territoryId_fk_v2');
    await drop('Users', 'users_areaId_fk_v2');
    await drop('Users', 'users_regionId_fk');
    await drop('Users', 'users_dealerId_fk');
    await drop('Users', 'users_managerId_fk');
    await drop('Users', 'users_roleId_fk');
  },
};

