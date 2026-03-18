// ─── Priority Bucket Logic ────────────────────────────────────────────────────
export function computePriorityBucket(incident, workOrder) {
  if (incident) {
    if (incident.initial_priority === "P1") return "P1";
    if (incident.initial_priority === "P2") return "P2";
    if (incident.priority === "Critical") return "Critical";
    if (incident.priority) return incident.priority;
  }
  if (workOrder) {
    if (workOrder.priority === "Critical") return "Critical";
    if (workOrder.priority) return workOrder.priority;
  }
  return "";
}

// ─── Pin Color Logic ──────────────────────────────────────────────────────────
export function computePinColor(priorityBucket, assignmentStatus) {
  if (assignmentStatus === "Completed") return "#9CA3AF"; // Gray
  switch (priorityBucket) {
    case "P1":      return "#EF4444"; // Red
    case "Critical":return "#EF4444"; // Red
    case "P2":      return "#F97316"; // Orange
    case "High":    return "#F97316"; // Orange
    case "Medium":  return "#3B82F6"; // Blue
    case "Low":     return "#22C55E"; // Green
    default:        return "#6366F1"; // Indigo fallback
  }
}

// ─── Pin color to CSS tailwind-safe class ─────────────────────────────────────
export function pinColorStyle(color) {
  return { backgroundColor: color || "#6366F1" };
}

// ─── Assignment status badge colors ──────────────────────────────────────────
export function assignmentStatusColor(status) {
  switch (status) {
    case "Planned":     return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "In Progress": return "bg-amber-100 text-amber-700 border-amber-200";
    case "Completed":   return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Deferred":    return "bg-slate-100 text-slate-600 border-slate-200";
    case "Cancelled":   return "bg-red-100 text-red-600 border-red-200";
    default:            return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

// ─── Priority badge colors ─────────────────────────────────────────────────
export function priorityBucketColor(bucket) {
  switch (bucket) {
    case "P1":
    case "Critical": return "bg-red-100 text-red-700 border-red-200";
    case "P2":
    case "High":     return "bg-orange-100 text-orange-700 border-orange-200";
    case "Medium":   return "bg-blue-100 text-blue-700 border-blue-200";
    case "Low":      return "bg-green-100 text-green-700 border-green-200";
    default:         return "bg-slate-100 text-slate-500 border-slate-200";
  }
}