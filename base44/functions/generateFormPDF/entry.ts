import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { submissionId } = await req.json();

    if (!submissionId) {
      return Response.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // Fetch submission
    const submissions = await base44.entities.FormSubmissions.filter({ id: submissionId });
    if (!submissions.length) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }
    const sub = submissions[0];

    // Optionally fetch related incident and asset
    let incident = null;
    let asset = null;
    if (sub.incident_id) {
      const incidents = await base44.entities.Incidents.filter({ id: sub.incident_id });
      if (incidents.length) incident = incidents[0];
    }
    if (sub.asset_id) {
      const assets = await base44.entities.Assets.filter({ id: sub.asset_id });
      if (assets.length) asset = assets[0];
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    const addLine = (label, value, indent = 20) => {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(String(label), indent, y);
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(String(value ?? '—'), pageWidth - indent - 70);
      doc.text(wrapped, indent + 65, y);
      y += wrapped.length > 1 ? wrapped.length * 5 + 2 : 7;
    };

    const addSection = (title) => {
      if (y > pageHeight - 30) { doc.addPage(); y = 20; }
      y += 4;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 80, 160);
      doc.text(title, 20, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      y += 7;
    };

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(sub.form_name || 'Form Submission', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
    doc.text(`Status: ${sub.status || 'Draft'}`, pageWidth - 60, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Divider
    doc.setDrawColor(180, 180, 200);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;

    doc.setFontSize(10);

    // Submission info
    addSection('Submission Details');
    addLine('Form Type:', sub.form_type || '—');
    addLine('Submitted By:', sub.created_by || '—');
    addLine('Created Date:', sub.created_date ? new Date(sub.created_date).toLocaleString() : '—');

    // Incident info
    if (incident) {
      addSection('Incident Information');
      addLine('Incident ID:', incident.incident_id);
      addLine('Title:', incident.title);
      addLine('Status:', incident.status);
      addLine('Priority:', incident.priority);
      addLine('Asset:', incident.related_asset_name || '—');
      addLine('Location:', incident.location_address || '—');
      addLine('City:', incident.province || '—');
      addLine('Municipality:', incident.municipality || '—');
      addLine('Reported Date:', incident.reported_date || '—');
      if (incident.description) addLine('Description:', incident.description);
    }

    // Asset info
    if (asset) {
      addSection('Asset Information');
      addLine('Asset ID:', asset.asset_id);
      addLine('Category:', asset.category || '—');
      addLine('Shelter Type:', asset.shelter_type || '—');
      addLine('Location:', asset.location_address || '—');
      addLine('City:', asset.city || '—');
    }

    // Form data (flatten form_data JSON)
    if (sub.form_data && typeof sub.form_data === 'object') {
      addSection('Form Data');
      const flatten = (obj, prefix = '') => {
        Object.entries(obj).forEach(([k, v]) => {
          const key = prefix ? `${prefix}.${k}` : k;
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            flatten(v, key);
          } else {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ':';
            const val = Array.isArray(v) ? v.join(', ') : v;
            addLine(label, val);
          }
        });
      };
      flatten(sub.form_data);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.text(
        `Page ${p} of ${totalPages} — ${sub.form_name || 'Form Submission'}`,
        20,
        pageHeight - 8
      );
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(sub.form_name || 'form').replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});