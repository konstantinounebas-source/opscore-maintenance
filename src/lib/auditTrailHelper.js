import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";

/**
 * Creates a grouped audit log entry with full context, state transition metadata, and atomic attachment grouping.
 * 
 * Usage:
 *   await createAuditEntry({
 *     incident_id: "INC-001",
 *     action: "Workflow State Change",
 *     details: "CR+OMPI Submitted",
 *     user_email: "user@example.com",
 *     state_before: "Awaiting_CR_OMPI",
 *     state_after: "CR_OMPI_Submitted",
 *     attachments: [{url, name}, ...],  // Optional: grouped attachments for this action
 *     work_order_id: "WO-123",           // Optional: linked work order
 *     form_type: "cr_ompi",              // Optional: form submission reference
 *     form_submission_id: "FS-456",      // Optional: form submission ID
 *   });
 */
export async function createAuditEntry(params) {
  const {
    incident_id,
    action,
    details,
    user_email,
    state_before,
    state_after,
    attachments = [],
    work_order_id,
    form_type,
    form_submission_id,
  } = params;

  const timestamp = getAthensTimestamp();
  const user = await base44.auth.me();

  // Build state transition metadata for details
  let enrichedDetails = details || action;
  if (state_before && state_after) {
    enrichedDetails = `${enrichedDetails} (${state_before} → ${state_after})`;
  }

  // Build atomic attachment_metadata — all attachments grouped under this single entry
  const attachment_metadata = [];

  // 1. Add form reference as special virtual URL (if applicable)
  if (form_submission_id && form_type) {
    attachment_metadata.push({
      url: `form:${form_submission_id}:${form_type}`,
      name: `Form Submission (${form_type})`,
      author: user_email || user?.email,
      author_name: user?.full_name,
      created_at: timestamp,
    });
  }

  // 2. Add all file attachments
  if (Array.isArray(attachments) && attachments.length > 0) {
    attachment_metadata.push(
      ...attachments.map(att => ({
        url: att.url || att.file_url,
        name: att.name || att.file_name || att.url.split("/").pop(),
        author: user_email || user?.email,
        author_name: user?.full_name,
        created_at: timestamp,
      }))
    );
  }

  // Create the audit entry
  const auditData = {
    incident_id,
    action,
    details: enrichedDetails,
    user: user_email || user?.email,
    ...(attachment_metadata.length > 0 ? { attachment_metadata } : {}),
    ...(work_order_id ? { work_order_id } : {}),
  };

  return base44.entities.IncidentAuditTrail.create(auditData);
}

/**
 * Logs a workflow state transition with full context.
 */
export async function logStateTransition(incident_id, oldState, newState, details, context = {}) {
  const { attachments = [], work_order_id, form_type, form_submission_id } = context;
  const user = await base44.auth.me();

  return createAuditEntry({
    incident_id,
    action: "Workflow State Transition",
    details,
    user_email: user?.email,
    state_before: oldState,
    state_after: newState,
    attachments,
    work_order_id,
    form_type,
    form_submission_id,
  });
}

/**
 * Logs a form submission event with full context.
 */
export async function logFormSubmission(incident_id, formType, formName, attachments = [], workOrderId) {
  const user = await base44.auth.me();

  return createAuditEntry({
    incident_id,
    action: "Form Submitted",
    details: `${formName} – ${formType}`,
    user_email: user?.email,
    attachments,
    work_order_id: workOrderId,
    form_type: formType,
  });
}

/**
 * Logs an action with mandatory context (user, timestamp, state before/after).
 */
export async function logIncidentAction(incident_id, actionName, actionDetails, context = {}) {
  const {
    state_before,
    state_after,
    attachments = [],
    work_order_id,
    form_type,
    form_submission_id,
  } = context;

  return createAuditEntry({
    incident_id,
    action: actionName,
    details: actionDetails,
    state_before,
    state_after,
    attachments,
    work_order_id,
    form_type,
    form_submission_id,
  });
}

/**
 * Build attachment metadata from file objects (used when mirroring attachments).
 */
export function buildAttachmentMetadata(files = []) {
  return files.map(f => ({
    url: f.url || f.file_url,
    name: f.name || f.file_name || (f.url || f.file_url).split("/").pop(),
  }));
}