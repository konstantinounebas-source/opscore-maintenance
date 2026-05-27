import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, formData, status, workerName } = await req.json();

    if (!token || !formData) return Response.json({ error: 'Missing token or formData' }, { status: 400 });

    // Decode and validate token
    let decoded;
    try {
      decoded = atob(token);
    } catch {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    const parts = decoded.split(':');
    if (parts.length < 3) return Response.json({ error: 'Invalid token format' }, { status: 400 });

    const [incidentId, formType, timestampStr] = parts;
    const timestamp = parseInt(timestampStr);

    const fortyEightHours = 48 * 60 * 60 * 1000;
    if (Date.now() - timestamp > fortyEightHours) {
      return Response.json({ error: 'Token expired. Please request a new link.' }, { status: 401 });
    }

    const formTypeMap = {
      make_safe: 'make_safe_checklist',
      corrective: 'corrective_wo_checklist',
    };
    const formNameMap = {
      make_safe: 'MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ',
      corrective: 'Corrective Work Order Checklist',
    };

    const dbFormType = formTypeMap[formType] || formType;
    const dbFormName = formNameMap[formType] || formType;

    // Check for existing submission
    const existing = await base44.asServiceRole.entities.FormSubmissions.filter({
      incident_id: incidentId,
      form_type: dbFormType,
    });

    const payload = {
      form_type: dbFormType,
      form_name: dbFormName,
      incident_id: incidentId,
      status: status || 'Draft',
      form_data: formData,
      submitted_at: status === 'Submitted' ? new Date().toISOString() : undefined,
      submitted_by: workerName || 'Field Worker',
    };

    // Get asset_id from incident
    const incidents = await base44.asServiceRole.entities.Incidents.filter({ id: incidentId });
    const incident = incidents[0];
    if (incident?.related_asset_id) payload.asset_id = incident.related_asset_id;

    let result;
    const drafts = existing.filter(s => s.status === 'Draft');
    if (drafts.length > 0) {
      result = await base44.asServiceRole.entities.FormSubmissions.update(drafts[0].id, payload);
    } else {
      result = await base44.asServiceRole.entities.FormSubmissions.create(payload);
    }

    // Audit trail
    await base44.asServiceRole.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: status === 'Submitted' ? `Field Worker Form Submitted` : 'Field Worker Form Draft Saved',
      details: `${dbFormName} ${status === 'Submitted' ? 'submitted' : 'saved as draft'} by ${workerName || 'Field Worker'} via mobile form link.`,
      user: workerName || 'Field Worker (via Telegram link)',
    });

    // If submitted, update incident make_safe_done flag
    if (status === 'Submitted' && formType === 'make_safe' && incident) {
      await base44.asServiceRole.entities.Incidents.update(incident.id, { make_safe_done: true });
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});