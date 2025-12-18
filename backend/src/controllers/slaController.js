'use strict';

const { runSlaChecks } = require("../utils/sla");

// Manual trigger for SLA checks; to be wired for cron or admin endpoint.
const triggerSla = async (_req, res) => {
  try {
    const result = await runSlaChecks();
    res.json({ message: "SLA checks executed", ...result });
  } catch (err) {
    console.error("SLA trigger error:", err);
    res.status(500).json({ error: "Failed to run SLA checks" });
  }
};

module.exports = { triggerSla };

