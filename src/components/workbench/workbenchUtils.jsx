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
  { value: "default",                label: "Default (Priority/Status)" },
  { value: "layer",                  label: "By Layer" },
  // Asset fields — status & stage
  { value: "asset_status",           label: "By Asset Status" },
  { value: "asset_stage",            label: "By Asset Stage" },
  { value: "asset_source",           label: "By Asset Source" },
  { value: "phase",                  label: "By Phase" },
  // Shelter types
  { value: "shelter_type",           label: "By Shelter Type (Current)" },
  { value: "ordered_shelter_type",   label: "By Ordered Shelter Type" },
  { value: "installed_shelter_type", label: "By Installed Shelter Type" },
  // Locations
  { value: "city",                   label: "By City" },
  { value: "municipality",           label: "By Municipality" },
  // Asset conditions
  { value: "existing_condition",     label: "By Existing Condition" },
  { value: "has_bay",                label: "By Has Bay" },
  { value: "inspection_status",      label: "By Inspection Status" },
  { value: "category",               label: "By Category" },
  { value: "order_year",             label: "By Order Year" },
  // Assignment fields
  { value: "assignment_status",      label: "By Assignment Status" },
  { value: "assignment_type",        label: "By Assignment Type" },
  { value: "priority",               label: "By Priority" },
  { value: "assigned_state",         label: "Assigned / Unassigned" },
  // Presence
  { value: "incident_presence",      label: "By Incident Presence" },
  { value: "work_order_presence",    label: "By Work Order Presence" },
  { value: "planned_week",           label: "By Planned Week" },
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
  "Active":            "#22C55E",
  "Inactive":          "#94A3B8",
  "Under Maintenance": "#F59E0B",
  "Decommissioned":    "#EF4444",
};

const ASSET_STAGE_COLORS = {
  "planning":     "#94A3B8",
  "ordered":      "#F59E0B",
  "installation": "#3B82F6",
  "installed":    "#22C55E",
  "maintenance":  "#EF4444",
};

const ASSET_SOURCE_COLORS = {
  "maintenance":        "#6366F1",
  "bus_shelter_order":  "#F59E0B",
};

const EXISTING_CONDITION_COLORS = {
  "none":             "#94A3B8",
  "sign_only":        "#F59E0B",
  "shelter_only":     "#3B82F6",
  "sign_and_shelter": "#22C55E",
  "unknown":          "#CBD5E1",
};

const HAS_BAY_COLORS = {
  "yes":     "#22C55E",
  "no":      "#EF4444",
  "unknown": "#94A3B8",
};

// Generic palette for dynamic string fields (municipality, phase, shelter_type, order_year)
const GENERIC_PALETTE = ["#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16","#14B8A6","#A78BFA"];

// Deterministic: hash the value string to get a stable color index
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function getGenericColor(field, value) {
  if (!value) return "#94A3B8";
  return GENERIC_PALETTE[hashStr(String(value)) % GENERIC_PALETTE.length];
}

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
  // New color rules architecture takes highest precedence — but only if a rule actually matches
  if (colorRules && colorRules.length > 0) {
    const ruleColor = getColorRulePin(asset, assignment, colorRules, layerAssets);
    if (ruleColor) return ruleColor;
    // If no rule matched, fall through to the user-selected colorMode (do NOT force "default")
  }

  // Visual rule takes precedence if active
  if (activeVisualRule) {
    return getVisualRuleColor(asset, assignment, activeVisualRule, incidentsByAsset, workOrdersByAsset);
  }

  switch (colorMode) {
    case "city":
      return getCityColor(asset.city);

    case "municipality":
      return getGenericColor("municipality", asset.municipality);

    case "asset_status":
      return ASSET_STATUS_COLORS[asset.status] || "#94A3B8";

    case "asset_stage":
      return ASSET_STAGE_COLORS[asset.asset_stage] || "#94A3B8";

    case "asset_source":
      return ASSET_SOURCE_COLORS[asset.asset_source] || "#94A3B8";

    case "shelter_type":
      return getGenericColor("shelter_type", asset.shelter_type);

    case "ordered_shelter_type":
      return getGenericColor("ordered_shelter_type", asset.ordered_shelter_type);

    case "installed_shelter_type":
      return getGenericColor("installed_shelter_type", asset.installed_shelter_type);

    case "existing_condition":
      return EXISTING_CONDITION_COLORS[asset.existing_condition] || "#94A3B8";

    case "has_bay":
      return HAS_BAY_COLORS[asset.has_bay] || "#94A3B8";

    case "phase":
      return getGenericColor("phase", asset.phase);

    case "order_year":
      return getGenericColor("order_year", asset.order_year ? String(asset.order_year) : null);

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

    case "planned_week":
      if (!assignment) return "#CBD5E1";
      return getGenericColor("planned_week", assignment.planning_week_id);

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

export function getLegendEntries(colorMode, layers, assets, assignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule, colorRules, assignmentByAssetId, weeks = []) {
  // Helper to count assets matching a label
  function countMatches(label, mode) {
    return assets.filter(a => {
      switch (mode) {
        case "city": return a.city === label;
        case "municipality": return a.municipality === label;
        case "shelter_type": return a.shelter_type === label;
        case "ordered_shelter_type": return a.ordered_shelter_type === label;
        case "installed_shelter_type": return a.installed_shelter_type === label;
        case "phase": return a.phase === label;
        case "order_year": return String(a.order_year) === label;
        case "asset_status": return a.status === label;
        case "asset_stage": return a.asset_stage === label;
        case "asset_source": return a.asset_source === label;
        case "existing_condition": return a.existing_condition === label;
        case "has_bay": return a.has_bay === label;
        case "inspection_status": return a.inspection_status === label;
        case "category": return a.category === label;
        default: return false;
      }
    }).length;
  }

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
      return Object.entries(ASSIGNMENT_STATUS_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "assignment_status") }))
        .concat([{ label: "Unassigned", color: "#CBD5E1", count: assets.filter(a => !assignmentByAssetId[a.id]).length }]);

    case "assignment_type":
      return Object.entries(ASSIGNMENT_TYPE_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "assignment_type") }))
        .concat([{ label: "Unassigned", color: "#CBD5E1", count: assets.filter(a => !assignmentByAssetId[a.id]).length }]);

    case "priority":
      return [
        { label: "P1 / Critical", color: "#EF4444", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "P1" || assignmentByAssetId[a.id]?.priority_bucket === "Critical").length },
        { label: "P2 / High",     color: "#F97316", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "P2" || assignmentByAssetId[a.id]?.priority_bucket === "High").length },
        { label: "Medium",        color: "#3B82F6", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "Medium").length },
        { label: "Low",           color: "#84CC16", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "Low").length },
        { label: "Unassigned",    color: "#CBD5E1", count: assets.filter(a => !assignmentByAssetId[a.id]).length },
      ];

    case "asset_status":
      return Object.entries(ASSET_STATUS_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "asset_status") }));

    case "asset_stage":
      return Object.entries(ASSET_STAGE_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "asset_stage") }));

    case "asset_source":
      return Object.entries(ASSET_SOURCE_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "asset_source") }));

    case "existing_condition":
      return Object.entries(EXISTING_CONDITION_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "existing_condition") }));

    case "has_bay":
      return Object.entries(HAS_BAY_COLORS).map(([label, color]) => ({ label, color, count: countMatches(label, "has_bay") }));

    case "inspection_status": {
      const statuses = [...new Set(assets.map(a => a.inspection_status).filter(Boolean))].sort();
      return statuses.map(s => ({ label: s, color: getGenericColor("inspection_status", s), count: countMatches(s, "inspection_status") }));
    }

    case "category": {
      const categories = [...new Set(assets.map(a => a.category).filter(Boolean))].sort();
      return categories.map(c => ({ label: c, color: getGenericColor("category", c), count: countMatches(c, "category") }));
    }

    case "ordered_shelter_type": {
      const types = [...new Set(assets.map(a => a.ordered_shelter_type).filter(Boolean))].sort();
      return types.map(t => ({ label: t, color: getGenericColor("ordered_shelter_type", t), count: countMatches(t, "ordered_shelter_type") }));
    }

    case "installed_shelter_type": {
      const types = [...new Set(assets.map(a => a.installed_shelter_type).filter(Boolean))].sort();
      return types.map(t => ({ label: t, color: getGenericColor("installed_shelter_type", t), count: countMatches(t, "installed_shelter_type") }));
    }

    case "municipality": {
      const munis = [...new Set(assets.map(a => a.municipality).filter(Boolean))].sort();
      return munis.map(m => ({ label: m, color: getGenericColor("municipality", m), count: countMatches(m, "municipality") }));
    }

    case "shelter_type": {
      const types = [...new Set(assets.map(a => a.shelter_type).filter(Boolean))].sort();
      return types.map(t => ({ label: t, color: getGenericColor("shelter_type", t), count: countMatches(t, "shelter_type") }));
    }

    case "phase": {
      const phases = [...new Set(assets.map(a => a.phase).filter(Boolean))].sort();
      return phases.map(p => ({ label: p, color: getGenericColor("phase", p), count: countMatches(p, "phase") }));
    }

    case "order_year": {
      const years = [...new Set(assets.map(a => a.order_year).filter(Boolean))].sort();
      return years.map(y => ({ label: String(y), color: getGenericColor("order_year", String(y)), count: countMatches(String(y), "order_year") }));
    }

    case "assigned_state":
      return [
        { label: "Assigned",   color: "#6366F1", count: assets.filter(a => assignmentByAssetId[a.id]).length },
        { label: "Unassigned", color: "#CBD5E1", count: assets.filter(a => !assignmentByAssetId[a.id]).length },
      ];

    case "incident_presence":
      return [
        { label: "Has Incidents",    color: "#EF4444", count: assets.filter(a => incidentsByAsset[a.id]?.length > 0).length },
        { label: "No Incidents",     color: "#94A3B8", count: assets.filter(a => !incidentsByAsset[a.id]?.length).length },
      ];

    case "work_order_presence":
      return [
        { label: "Has Work Orders",  color: "#F59E0B", count: assets.filter(a => workOrdersByAsset[a.id]?.length > 0).length },
        { label: "No Work Orders",   color: "#94A3B8", count: assets.filter(a => !workOrdersByAsset[a.id]?.length).length },
      ];

    case "planned_week": {
      const weekMap = {};
      assets.forEach(a => {
        const asgn = assignmentByAssetId[a.id];
        if (asgn?.planning_week_id) {
          if (!weekMap[asgn.planning_week_id]) {
            weekMap[asgn.planning_week_id] = 0;
          }
          weekMap[asgn.planning_week_id]++;
        }
      });
      const unassignedCount = assets.filter(a => !assignmentByAssetId[a.id]).length;
      const entries = Object.entries(weekMap).map(([weekId, count]) => {
        const week = weeks.find(w => w.id === weekId);
        const label = week ? `${week.week_code} - ${week.week_name}` : weekId;
        return {
          label,
          color: getGenericColor("planned_week", weekId),
          count
        };
      });
      if (unassignedCount > 0) {
        entries.push({ label: "Unassigned", color: "#CBD5E1", count: unassignedCount });
      }
      return entries;
    }

    case "layer": {
      const activeLayers = layers.filter(l => l.is_active);
      const entries = activeLayers.map(l => ({ label: l.name, color: l.color || "#94A3B8" }));
      entries.push({ label: "No Layer", color: "#CBD5E1" });
      return entries;
    }

    case "city": {
      const cities = [...new Set(assets.map(a => a.city).filter(Boolean))];
      return cities.map(c => ({ label: c, color: getCityColor(c), count: countMatches(c, "city") }));
    }

    default:
      return [
        { label: "P1 / Critical", color: "#EF4444", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "P1" || assignmentByAssetId[a.id]?.priority_bucket === "Critical").length },
        { label: "P2 / High",     color: "#F97316", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "P2" || assignmentByAssetId[a.id]?.priority_bucket === "High").length },
        { label: "Medium",        color: "#3B82F6", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "Medium").length },
        { label: "Low",           color: "#84CC16", count: assets.filter(a => assignmentByAssetId[a.id]?.priority_bucket === "Low").length },
        { label: "Completed",     color: "#22C55E", count: assets.filter(a => assignmentByAssetId[a.id]?.assignment_status === "Completed").length },
        { label: "Deferred",      color: "#A78BFA", count: assets.filter(a => assignmentByAssetId[a.id]?.assignment_status === "Deferred").length },
        { label: "Unassigned",    color: "#CBD5E1", count: assets.filter(a => !assignmentByAssetId[a.id]).length },
      ];
  }
}

// ─── Empty per-map filter state ────────────────────────────────────────────────

export const EMPTY_MAP_FILTERS = {
  search: "",
  city: "",
  municipality: "",
  shelter_type: "",
  ordered_shelter_type: "",
  installed_shelter_type: "",
  asset_status: "",
  assignment_status: "",
  assignment_type: "",
  priority_bucket: "",
  team_name: "",
  order_year: "",
  delivery_year: "",
  inspection_status: "",
  category: "",
  asset_stage: "",
  asset_source: "",
  existing_condition: "",
  has_bay: "",
  phase: "",
  planned_week: "",
  show_unassigned_only: false,
  has_incident: false,
  has_work_order: false,
  is_ordered: false,
  is_implementation_phase: false,
};

// ─── Apply map filters ─────────────────────────────────────────────────────────

export function applyMapFilters(assets, filters, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, visibleLayerIds, layerAssets, weeks = []) {
    const parseMultiSelect = (value) => {
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    };

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

      // Multi-select filters (OR logic within each filter)
      const cityValues = parseMultiSelect(f.city);
      if (cityValues.length > 0 && !cityValues.includes(a.city)) return false;

      const orderYearValues = parseMultiSelect(f.order_year);
      if (orderYearValues.length > 0 && !orderYearValues.includes(String(a.order_year))) return false;

      const orderedTypeValues = parseMultiSelect(f.ordered_shelter_type);
      if (orderedTypeValues.length > 0 && !orderedTypeValues.includes(a.ordered_shelter_type)) return false;

      const installedTypeValues = parseMultiSelect(f.installed_shelter_type);
      if (installedTypeValues.length > 0 && !installedTypeValues.includes(a.installed_shelter_type)) return false;

      const inspectionValues = parseMultiSelect(f.inspection_status);
      if (inspectionValues.length > 0 && !inspectionValues.includes(a.inspection_status)) return false;

      const plannedWeekValues = parseMultiSelect(f.planned_week);
      if (plannedWeekValues.length > 0) {
        const asgn = assignmentByAssetId[a.id];
        const weekCodes = plannedWeekValues;
        const weekIds = weekCodes.map(code => weeks.find(w => w.week_code === code)?.id).filter(Boolean);
        if (!asgn || !weekIds.includes(asgn.planning_week_id)) return false;
      }

      // Single-value filters (kept for backward compat)
      if (f.municipality && a.municipality !== f.municipality) return false;
      if (f.shelter_type && a.shelter_type !== f.shelter_type) return false;
      if (f.asset_status && a.status !== f.asset_status) return false;
      if (f.delivery_year && String(a.delivery_year) !== f.delivery_year) return false;
      if (f.category && a.category !== f.category) return false;
      if (f.asset_stage && a.asset_stage !== f.asset_stage) return false;
      if (f.asset_source && a.asset_source !== f.asset_source) return false;
      if (f.existing_condition && a.existing_condition !== f.existing_condition) return false;
      if (f.has_bay && a.has_bay !== f.has_bay) return false;
      if (f.phase && a.phase !== f.phase) return false;

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