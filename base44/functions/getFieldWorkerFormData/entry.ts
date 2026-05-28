import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 });

    // Decode token: base64(incidentId:formType:timestamp)
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

    // Check token expiry: 48 hours
    const fortyEightHours = 48 * 60 * 60 * 1000;
    if (Date.now() - timestamp > fortyEightHours) {
      return Response.json({ error: 'Token expired. Please request a new link.' }, { status: 401 });
    }

    // Use service role — no user auth required for field workers
    const incidents = await base44.asServiceRole.entities.Incidents.filter({ id: incidentId });
    const incident = incidents[0];
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    // Fetch asset if linked
    let asset = null;
    if (incident.related_asset_id) {
      const assets = await base44.asServiceRole.entities.Assets.filter({ id: incident.related_asset_id });
      asset = assets[0] || null;
    }

    // Fetch existing form submission (draft) if any
    const formTypeMap = {
      'make_safe': 'make_safe_checklist',
      'inspection': 'inspection_wo_checklist',
      'corrective': 'corrective_wo_checklist',
    };
    const submissions = await base44.asServiceRole.entities.FormSubmissions.filter({
      incident_id: incidentId,
      form_type: formTypeMap[formType] || 'corrective_wo_checklist',
    });
    let existingSubmission = null;
    if (submissions.length > 0) {
      const drafts = submissions.filter(s => s.status === 'Draft');
      existingSubmission = drafts.length > 0 ? drafts[drafts.length - 1] : null;
    }

    // Fetch work orders for this incident
    const workOrders = await base44.asServiceRole.entities.WorkOrders.filter({ incident_id: incidentId });

    return Response.json({
      incidentId,
      formType,
      incident,
      asset,
      workOrders,
      existingSubmission,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});