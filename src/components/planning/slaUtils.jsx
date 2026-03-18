// ─── SLA & Scheduling Score Utilities ────────────────────────────────────────

/**
 * Compute SLA due date from a base date + max_resolution_days from a matching SLA rule.
 * Returns a Date object or null.
 */
export function computeSLADueDate(assignment, incident, slaRules) {
  const rule = findMatchingRule(assignment, incident, slaRules);
  if (!rule || !rule.max_resolution_days) return null;

  const baseDate = incident?.reported_date || incident?.first_report_date || assignment.created_date;
  if (!baseDate) return null;

  const d = new Date(baseDate);
  d.setDate(d.getDate() + rule.max_resolution_days);
  return d;
}

/**
 * Find best matching SLA rule for an assignment/incident pair.
 */
export function findMatchingRule(assignment, incident, slaRules) {
  const active = slaRules.filter(r => r.is_active !== false);

  // Match by incident priority first
  const incidentPriority = incident?.initial_priority || incident?.priority;
  if (incidentPriority) {
    const byPriority = active.find(r => r.incident_priority_source === incidentPriority);
    if (byPriority) return byPriority;
  }

  // Match by assignment type
  if (assignment?.assignment_type) {
    const byType = active.find(r => r.assignment_type === assignment.assignment_type);
    if (byType) return byType;
  }

  return null;
}

/**
 * Compute SLA risk level from due date.
 * Thresholds: overdue or ≤2d → Critical, ≤7d → High, ≤14d → Medium, else Low.
 * Optionally pass maxResolutionDays from the matched rule to make thresholds proportional.
 */
export function computeSLARiskLevel(slaDueDate, maxResolutionDays) {
  if (!slaDueDate) return null;

  const now = new Date();
  const due = new Date(slaDueDate);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Critical"; // overdue

  // If we have context from the rule, use proportional thresholds
  if (maxResolutionDays && maxResolutionDays > 0) {
    const pct = diffDays / maxResolutionDays;
    if (pct <= 0.1)  return "Critical";
    if (pct <= 0.25) return "High";
    if (pct <= 0.5)  return "Medium";
    return "Low";
  }

  // Fallback to absolute thresholds
  if (diffDays <= 2)  return "Critical";
  if (diffDays <= 7)  return "High";
  if (diffDays <= 14) return "Medium";
  return "Low";
}

/**
 * Compute a scheduling priority score (0–100).
 * Higher = more urgent.
 */
export function computeSchedulingScore({ priorityBucket, slaRiskLevel, assignmentStatus, slaDueDate, nextInspectionDate }) {
  let score = 0;

  // Priority bucket
  const priorityScores = { P1: 40, P2: 35, Critical: 35, High: 25, Medium: 15, Low: 5 };
  score += priorityScores[priorityBucket] || 10;

  // SLA risk level
  const slaScores = { Critical: 30, High: 20, Medium: 10, Low: 2 };
  score += slaScores[slaRiskLevel] || 0;

  // Assignment status penalty
  if (assignmentStatus === "Deferred") score += 5;
  if (assignmentStatus === "Planned")  score += 0;
  if (assignmentStatus === "In Progress") score -= 5;

  // Inspection due urgency
  if (nextInspectionDate) {
    const daysUntilInspection = Math.ceil((new Date(nextInspectionDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilInspection < 0)   score += 15; // overdue
    else if (daysUntilInspection <= 7)  score += 10;
    else if (daysUntilInspection <= 30) score += 5;
  }

  // Overdue SLA bonus — only when slaRiskLevel is not already Critical (avoid double-counting)
  if (slaDueDate && new Date(slaDueDate) < new Date() && slaRiskLevel !== "Critical") score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Generate scheduling recommendations for a set of assignments.
 * Returns array of recommendation objects (not yet persisted).
 */
export function generateRecommendations({ weekId, assignments, assetsMap, incidentsByAsset, crewsMap, crewSchedules, slaRules }) {
  const recs = [];
  const crewTaskCount = {};
  assignments.forEach(a => { if (a.crew_id) crewTaskCount[a.crew_id] = (crewTaskCount[a.crew_id] || 0) + 1; });

  // Pre-compute per-crew overload flags once, outside per-assignment loop
  const crewOverloaded = {};
  Object.entries(crewTaskCount).forEach(([crewId, count]) => {
    const crew = crewsMap[crewId];
    if (crew?.capacity_per_week && count > crew.capacity_per_week) {
      crewOverloaded[crewId] = { crew, count };
    }
  });

  assignments.forEach(assignment => {
    const asset = assetsMap[assignment.asset_id];
    const incidents = [...(incidentsByAsset[assignment.asset_id] || [])]; // copy before sort
    const latestIncident = incidents.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    // P1/P2 unassigned
    if (!assignment.crew_id && (assignment.priority_bucket === "P1" || assignment.priority_bucket === "P2")) {
      recs.push({
        planning_week_id: weekId,
        asset_id: assignment.asset_id,
        planning_assignment_id: assignment.id,
        recommendation_type: "Priority Escalation",
        recommendation_score: assignment.priority_bucket === "P1" ? 95 : 85,
        recommendation_reason: `${assignment.priority_bucket} assignment has no crew assigned`,
        suggested_action: "Assign a crew immediately",
        status: "Open",
        created_by_engine: true,
      });
    }

    // SLA risk
    if (assignment.sla_risk_level === "Critical" || assignment.sla_risk_level === "High") {
      recs.push({
        planning_week_id: weekId,
        asset_id: assignment.asset_id,
        planning_assignment_id: assignment.id,
        recommendation_type: "SLA Risk",
        recommendation_score: assignment.sla_risk_level === "Critical" ? 90 : 70,
        recommendation_reason: `SLA risk is ${assignment.sla_risk_level}${assignment.sla_due_date ? ` — due ${assignment.sla_due_date}` : ""}`,
        suggested_action: "Prioritise this assignment in scheduling",
        status: "Open",
        created_by_engine: true,
      });
    }

    // Inspection overdue
    if (asset?.next_inspection_date) {
      const daysUntil = Math.ceil((new Date(asset.next_inspection_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        recs.push({
          planning_week_id: weekId,
          asset_id: assignment.asset_id,
          planning_assignment_id: assignment.id,
          recommendation_type: "Inspection Due",
          recommendation_score: 80,
          recommendation_reason: `Inspection overdue by ${Math.abs(daysUntil)} days`,
          suggested_action: "Schedule inspection immediately",
          status: "Open",
          created_by_engine: true,
        });
      }
    }

    // Crew over-capacity
    if (assignment.crew_id) {
      const crew = crewsMap[assignment.crew_id];
      const taskCount = crewTaskCount[assignment.crew_id] || 0;
      if (crew?.capacity_per_week && taskCount > crew.capacity_per_week) {
        recs.push({
          planning_week_id: weekId,
          asset_id: assignment.asset_id,
          planning_assignment_id: assignment.id,
          recommended_crew_id: assignment.crew_id,
          recommendation_type: "Capacity Balancing",
          recommendation_score: 60,
          recommendation_reason: `Crew ${crew.crew_name} has ${taskCount} tasks (capacity: ${crew.capacity_per_week}/week)`,
          suggested_action: "Reassign some tasks to another crew or defer",
          status: "Open",
          created_by_engine: true,
        });
      }
    }
  });

  // Deduplicate by asset + type
  const seen = new Set();
  return recs.filter(r => {
    const key = `${r.asset_id}|${r.recommendation_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── SLA risk display helpers ─────────────────────────────────────────────────

export function slaRiskColor(level) {
  switch (level) {
    case "Critical": return "bg-red-100 text-red-700 border-red-200";
    case "High":     return "bg-orange-100 text-orange-700 border-orange-200";
    case "Medium":   return "bg-amber-100 text-amber-700 border-amber-200";
    case "Low":      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:         return "bg-slate-100 text-slate-400 border-slate-200";
  }
}

export function recommendationTypeColor(type) {
  switch (type) {
    case "Priority Escalation": return "bg-red-50 text-red-700 border-red-200";
    case "SLA Risk":            return "bg-orange-50 text-orange-700 border-orange-200";
    case "Reassign":            return "bg-blue-50 text-blue-700 border-blue-200";
    case "Route Optimization":  return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Capacity Balancing":  return "bg-amber-50 text-amber-700 border-amber-200";
    case "Inspection Due":      return "bg-purple-50 text-purple-700 border-purple-200";
    default:                    return "bg-slate-50 text-slate-600 border-slate-200";
  }
}