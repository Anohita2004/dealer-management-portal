'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Orders
    await queryInterface.addColumn("orders", "approvalStage", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "approvalStatus", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "draft",
    });
    await queryInterface.addColumn("orders", "approvedBy", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "approvedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "rejectionReason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Documents
    await queryInterface.addColumn("documents", "approvalStage", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("documents", "approvalStatus", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "pending",
    });
    await queryInterface.addColumn("documents", "approvedBy", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn("documents", "approvedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("documents", "rejectionReason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // PaymentRequests (your table may be paymen_requests)
    const tables = ["payment_requests", "paymen_requests"];
    for (const tbl of tables) {
      try {
        const result = await queryInterface.sequelize.query(
          `SELECT to_regclass('${tbl}');`
        );
        const exists = result[0][0].to_regclass;

        if (exists) {
          await queryInterface.addColumn(tbl, "approvalStage", {
            type: Sequelize.STRING,
            allowNull: true,
          });
          await queryInterface.addColumn(tbl, "approvalStatus", {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "submitted",
          });
          await queryInterface.addColumn(tbl, "approvedBy", {
            type: Sequelize.UUID,
            allowNull: true,
          });
          await queryInterface.addColumn(tbl, "approvedAt", {
            type: Sequelize.DATE,
            allowNull: true,
          });
          await queryInterface.addColumn(tbl, "rejectionReason", {
            type: Sequelize.TEXT,
            allowNull: true,
          });
          break;
        }
      } catch (e) {}
    }
  },

  down: async (queryInterface) => {
    const remove = async (table) => {
      try {
        await queryInterface.removeColumn(table, "approvalStage");
        await queryInterface.removeColumn(table, "approvalStatus");
        await queryInterface.removeColumn(table, "approvedBy");
        await queryInterface.removeColumn(table, "approvedAt");
        await queryInterface.removeColumn(table, "rejectionReason");
      } catch (e) {}
    };

    await remove("orders");
    await remove("documents");
    await remove("payment_requests");
    await remove("paymen_requests");
  },
};
