// ─── Priority & Pin Color Logic ───────────────────────────────────────────────

export const PRIORITY_ORDER = ["P1", "P2", "Critical", "High", "Medium", "Low"];

export function computePriorityBucket(incident, workOrder) {
  const incidentPriority = incident?.initial_priority || incident?.priority;
  if (incidentPriority === "P1") return "P1";
  if (incidentPriority === "P2") return "P2";
  const woPriority = workOrder?.priority;
  if (woPriority === "Critical") return "Critical";
  if (woPriority === "High") return "High";
  if (woPriority === "Medium") return "Medium";
  if (woPriority === "Low") return "Low";
  return "Medium";
}

// Pin color constants — single source of truth used by map, legend, and table dot
export const PIN_COLORS = {
  completed:  "#22C55E",  // green
  cancelled:  "#9CA3AF",  // grey
  deferred:   "#A78BFA",  // purple
  p1:         "#EF4444",  // red
  p2:         "#F97316",  // orange
  medium:     "#3B82F6",  // blue
  low:        "#84CC16",  // lime (distinct from completed green)
  unassigned: "#CBD5E1",  // light slate
};

export function computePinColor(priorityBucket, assignmentStatus) {
  if (assignmentStatus === "Completed") return PIN_COLORS.completed;
  if (assignmentStatus === "Cancelled") return PIN_COLORS.cancelled;
  if (assignmentStatus === "Deferred")  return PIN_COLORS.deferred;
  switch (priorityBucket) {
    case "P1":
    case "Critical": return PIN_COLORS.p1;
    case "P2":
    case "High":     return PIN_COLORS.p2;
    case "Medium":   return PIN_COLORS.medium;
    case "Low":      return PIN_COLORS.low;
    default:         return PIN_COLORS.medium;
  }
}

export function pinColorStyle(color) {
  return { backgroundColor: color || "#9CA3AF" };
}

// ─── Status color helpers ─────────────────────────────────────────────────────

export function assignmentStatusColor(status) {
  switch (status) {
    case "Planned":     return "bg-slate-100 text-slate-600 border-slate-200";
    case "In Progress": return "bg-blue-100 text-blue-700 border-blue-200";
    case "Completed":   return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Deferred":    return "bg-purple-100 text-purple-700 border-purple-200";
    case "Cancelled":   return "bg-red-100 text-red-500 border-red-200";
    default:            return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

export function priorityBucketColor(bucket) {
  switch (bucket) {
    case "P1":
    case "Critical": return "bg-red-100 text-red-700 border-red-200";
    case "P2":
    case "High":     return "bg-orange-100 text-orange-700 border-orange-200";
    case "Medium":   return "bg-blue-100 text-blue-700 border-blue-200";
    case "Low":      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:         return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

// ─── Filter helpers ────────────────────────────────────────────────────────────

export const EMPTY_FILTERS = {
  search: "",
  city: "",
  shelter_type: "",
  asset_status: "",
  assignment_status: "",
  assignment_type: "",
  priority_bucket: "",
  team_name: "",
  assigned_to: "",
  route_zone: "",
  has_incident: false,
  has_work_order: false,
  show_unassigned_only: false,
};

export function mapViewToFilters(view) {
  return {
    search: "",
    city: view.filter_city || "",
    shelter_type: view.filter_shelter_type || "",
    asset_status: view.filter_asset_status || "",
    assignment_status: view.filter_assignment_status || "",
    assignment_type: view.filter_assignment_type || "",
    priority_bucket: view.filter_priority_bucket || "",
    team_name: view.filter_team_name || "",
    assigned_to: "",
    route_zone: view.filter_route_zone || "",
    has_incident: view.filter_has_incident || false,
    has_work_order: view.filter_has_work_order || false,
    show_unassigned_only: false,
  };
}

export function filtersToMapView(filters) {
  return {
    filter_city: filters.city || "",
    filter_shelter_type: filters.shelter_type || "",
    filter_asset_status: filters.asset_status || "",
    filter_assignment_status: filters.assignment_status || "",
    filter_assignment_type: filters.assignment_type || "",
    filter_priority_bucket: filters.priority_bucket || "",
    filter_team_name: filters.team_name || "",
    filter_route_zone: filters.route_zone || "",
    filter_has_incident: filters.has_incident || false,
    filter_has_work_order: filters.has_work_order || false,
  };
}

export function countActiveFilters(filters) {
  return [
    "city", "shelter_type", "asset_status", "assignment_status",
    "assignment_type", "priority_bucket", "team_name", "assigned_to", "route_zone",
  ].filter(k => filters[k]).length
    + (filters.has_incident ? 1 : 0)
    + (filters.has_work_order ? 1 : 0)
    + (filters.show_unassigned_only ? 1 : 0);
}

// ─── Snapshot computation (dynamic, no DB write required) ─────────────────────

export function computeSnapshot(weekId, weekCode, weekName, assignments) {
  const wa = assignments.filter(a => a.planning_week_id === weekId);
  return {
    planning_week_id: weekId,
    week_code: weekCode,
    week_name: weekName,
    total_assets_assigned: wa.length,
    total_planned:     wa.filter(a => a.assignment_status === "Planned").length,
    total_in_progress: wa.filter(a => a.assignment_status === "In Progress").length,
    total_completed:   wa.filter(a => a.assignment_status === "Completed").length,
    total_deferred:    wa.filter(a => a.assignment_status === "Deferred").length,
    total_cancelled:   wa.filter(a => a.assignment_status === "Cancelled").length,
    total_p1:       wa.filter(a => a.priority_bucket === "P1").length,
    total_p2:       wa.filter(a => a.priority_bucket === "P2").length,
    total_critical: wa.filter(a => a.priority_bucket === "Critical").length,
    total_high:     wa.filter(a => a.priority_bucket === "High").length,
    total_medium:   wa.filter(a => a.priority_bucket === "Medium").length,
    total_low:      wa.filter(a => a.priority_bucket === "Low").length,
  };
}

// ─── Default MapView Presets ──────────────────────────────────────────────────

export const DEFAULT_PRESETS = [
  { name: "All Assets",         view_type: "Default",    sort_order: 0, is_default: true,  is_shared: true, description: "Show all assets with coordinates" },
  { name: "Inspection Focus",   view_type: "Inspection", sort_order: 1, is_default: true,  is_shared: true, description: "Assets with inspection assignments", filter_assignment_type: "Inspection" },
  { name: "Priority Focus",     view_type: "Priority",   sort_order: 2, is_default: true,  is_shared: true, description: "P1, P2 and Critical priority assets", filter_priority_bucket: "P1" },
  { name: "Assigned This Week", view_type: "Assignment", sort_order: 3, is_default: true,  is_shared: true, description: "Only assets assigned to selected week", filter_assignment_status: "Planned" },
  { name: "Unassigned Assets",  view_type: "Custom",     sort_order: 4, is_default: false, is_shared: true, description: "Assets not yet assigned to selected week" },
];

// ─── Change Flag logic (comparison mode) ─────────────────────────────────────

export function computeChangeFlag(asgA, asgB) {
  if (!asgA && !asgB) return null;
  if (!asgA && asgB)  return "Added in B";
  if (asgA && !asgB)  return "Removed in B";
  if (asgA.assignment_status !== asgB.assignment_status) return "Status Changed";
  if ((asgA.team_name || "") !== (asgB.team_name || ""))  return "Team Changed";
  if ((asgA.assigned_to || "") !== (asgB.assigned_to || "")) return "Assignee Changed";
  return "No Change";
}

export function changeFlagStyle(flag) {
  switch (flag) {
    case "Added in B":      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "Removed in B":    return "text-red-600 bg-red-50 border-red-200";
    case "Status Changed":  return "text-amber-700 bg-amber-50 border-amber-200";
    case "Team Changed":    return "text-blue-700 bg-blue-50 border-blue-200";
    case "Assignee Changed":return "text-indigo-700 bg-indigo-50 border-indigo-200";
    case "No Change":       return "text-slate-400 bg-slate-50 border-slate-200";
    default:                return "text-slate-400 bg-slate-50 border-slate-200";
  }
}