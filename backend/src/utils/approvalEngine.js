// src/utils/approvalEngine.js

// Define multi-stage flows based on hierarchy
const FLOWS = {
  order: ["territory_manager", "area_manager", "regional_manager"],
  payment: ["dealer_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"],
  document: ["dealer_admin", "territory_manager", "area_manager", "regional_manager"],
  pricing: ["area_manager", "regional_admin", "super_admin"], // For pricing approvals
};

// Map stage → allowed roles (can be same as stage or include higher roles)
const STAGE_APPROVERS = {
  order: {
    territory_manager: ["territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"],
    area_manager: ["area_manager", "regional_manager", "regional_admin", "super_admin"],
    regional_manager: ["regional_manager", "regional_admin", "super_admin"],
  },
  payment: {
    dealer_admin: ["dealer_admin", "territory_manager", "area_manager", "super_admin"],
    territory_manager: ["territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"],
    area_manager: ["area_manager", "regional_manager", "regional_admin", "super_admin"],
    regional_manager: ["regional_manager", "regional_admin", "super_admin"],
    regional_admin: ["regional_admin", "super_admin"],
  },
  document: {
    dealer_admin: ["dealer_admin", "territory_manager", "area_manager", "super_admin"],
    territory_manager: ["territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"],
    area_manager: ["area_manager", "regional_manager", "regional_admin", "super_admin"],
    regional_manager: ["regional_manager", "regional_admin", "super_admin"],
  },
  pricing: {
    area_manager: ["area_manager", "regional_admin", "super_admin"],
    regional_admin: ["regional_admin", "super_admin"],
    super_admin: ["super_admin"],
  },
};

// Get next stage in flow
function nextStage(current, type) {
  const flow = FLOWS[type];
  if (!flow) return null;
  if (!current) return flow[0];

  const idx = flow.indexOf(current);
  if (idx === -1) return flow[0];

  return flow[idx + 1] || null;
}

// Check if role can approve a stage
function isApproverForStage(roleName, stage, type = "order") {
  if (!stage || !roleName) return false;
  const allowed = STAGE_APPROVERS[type]?.[stage] || [];
  return allowed.includes(roleName);
}

module.exports = {
  FLOWS,
  STAGE_APPROVERS,
  nextStage,
  isApproverForStage,
};
