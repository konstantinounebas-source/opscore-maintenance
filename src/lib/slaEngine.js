/**
 * Centralized SLA Calculation Engine
 *
 * PRIORITY CONVENTION (contractual):
 *   P1 = LOW priority  → 48-hour CR+OMPI window (less urgent)
 *   P2 = HIGH priority → 24-hour CR+OMPI window (urgent / same-day)
 *
 * All SLA deadlines are calculated here.
 * Forms and workflow components must NOT contain hardcoded SLA math.
 */

import { addDays, addHours, isWeekend, format, isBefore, differenceInHours } from "date-fns";

// ── Default SLA rule table (fallback when SLARules entity is empty) ──────────
// PRIORITY: P1 = Low (48h), P2 = High (24h)
export const DEFAULT_SLA_RULES = [
  {
    code: "SLA_1_CR_OMPI_P1",
    name: "Confirmation of Receipt + OMPI (P1 – Low)",
    priority: "P1",
    warranty_status: "Any",
    phase: "CR_OMPI",
    duration_value: 48,      // P1 = Low priority = 48 hours
    duration_unit: "hours",
    warning_threshold_hours: 8,
    breach_threshold_hours: 0,
  },
  {
    code: "SLA_1_CR_OMPI_P2",
    name: "Confirmation of Receipt + OMPI (P2 – High)",
    priority: "P2",
    warranty_status: "Any",
    phase: "CR_OMPI",
    duration_value: 24,      // P2 = High priority = 24 hours (urgent)
    duration_unit: "hours",
    warning_threshold_hours: 4,
    breach_threshold_hours: 0,
  },
  {
    code: "SLA_2_FMPI_OWR",
    name: "FMPI Submission Deadline (OWR)",
    priority: "Any",
    warranty_status: "OWR",
    phase: "FMPI",
    duration_value: 7,
    duration_unit: "calendar_days",
    warning_threshold_hours: 24,
    breach_threshold_hours: 0,
  },
  {
    code: "SLA_2_FMPI_IW",
    name: "FMPI Submission Deadline (In Warranty)",
    priority: "Any",
    warranty_status: "In Warranty",
    phase: "FMPI",
    duration_value: 14,
    duration_unit: "calendar_days",
    warning_threshold_hours: 48,
    breach_threshold_hours: 0,
  },
  {
    code: "SLA_3_REPAIR_IW",
    name: "Repair Completion (In Warranty)",
    priority: "Any",
    warranty_status: "In Warranty",
    phase: "Repair",
    duration_value: 28,
    duration_unit: "calendar_days",
    warning_threshold_hours: 48,
    breach_threshold_hours: 0,
  },
  {
    code: "SLA_3_REPAIR_OWR",
    name: "Repair Completion (OWR – 21 days from CA approval)",
    priority: "Any",
    warranty_status: "OWR",
    phase: "Repair",
    duration_value: 21,       // Exactly 21 calendar days from CA approval date
    duration_unit: "calendar_days",
    warning_threshold_hours: 48,
    breach_threshold_hours: 0,
  },
];

// ── Merges loaded rules with defaults (loaded rules override defaults by code) ─
export function mergeRules(loadedRules = []) {
  const map = {};
  for (const r of DEFAULT_SLA_RULES) map[r.code] = r;
  for (const r of loadedRules) {
    if (r.code) map[r.code] = { ...map[r.code], ...r };
  }
  return Object.values(map);
}

// ── Find best matching rule ──────────────────────────────────────────────────
export function findRule(rules, { phase, priority, warranty_status }) {
  let rule = rules.find(r =>
    r.phase === phase &&
    (r.priority === priority || r.priority === "Any") &&
    (r.warranty_status === warranty_status || r.warranty_status === "Any")
  );
  return rule || null;
}

// ── Add business days (skips weekends) ───────────────────────────────────────
export function addBusinessDaysLocal(date, days) {
  let d = new Date(date);
  let added = 0;
  while (added < days) {
    d = addDays(d, 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

// ── Calculate deadline from a start date and a rule ─────────────────────────
export function calcDeadline(startDate, rule) {
  if (!startDate || !rule) return null;
  const d = new Date(startDate);
  if (rule.duration_unit === "hours") {
    return addHours(d, rule.duration_value);
  }
  if (rule.duration_unit === "business_days") {
    return addBusinessDaysLocal(d, rule.duration_value);
  }
  // calendar_days (default)
  return addDays(d, rule.duration_value);
}

// ── Evaluate SLA status given a deadline and now ─────────────────────────────
export function evalSLAStatus(deadline, completedAt, rule) {
  if (!deadline) return "Paused";
  if (completedAt) return "Completed";
  const now = new Date();
  const dl = new Date(deadline);
  const hoursLeft = differenceInHours(dl, now);
  if (isBefore(dl, now)) return "Breached";
  const warningHours = rule?.warning_threshold_hours ?? 24;
  if (hoursLeft <= warningHours) return "At Risk";
  return "On Track";
}

// ── Main: compute CR+OMPI SLA for a newly created incident ──────────────────
// P1 = Low priority = 48h; P2 = High priority = 24h
export function computeCROMPISLA(incidentCreatedAt, operationalPriority, allRules) {
  const rules = mergeRules(allRules);
  // Default to P1 (Low) if no priority selected
  const rule = findRule(rules, {
    phase: "CR_OMPI",
    priority: operationalPriority || "P1",
    warranty_status: "Any",
  });
  if (!rule) return null;
  const deadline = calcDeadline(incidentCreatedAt, rule);
  return {
    active_sla_code: rule.code,
    active_sla_name: rule.name,
    sla_started_at: new Date(incidentCreatedAt).toISOString(),
    sla_deadline_at: deadline ? deadline.toISOString() : null,
    sla_status: evalSLAStatus(deadline, null, rule),
    rule,
  };
}

// ── Compute FMPI SLA starting at CR+OMPI completion ─────────────────────────
export function computeFMPISLA(crOmpiSubmittedAt, warrantyStatus, allRules) {
  const rules = mergeRules(allRules);
  const rule = findRule(rules, {
    phase: "FMPI",
    priority: "Any",
    warranty_status: warrantyStatus || "In Warranty",
  });
  if (!rule) return null;
  const deadline = calcDeadline(crOmpiSubmittedAt, rule);
  return {
    active_sla_code: rule.code,
    active_sla_name: rule.name,
    sla_started_at: new Date(crOmpiSubmittedAt).toISOString(),
    sla_deadline_at: deadline ? deadline.toISOString() : null,
    sla_status: evalSLAStatus(deadline, null, rule),
    rule,
  };
}

// ── Compute Repair SLA — MUST start from CA approval date for OWR incidents ──
// OWR: exactly 21 calendar days from CA approval date
// In Warranty: 28 calendar days from FMPI submission
export function computeRepairSLA(startAt, warrantyStatus, allRules) {
  const rules = mergeRules(allRules);
  const rule = findRule(rules, {
    phase: "Repair",
    priority: "Any",
    warranty_status: warrantyStatus || "In Warranty",
  });
  if (!rule) return null;
  const deadline = calcDeadline(startAt, rule);
  return {
    active_sla_code: rule.code,
    active_sla_name: rule.name,
    sla_started_at: new Date(startAt).toISOString(),
    sla_deadline_at: deadline ? deadline.toISOString() : null,
    sla_status: evalSLAStatus(deadline, null, rule),
    rule,
  };
}

// ── Re-evaluate live SLA status on a loaded incident ────────────────────────
export function refreshSLAStatus(incident) {
  if (!incident?.sla_deadline_at) return null;
  const now = new Date();
  const deadline = new Date(incident.sla_deadline_at);
  const hoursLeft = differenceInHours(deadline, now);

  if (incident.sla_completed_at) return "Completed";
  if (isBefore(deadline, now)) return "Breached";

  const warningHours = 24;
  if (hoursLeft <= warningHours) return "At Risk";
  return "On Track";
}

// ── Derive initial workflow_state from legacy boolean fields ─────────────────
export function deriveWorkflowStateFromLegacy(incident) {
  if (!incident) return "Awaiting_CR_OMPI";
  if (incident.workflow_state) return incident.workflow_state;

  if (incident.status === "Closed") return "Closed";
  if (incident.owr_fmpi_done) {
    if (incident.is_owr && incident.ca_status === "Approved") return "Approved_For_Corrective";
    if (incident.is_owr && incident.ca_status === "Not Approved") return "CA_Rejected";
    if (incident.is_owr && incident.ca_status === "Pending") return "Awaiting_CA_Approval";
    return "FMPI_Submitted";
  }
  if (incident.ompi_done) return "FMPI_Draft";
  if (incident.confirmation_done) return "CR_OMPI_Submitted";
  return "Awaiting_CR_OMPI";
}

// ── Format deadline for display ───────────────────────────────────────────────
export function formatDeadline(isoString) {
  if (!isoString) return "—";
  try {
    return format(new Date(isoString), "dd/MM/yyyy HH:mm");
  } catch {
    return "—";
  }
}

// ── Human-readable priority label ────────────────────────────────────────────
// P1 = Low, P2 = High (contractual definition)
export function getPriorityLabel(priority) {
  if (priority === "P1") return "P1 – Low";
  if (priority === "P2") return "P2 – High";
  return priority || "—";
}

// ── Determine what action the user should take next ──────────────────────────
export function getNextActionLabel(workflowState) {
  const map = {
    Awaiting_CR_OMPI:        "Submit Confirmation of Receipt + OMPI",
    CR_OMPI_Submitted:       "Submit FMPI",
    Awaiting_Make_Safe:      "Create Make Safe Work Order",
    Awaiting_Inspection:     "Create Inspection Work Order",
    FMPI_Draft:              "Submit FMPI",
    FMPI_Submitted:          "Awaiting CA Approval or proceed to Corrective",
    Awaiting_CA_Approval:    "Awaiting CA Approval",
    CA_Rejected:             "Revise and Resubmit FMPI",
    Approved_For_Corrective: "Create Corrective Work Order",
    Corrective_In_Progress:  "Complete Corrective Work Order",
    Awaiting_Closure:        "Submit Closure Evidence",
    Closed:                  "Incident Closed",
    Cancelled:               "Incident Cancelled",
  };
  return map[workflowState] || "Unknown State";
}