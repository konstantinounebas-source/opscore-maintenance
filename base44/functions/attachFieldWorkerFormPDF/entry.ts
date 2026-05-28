import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { incidentId, submissionId, pdfUrl, pdfName } = await req.json();
    
    if (!incidentId || !pdfUrl) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    // Get submission to determine form type
    const submission = await base44.entities.FormSubmissions.get(submissionId);
    const submittedBy = submission?.submitted_by || 'Field Worker';

    // Add to IncidentAttachments
    await base44.entities.IncidentAttachments.create({
      incident_id: incidentId,
      file_url: pdfUrl,
      file_name: pdfName || 'Field Worker Form.pdf',
      file_type: 'Document',
      uploaded_by: submittedBy,
    });

    // Add to Audit Trail
    await base44.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: 'Field Worker Form PDF Attached',
      details: `Printable PDF version of ${submission?.form_name || 'field worker form'} attached`,
      user: submittedBy,
      attachments: [pdfUrl],
      attachment_names: [pdfName || 'Field Worker Form.pdf'],
      attachment_metadata: [{
        url: pdfUrl,
        name: pdfName || 'Field Worker Form.pdf',
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