import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const submissions = await base44.asServiceRole.entities.FormSubmissions.list();
  const existing = await base44.asServiceRole.entities.IncidentAttachments.list();

  // Build a set of existing (incident_id + file_url) to avoid duplicates
  const existingSet = new Set(existing.map(a => `${a.incident_id}||${a.file_url}`));

  let created = 0;
  let skipped = 0;

  for (const sub of submissions) {
    const incId = sub.incident_id;
    if (!incId || !sub.form_data) continue;

    const fd = sub.form_data;

    // Collect all file objects from known photo/attachment fields
    const photoFields = ['photos_before', 'photos_after'];
    const sigFields = ['sig_tech_upload', 'sig_hd_upload', 'sig_upload'];
    const attachmentFields = ['attachments'];

    const toSync = [];

    for (const field of photoFields) {
      const arr = fd[field];
      if (Array.isArray(arr)) {
        arr.forEach(f => { if (f?.url) toSync.push({ ...f, file_type: 'Photo' }); });
      }
    }

    for (const field of sigFields) {
      const f = fd[field];
      if (f?.url) toSync.push({ ...f, file_type: 'Document' });
    }

    for (const field of attachmentFields) {
      const arr = fd[field];
      if (Array.isArray(arr)) {
        arr.forEach(f => {
          if (f?.url) {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || '');
            toSync.push({ ...f, file_type: isImage ? 'Photo' : 'Document' });
          }
        });
      }
    }

    for (const f of toSync) {
      const key = `${incId}||${f.url}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      await base44.asServiceRole.entities.IncidentAttachments.create({
        incident_id: incId,
        file_url: f.url,
        file_name: f.name || f.url.split('/').pop() || 'file',
        file_type: f.file_type,
        uploaded_by: null,
      });
      existingSet.add(key);
      created++;
    }
  }

  return Response.json({ success: true, created, skipped, total_submissions: submissions.length });
});