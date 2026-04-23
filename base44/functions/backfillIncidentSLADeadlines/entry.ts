import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { addDays, addHours, isWeekend } from 'npm:date-fns@3.6.0';

/**
 * Inline port of computePriorityDeadlines from slaEngine.js
 * (no local imports allowed in backend functions)
 */
function computePriorityDeadlines(createdAt, priority, isOWR, caApprovalDate) {
  if (!createdAt || !priority) return {};
  const created = new Date(createdAt);

  let acknowledgement_deadline = null;
  let make_safe_deadline = null;
  let restoration_deadline = null;

  if (priority === "P1") {
    // P1 (Low): acknowledgement = next working day + 24h
    let nextWorkDay = addDays(created, 1);
    while (isWeekend(nextWorkDay)) nextWorkDay = addDays(nextWorkDay, 1);
    acknowledgement_deadline = addHours(nextWorkDay, 24).toISOString();

    // P1: make safe not required
    make_safe_deadline = null;

    // P1 restoration: OWR = CA approval + 21 days, else = created + 28 days
    if (isOWR && caApprovalDate) {
      restoration_deadline = addDays(new Date(caApprovalDate), 21).toISOString();
    } else {
      restoration_deadline = addDays(created, 28).toISOString();
    }
  } else if (priority === "P2") {
    // P2 (High/Urgent): acknowledgement = end of day (23:59) of created_at
    const endOfDay = new Date(created);
    endOfDay.setHours(23, 59, 0, 0);
    if (created.getHours() >= 17) {
      let nextDay = addDays(created, 1);
      while (isWeekend(nextDay)) nextDay = addDays(nextDay, 1);
      nextDay.setHours(9, 0, 0, 0);
      acknowledgement_deadline = nextDay.toISOString();
    } else {
      acknowledgement_deadline = endOfDay.toISOString();
    }

    // P2: make safe within 24h
    make_safe_deadline = addHours(created, 24).toISOString();

    // P2 restoration: created + 28 days (OWR with CA approval overrides)
    if (isOWR && caApprovalDate) {
      restoration_deadline = addDays(new Date(caApprovalDate), 21).toISOString();
    } else {
      restoration_deadline = addDays(created, 28).toISOString();
    }
  }

  return { acknowledgement_deadline, make_safe_deadline, restoration_deadline };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all incidents
    const incidents = await base44.asServiceRole.entities.Incidents.list();

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const incident of incidents) {
      // Normalize priority — handles "P1 (Χαμηλή)", "P2 (Υψηλή)", or plain "P1"/"P2"
      const rawPriority = incident.operational_priority || incident.initial_priority || "";
      let priority = null;
      if (/^P1/i.test(rawPriority)) priority = "P1";
      else if (/^P2/i.test(rawPriority)) priority = "P2";

      if (!priority) {
        skipped++;
        continue;
      }

      const createdAt = incident.incident_created_at || incident.created_date;
      if (!createdAt) {
        skipped++;
        continue;
      }

      const isOWR = incident.warranty_status === "OWR" || incident.is_owr === true || incident.out_of_warranty === "Yes";

      // For OWR incidents with CA approval, use the CA approval date for restoration
      const caApprovalDate = incident.ca_decision === "Approved" ? incident.ca_decision_at : null;

      const deadlines = computePriorityDeadlines(createdAt, priority, isOWR, caApprovalDate);

      if (!deadlines.acknowledgement_deadline && !deadlines.restoration_deadline) {
        skipped++;
        continue;
      }

      // Only set fields that are not already set, OR force-overwrite (backfill mode = always overwrite)
      const updates = {
        acknowledgement_deadline: deadlines.acknowledgement_deadline,
        make_safe_deadline: deadlines.make_safe_deadline || null,
        restoration_deadline: deadlines.restoration_deadline,
      };

      // Normalize and store operational_priority as clean "P1"/"P2"
      if (!incident.operational_priority || !/^P[12]$/.test(incident.operational_priority)) {
        updates.operational_priority = priority; // "P1" or "P2" (clean)
      }

      // Also set warranty_status if missing but is_owr is set
      if (!incident.warranty_status) {
        updates.warranty_status = isOWR ? "OWR" : "In Warranty";
      }

      try {
        await base44.asServiceRole.entities.Incidents.update(incident.id, updates);
        updated++;
      } catch (e) {
        errors.push({ id: incident.id, incident_id: incident.incident_id, error: e.message });
      }
    }

    return Response.json({
      success: true,
      total: incidents.length,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});