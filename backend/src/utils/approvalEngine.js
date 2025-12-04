// Unified approval flow engine

const FLOWS = {
  order: [
    
    "regional_manager",
    "regional_admin",
    "super_admin",
  ],

  payment: ["dealer_admin", "finance_admin", "super_admin"],

  document: ["dealer_admin", "regional_manager", "regional_admin", "super_admin"],
};

function nextStage(current, type) {
  const flow = FLOWS[type];
  if (!flow) return null;

  if (!current) return flow[0];

  const idx = flow.indexOf(current);
  if (idx === -1) return flow[0];

  return flow[idx + 1] || null;
}

function isApproverForStage(roleName, stage) {
  if (!stage) return false;
  return String(roleName).toLowerCase() === String(stage).toLowerCase();
}

module.exports = {
  FLOWS,
  nextStage,
  isApproverForStage,
};
