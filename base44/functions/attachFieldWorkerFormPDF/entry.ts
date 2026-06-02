import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { incidentId, submissionId, pdfUrl, pdfName, token } = await req.json();
    
    if (!incidentId || !pdfUrl) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    // Allow either an authenticated user OR a valid field-worker token
    let submittedBy = 'Field Worker';

    if (token) {
      // Validate the token matches this incident (field worker path - no auth required)
      try {
        const standard = token.replace(/-/g, '+').replace(/_/g, '/');
        const padded = standard + '=='.slice(0, (4 - standard.length % 4) % 4);
        const decoded = atob(padded);
        const lastColon = decoded.lastIndexOf(':');
        const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
        const tokenIncidentId = decoded.substring(0, secondLastColon);
        const timestamp = parseInt(decoded.substring(lastColon + 1));
        const fortyEightHours = 48 * 60 * 60 * 1000;
        if (tokenIncidentId !== incidentId || Date.now() - timestamp > fortyEightHours) {
          return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
        }
      } catch {
        return Response.json({ error: 'Invalid token' }, { status: 400 });
      }
    } else {
      // Must be an authenticated user
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      submittedBy = user.email || user.full_name || 'User';
    }

    // Get submission to find form name
    let formName = 'Field Worker Form';
    if (submissionId) {
      try {
        const submission = await base44.asServiceRole.entities.FormSubmissions.get(submissionId);
        if (submission?.form_name) formName = submission.form_name;
        if (submission?.submitted_by) submittedBy = submission.submitted_by;
      } catch { /* ignore */ }
    }

    const fileName = pdfName || `${formName}.pdf`;

    // Add to IncidentAttachments using service role
    await base44.asServiceRole.entities.IncidentAttachments.create({
      incident_id: incidentId,
      file_url: pdfUrl,
      file_name: fileName,
      file_type: 'Document',
      uploaded_by: submittedBy,
    });

    // Add to Audit Trail
    await base44.asServiceRole.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: 'Field Worker Form PDF Attached',
      details: `Printable PDF version of ${formName} attached`,
      user: submittedBy,
      attachments: [pdfUrl],
      attachment_names: [fileName],
      attachment_metadata: [{
        url: pdfUrl,
        name: fileName,
        author: submittedBy,
        author_name: submittedBy,
        created_at: new Date().toISOString(),
      }],
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});