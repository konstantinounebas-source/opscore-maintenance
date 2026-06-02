import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, formData, status, workerName } = await req.json();

    if (!token || !formData) return Response.json({ error: 'Missing token or formData' }, { status: 400 });

    // Decode and validate token (restore URL-safe base64)
    let decoded;
    try {
      const standard = token.replace(/-/g, '+').replace(/_/g, '/');
      const padded = standard + '=='.slice(0, (4 - standard.length % 4) % 4);
      decoded = atob(padded);
    } catch {
      return Response.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Split from the right so incidentId can contain colons
    const lastColon = decoded.lastIndexOf(':');
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
    if (lastColon === -1 || secondLastColon === -1) return Response.json({ error: 'Invalid token format' }, { status: 400 });

    const incidentId = decoded.substring(0, secondLastColon);
    const formType = decoded.substring(secondLastColon + 1, lastColon);
    const timestampStr = decoded.substring(lastColon + 1);
    const timestamp = parseInt(timestampStr);

    const fortyEightHours = 48 * 60 * 60 * 1000;
    if (Date.now() - timestamp > fortyEightHours) {
      return Response.json({ error: 'Token expired. Please request a new link.' }, { status: 401 });
    }

    const formTypeMap = {
      make_safe: 'make_safe_checklist',
      corrective: 'corrective_wo_checklist',
      inspection: 'inspection_wo_checklist',
    };
    const formNameMap = {
      make_safe: 'MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ',
      corrective: 'Corrective Work Order Checklist',
      inspection: 'Inspection WO Checklist',
    };

    const dbFormType = formTypeMap[formType] || formType;
    const dbFormName = formNameMap[formType] || formType;

    // Get incident and related work orders in parallel
    const [incidents, existingForms, allWOs] = await Promise.all([
      base44.asServiceRole.entities.Incidents.filter({ id: incidentId }),
      base44.asServiceRole.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: dbFormType }),
      base44.asServiceRole.entities.WorkOrders.filter({ incident_id: incidentId }),
    ]);
    const incident = incidents[0];

    // Find the matching WO for this form type (by label in title)
    const woLabelMap = {
      make_safe: 'Make Safe WO',
      corrective: 'Corrective WO',
      inspection: 'Inspection WO',
    };
    const woLabel = woLabelMap[formType];
    const matchingWO = allWOs.find(w => w.title?.includes(woLabel) && w.status !== 'Cancelled');

    const payload = {
      form_type: dbFormType,
      form_name: dbFormName,
      incident_id: incidentId,
      work_order_id: matchingWO?.id || undefined,
      status: status || 'Draft',
      form_data: formData,
      submitted_at: status === 'Submitted' ? new Date().toISOString() : undefined,
      submitted_by: workerName || 'Field Worker',
    };

    if (incident?.related_asset_id) payload.asset_id = incident.related_asset_id;

    let result;
    const drafts = existingForms.filter(s => s.status === 'Draft');
    if (drafts.length > 0) {
      result = await base44.asServiceRole.entities.FormSubmissions.update(drafts[0].id, payload);
    } else {
      result = await base44.asServiceRole.entities.FormSubmissions.create(payload);
    }



    // Extract file URLs from formData for audit trail
    const fileUrls = [];
    const fileNames = [];
    const fileMetadata = [];
    const user = workerName || 'Field Worker';

    // Collect signature URL
    if (formData.signature_url) {
      fileUrls.push(formData.signature_url);
      fileNames.push(`signature_${formType}.png`);
      fileMetadata.push({
        url: formData.signature_url,
        name: `Signature - ${user}`,
        author: user,
        author_name: user,
        created_at: new Date().toISOString(),
      });
    }
    
    // Collect photo URLs
    if (formData.photo_urls && Array.isArray(formData.photo_urls)) {
      formData.photo_urls.forEach((url, idx) => {
        fileUrls.push(url);
        fileNames.push(`photo_${idx + 1}.jpg`);
        fileMetadata.push({
          url: url,
          name: `Field Photo ${idx + 1}`,
          author: user,
          author_name: user,
          created_at: new Date().toISOString(),
        });
      });
    }

    // Save files to IncidentAttachments
    if (status === 'Submitted' && fileUrls.length > 0) {
      const authUser = await base44.auth.me();
      for (let i = 0; i < fileUrls.length; i++) {
        await base44.asServiceRole.entities.IncidentAttachments.create({
          incident_id: incidentId,
          file_url: fileUrls[i],
          file_name: fileNames[i],
          file_type: fileNames[i].toLowerCase().endsWith('.pdf') ? "Document" : 
                     /\.(jpg|jpeg|png|gif|webp)$/i.test(fileNames[i]) ? "Photo" : "Document",
          uploaded_by: authUser?.email || 'field-worker',
        });
      }
    }

    // Audit trail with attachments
    await base44.asServiceRole.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: status === 'Submitted' ? `Field Worker Form Submitted` : 'Field Worker Form Draft Saved',
      details: `${dbFormName} ${status === 'Submitted' ? 'submitted' : 'saved as draft'} by ${workerName || 'Field Worker'} via mobile form link.`,
      user: workerName || 'Field Worker (via Telegram link)',
      attachments: status === 'Submitted' && fileUrls.length > 0 ? fileUrls : undefined,
      attachment_names: status === 'Submitted' && fileNames.length > 0 ? fileNames : undefined,
      attachment_metadata: status === 'Submitted' && fileMetadata.length > 0 ? fileMetadata : undefined,
    });

    // If submitted, update incident completion flags
    if (status === 'Submitted' && incident) {
      const updates = {};
      if (formType === 'make_safe') updates.make_safe_done = true;
      if (formType === 'inspection') updates.inspection_done = true;
      if (formType === 'corrective') updates.corrective_done = true;
      
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Incidents.update(incident.id, updates);
      }
    }

    return Response.json({ success: true, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});