// ─── Color Rule Field Definitions ────────────────────────────────────────────
export const COLOR_RULE_FIELDS = [
  { id: "assignment_status", label: "Assignment Status", source: "assignment" },
  { id: "assignment_type",   label: "Work Type",         source: "assignment" },
  { id: "priority_bucket",   label: "Priority",          source: "assignment" },
  { id: "team_name",         label: "Team",              source: "assignment" },
  { id: "assigned_to",       label: "Assigned To",       source: "assignment" },
  { id: "asset_status",      label: "Asset Status",      source: "asset",      assetKey: "status" },
  { id: "city",              label: "City",              source: "asset",      assetKey: "city" },
  { id: "shelter_type",      label: "Shelter Type",      source: "asset",      assetKey: "shelter_type" },
];

// Resolve the runtime value for a given field from asset+assignment context
export function resolveFieldValue(fieldId, asset, assignment) {
  switch (fieldId) {
    case "assignment_status": return assignment?.assignment_status ?? null;
    case "assignment_type":   return assignment?.assignment_type ?? null;
    case "priority_bucket":   return assignment?.priority_bucket ?? null;
    case "team_name":         return assignment?.team_name ?? null;
    case "assigned_to":       return assignment?.assigned_to ?? null;
    case "asset_status":      return asset?.status ?? null;
    case "city":              return asset?.city ?? null;
    case "shelter_type":      return asset?.shelter_type ?? null;
    default:                  return null;
  }
}

// Resolve pin color from per-map color rules (new architecture)
// colorRules = PlanningLayers filtered for a given map (enabled, sorted by priority desc)
export function getColorRulePin(asset, assignment, colorRules, layerAssets) {
  if (!colorRules || colorRules.length === 0) return null;

  // Manual overrides first
  const manualRules = colorRules.filter(r => r.layer_type === "manual_override");
  for (const rule of manualRules) {
    const inLayer = layerAssets.some(la => la.planning_layer_id === rule.id && la.asset_id === asset.id);
    if (inLayer) return rule.color_hex;
  }

  // Rule-based: find highest-priority matching rule
  const ruleBasedRules = colorRules.filter(r => r.layer_type !== "manual_override");
  for (const rule of ruleBasedRules) {
    const val = resolveFieldValue(rule.color_by_field, asset, assignment);
    if (val !== null && String(val) === String(rule.color_by_value)) {
      return rule.color_hex;
    }
  }

  return null; // no match → caller uses default color
}

// ─── Color Mode Options ────────────────────────────────────────────────────────

export const COLOR_MODES = [
  { value: "default",           label: "Default (Priority/Status)" },
  { value: "layer",             label: "By Layer" },
  { value: "city",              label: "By City" },
  { value: "asset_status",      label: "By Asset Status" },
  { value: "assignment_status", label: "By Assignment Status" },
  { value: "assignment_type",   label: "By Assignment Type" },
  { value: "priority",          label: "By Priority" },
  { value: "assigned_state",    label: "Assigned / Unassigned" },
  { value: "incident_presence", label: "By Incident Presence" },
  { value: "work_order_presence","label": "By Work Order Presence" },
];

// ─── City palette ─────────────────────────────────────────────────────────────
const CITY_COLORS = ["#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4"];
const cityColorMap = {};
export function getCityColor(city) {
  if (!city) return "#94A3B8";
  if (!cityColorMap[city]) {
    const idx = Object.keys(cityColorMap).length % CITY_COLORS.length;
    cityColorMap[city] = CITY_COLORS[idx];
  }
  return cityColorMap[city];
}

const ASSET_STATUS_COLORS = {
  "Active":       "#22C55E",
  "Inactive":     "#94A3B8",
  "Under Maintenance": "#F59E0B",
  "Decommissioned": "#EF4444",
};

const ASSIGNMENT_STATUS_COLORS = {
  "Planned":      "#6366F1",
  "In Progress":  "#3B82F6",
  "Completed":    "#22C55E",
  "Deferred":     "#A78BFA",
  "Cancelled":    "#9CA3AF",
};

const ASSIGNMENT_TYPE_COLORS = {
  "Inspection":  "#06B6D4",
  "Preventive":  "#10B981",
  "Corrective":  "#EF4444",
  "Review":      "#F59E0B",
  "Mixed":       "#8B5CF6",
};

const PRIORITY_COLORS = {
  "P1":       "#EF4444",
  "Critical": "#EF4444",
  "P2":       "#F97316",
  "High":     "#F97316",
  "Medium":   "#3B82F6",
  "Low":      "#84CC16",
};

// ─── Visual rule color mapping ────────────────────────────────────────────────
const VISUAL_RULE_COLORS = ["#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16"];

function getVisualRuleColor(asset, assignment, rule, incidentsByAsset, workOrdersByAsset) {
  if (!rule || !rule.field || !rule.values) return "#CBD5E1";

  const ruleIndex = (value) => rule.values.indexOf(value);
  const getColor = (idx) => idx >= 0 ? VISUAL_RULE_COLORS[idx % VISUAL_RULE_COLORS.length] : "#CBD5E1";

  switch (rule.field) {
    case "assignment_status":
      return assignment ? getColor(ruleIndex(assignment.assignment_status)) : "#CBD5E1";
    case "assignment_type":
      return assignment ? getColor(ruleIndex(assignment.assignment_type)) : "#CBD5E1";
    case "priority_bucket":
      return assignment ? getColor(ruleIndex(assignment.priority_bucket)) : "#CBD5E1";
    case "team_name":
      return assignment ? getColor(ruleIndex(assignment.team_name)) : "#CBD5E1";
    case "assigned_to":
      return assignment ? getColor(ruleIndex(assignment.assigned_to)) : "#CBD5E1";
    case "asset_status":
      return getColor(ruleIndex(asset.status));
    case "city":
      return getColor(ruleIndex(asset.city));
    case "shelter_type":
      return getColor(ruleIndex(asset.shelter_type));
    case "has_incident":
      const hasInc = (incidentsByAsset[asset.id]?.length > 0) ? "Yes" : "No";
      return getColor(ruleIndex(hasInc));
    case "has_work_order":
      const hasWO = (workOrdersByAsset[asset.id]?.length > 0) ? "Yes" : "No";
      return getColor(ruleIndex(hasWO));
    default:
      return "#CBD5E1";
  }
}

// ─── Main pin color resolver ───────────────────────────────────────────────────

export function getMapPinColor({ asset, assignment, colorMode, layers, layerAssets, incidentsByAsset, workOrdersByAsset, activeVisualRule, colorRules }) {
  // New color rules architecture takes highest precedence
  if (colorRules && colorRules.length > 0) {
    const ruleColor = getColorRulePin(asset, assignment, colorRules, layerAssets);
    if (ruleColor) return ruleColor;
  }

  // Visual rule takes precedence if active
  if (activeVisualRule) {
    return getVisualRuleColor(asset, assignment, activeVisualRule, incidentsByAsset, workOrdersByAsset);
  }

  switch (colorMode) {
    case "city":
      return getCityColor(asset.city);

    case "asset_status":
      return ASSET_STATUS_COLORS[asset.status] || "#94A3B8";

    case "assignment_status":
      if (!assignment) return "#CBD5E1";
      return ASSIGNMENT_STATUS_COLORS[assignment.assignment_status] || "#CBD5E1";

    case "assignment_type":
      if (!assignment) return "#CBD5E1";
      return ASSIGNMENT_TYPE_COLORS[assignment.assignment_type] || "#94A3B8";

    case "priority":
      if (!assignment?.priority_bucket) return "#CBD5E1";
      return PRIORITY_COLORS[assignment.priority_bucket] || "#3B82F6";

    case "assigned_state":
      return assignment ? "#6366F1" : "#CBD5E1";

    case "incident_presence":
      return (incidentsByAsset[asset.id]?.length > 0) ? "#EF4444" : "#94A3B8";

    case "work_order_presence":
      return (workOrdersByAsset[asset.id]?.length > 0) ? "#F59E0B" : "#94A3B8";

    case "layer": {
      const assetLayerIds = layerAssets.filter(la => la.asset_id === asset.id).map(la => la.planning_layer_id);
      const matchedLayer = layers.find(l => assetLayerIds.includes(l.id) && l.is_active);
      return matchedLayer?.color || "#CBD5E1";
    }

    default: // "default"
      if (assignment?.assignment_status === "Completed") return "#22C55E";
      if (assignment?.assignment_status === "Cancelled") return "#9CA3AF";
      if (assignment?.assignment_status === "Deferred")  return "#A78BFA";
      switch (assignment?.priority_bucket) {
        case "P1":
        case "Critical": return "#EF4444";
        case "P2":
        case "High":     return "#F97316";
        case "Low":      return "#84CC16";
        case "Medium":   return "#3B82F6";
        default:         return "#CBD5E1";
      }
  }
}

// ─── Legend entries per color mode ────────────────────────────────────────────

export function getLegendEntries(colorMode, layers, assets, assignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule, colorRules) {
  // New color rules legend
  if (colorRules && colorRules.length > 0) {
    return colorRules.map(r => ({
      label: r.label || `${r.color_by_field}: ${r.color_by_value}`,
      color: r.color_hex,
      rule: `${r.color_by_field} = ${r.color_by_value}`,
    }));
  }

  if (activeVisualRule) {
    return activeVisualRule.values.map((val, idx) => ({
      label: val,
      color: VISUAL_RULE_COLORS[idx % VISUAL_RULE_COLORS.length]
    }));
  }

  switch (colorMode) {
    case "assignment_status":
      return Object.entries(ASSIGNMENT_STATUS_COLORS).map(([label, color]) => ({ label, color }))
        .concat([{ label: "Unassigned", color: "#CBD5E1" }]);

    case "assignment_type":
      return Object.entries(ASSIGNMENT_TYPE_COLORS).map(([label, color]) => ({ label, color }))
        .concat([{ label: "Unassigned", color: "#CBD5E1" }]);

    case "priority":
      return [
        { label: "P1 / Critical", color: "#EF4444" },
        { label: "P2 / High",     color: "#F97316" },
        { label: "Medium",        color: "#3B82F6" },
        { label: "Low",           color: "#84CC16" },
        { label: "Unassigned",    color: "#CBD5E1" },
      ];

    case "asset_status":
      return Object.entries(ASSET_STATUS_COLORS).map(([label, color]) => ({ label, color }));

    case "assigned_state":
      return [
        { label: "Assigned",   color: "#6366F1" },
        { label: "Unassigned", color: "#CBD5E1" },
      ];

    case "incident_presence":
      return [
        { label: "Has Incidents",    color: "#EF4444" },
        { label: "No Incidents",     color: "#94A3B8" },
      ];

    case "work_order_presence":
      return [
        { label: "Has Work Orders",  color: "#F59E0B" },
        { label: "No Work Orders",   color: "#94A3B8" },
      ];

    case "layer": {
      const activeLayers = layers.filter(l => l.is_active);
      const entries = activeLayers.map(l => ({ label: l.name, color: l.color || "#94A3B8" }));
      entries.push({ label: "No Layer", color: "#CBD5E1" });
      return entries;
    }

    case "city": {
      const cities = [...new Set(assets.map(a => a.city).filter(Boolean))];
      return cities.map(c => ({ label: c, color: getCityColor(c) }));
    }

    default:
      return [
        { label: "P1 / Critical", color: "#EF4444" },
        { label: "P2 / High",     color: "#F97316" },
        { label: "Medium",        color: "#3B82F6" },
        { label: "Low",           color: "#84CC16" },
        { label: "Completed",     color: "#22C55E" },
        { label: "Deferred",      color: "#A78BFA" },
        { label: "Unassigned",    color: "#CBD5E1" },
      ];
  }
}

// ─── Empty per-map filter state ────────────────────────────────────────────────

export const EMPTY_MAP_FILTERS = {
  search: "",
  city: "",
  shelter_type: "",
  asset_status: "",
  assignment_status: "",
  assignment_type: "",
  priority_bucket: "",
  team_name: "",
  show_unassigned_only: false,
  has_incident: false,
  has_work_order: false,
  is_ordered: false,
  is_implementation_phase: false,
};

// ─── Apply map filters ─────────────────────────────────────────────────────────

export function applyMapFilters(assets, filters, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, visibleLayerIds, layerAssets) {
  return assets.filter(a => {
    const f = filters;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (
        !a.asset_id?.toLowerCase().includes(q) &&
        !a.active_shelter_id?.toLowerCase().includes(q) &&
        !a.location_address?.toLowerCase().includes(q) &&
        !a.city?.toLowerCase().includes(q)
      ) return false;
    }
    if (f.city && a.city !== f.city) return false;
    if (f.shelter_type && a.shelter_type !== f.shelter_type) return false;
    if (f.asset_status && a.status !== f.asset_status) return false;

    const asgn = assignmentByAssetId[a.id];
    if (f.show_unassigned_only && asgn) return false;
    if (f.assignment_status && (!asgn || asgn.assignment_status !== f.assignment_status)) return false;
    if (f.assignment_type && (!asgn || asgn.assignment_type !== f.assignment_type)) return false;
    if (f.priority_bucket && (!asgn || asgn.priority_bucket !== f.priority_bucket)) return false;
    if (f.team_name && (!asgn || asgn.team_name !== f.team_name)) return false;
    if (f.has_incident && !incidentsByAsset[a.id]?.length) return false;
    if (f.has_work_order && !workOrdersByAsset[a.id]?.length) return false;
    if (f.is_ordered && !a.order_year) return false;
    if (f.is_implementation_phase && a.phase !== "Implementation") return false;

    if (visibleLayerIds && visibleLayerIds.length > 0) {
      const assetLayerIds = layerAssets.filter(la => la.asset_id === a.id).map(la => la.planning_layer_id);
      if (!visibleLayerIds.some(id => assetLayerIds.includes(id))) return false;
    }

    return true;
  });
}

// ─── Unique values helpers ─────────────────────────────────────────────────────

export function uniqueCities(assets) {
  return [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
}

export function uniqueShelterTypes(assets) {
  return [...new Set(assets.map(a => a.shelter_type).filter(Boolean))].sort();
}

export function countActiveMapFilters(filters) {
  return Object.entries(filters).filter(([k, v]) => {
    if (k === "search") return !!v;
    if (typeof v === "boolean") return v;
    return !!v;
  }).length;
}