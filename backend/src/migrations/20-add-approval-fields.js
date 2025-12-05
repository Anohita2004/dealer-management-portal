'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const safeAdd = async (table, column, props) => {
      try {
        await queryInterface.addColumn(table, column, props);
      } catch (e) {
        console.log(`⚠️ Skipping existing column ${table}.${column}`);
      }
    };

    // -----------------------------
    // ORDERS
    // -----------------------------
    await safeAdd("orders", "approvalStage", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await safeAdd("orders", "approvalStatus", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "draft",
    });

    await safeAdd("orders", "approvedBy", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await safeAdd("orders", "approvedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await safeAdd("orders", "rejectionReason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // -----------------------------
    // DOCUMENTS
    // -----------------------------
    await safeAdd("documents", "approvalStage", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await safeAdd("documents", "approvalStatus", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "pending",
    });

    await safeAdd("documents", "approvedBy", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await safeAdd("documents", "approvedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await safeAdd("documents", "rejectionReason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // -----------------------------
    // PAYMENT REQUESTS (2 possible table names)
    // -----------------------------
    const payTables = ["payment_requests", "paymen_requests"];

    for (const tbl of payTables) {
      const exists = await queryInterface.sequelize
        .query(`SELECT to_regclass('${tbl}')`)
        .then(r => r[0][0].to_regclass);

      if (!exists) continue;

      await safeAdd(tbl, "approvalStage", {
        type: Sequelize.STRING,
        allowNull: true,
      });

      await safeAdd(tbl, "approvalStatus", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "submitted",
      });

      await safeAdd(tbl, "approvedBy", {
        type: Sequelize.UUID,
        allowNull: true,
      });

      await safeAdd(tbl, "approvedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await safeAdd(tbl, "rejectionReason", {
        type: Sequelize.TEXT,
        allowNull: true,
      });

      break;
    }
  },

  down: async (queryInterface) => {
    const safeRemove = async (table, column) => {
      try {
        await queryInterface.removeColumn(table, column);
      } catch (e) {
        console.log(`⚠️ Skipping missing column ${table}.${column}`);
      }
    };

    const cols = [
      "approvalStage",
      "approvalStatus",
      "approvedBy",
      "approvedAt",
      "rejectionReason",
    ];

    for (const col of cols) {
      await safeRemove("orders", col);
      await safeRemove("documents", col);
      await safeRemove("payment_requests", col);
      await safeRemove("paymen_requests", col);
    }
  },
};
