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

    // Fetch submission by ID
    const sub = await base44.entities.FormSubmissions.get(submissionId);
    if (!sub) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Fetch related incident and asset
    let incident = null;
    let asset = null;
    if (sub.incident_id) {
      try { incident = await base44.entities.Incidents.get(sub.incident_id); } catch {}
    }
    if (sub.asset_id) {
      try { asset = await base44.entities.Assets.get(sub.asset_id); } catch {}
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    const checkPage = () => {
      if (y > pageHeight - 25) { doc.addPage(); y = 20; }
    };

    const addLine = (label, value) => {
      checkPage();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(String(label), 20, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const wrapped = doc.splitTextToSize(String(value ?? '—'), pageWidth - 90);
      doc.text(wrapped, 85, y);
      y += Math.max(wrapped.length * 6, 7);
    };

    const addSection = (title) => {
      checkPage();
      y += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 70, 160);
      doc.text(title, 20, y);
      y += 2;
      doc.setDrawColor(40, 70, 160);
      doc.setLineWidth(0.3);
      doc.line(20, y, pageWidth - 20, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      y += 6;
    };

    // ── Header ──
    doc.setFillColor(40, 70, 160);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(sub.form_name || 'Form Submission', 20, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${sub.status || 'Draft'}   |   Generated: ${new Date().toLocaleString()}`, 20, 24);
    doc.setTextColor(0, 0, 0);
    y = 38;

    // ── Submission Details ──
    addSection('Submission Details');
    addLine('Form Type:', sub.form_type || '—');
    addLine('Form Name:', sub.form_name || '—');
    addLine('Status:', sub.status || '—');
    addLine('Submitted By:', sub.submitted_by || sub.created_by || '—');
    addLine('Created Date:', sub.created_date ? new Date(sub.created_date).toLocaleString() : '—');
    if (sub.submitted_at) addLine('Submitted At:', new Date(sub.submitted_at).toLocaleString());

    // ── Incident Information ──
    if (incident) {
      addSection('Incident Information');
      addLine('Incident ID:', incident.incident_id);
      addLine('Title:', incident.title);
      addLine('Status:', incident.status);
      addLine('Priority:', incident.priority);
      addLine('Asset:', incident.related_asset_name || '—');
      addLine('Location:', incident.location_address || '—');
      addLine('City:', incident.province || incident.city || '—');
      addLine('Municipality:', incident.municipality || '—');
      addLine('Shelter Type:', incident.shelter_type || '—');
      addLine('Reported Date:', incident.reported_date || '—');
      addLine('OWR:', incident.out_of_warranty || '—');
      if (incident.description) addLine('Description:', incident.description);
    }

    // ── Asset Information ──
    if (asset) {
      addSection('Asset Information');
      addLine('Asset ID:', asset.asset_id);
      addLine('Category:', asset.category || '—');
      addLine('Shelter Type:', asset.shelter_type || '—');
      addLine('Location:', asset.location_address || '—');
      addLine('City:', asset.city || '—');
      addLine('Municipality:', asset.municipality || '—');
      addLine('Status:', asset.status || '—');
    }

    // ── Form-Level Fields ──
    const topLevelFields = [
      ['Εκτός Εγγύησης (OWR):', sub.ektos_eggyhshs],
      ['Απαιτείται Έγκριση CA:', sub.apaiteitai_eggkrisi_ca],
      ['Outline Plan:', sub.outline_plan],
      ['Total Cost (EUR):', sub.total_cost != null ? `€${sub.total_cost}` : null],
      ['Προθεσμία Επιβεβαίωσης Λήψης:', sub.proxthesmia_epivevaioshs_lhpsis],
      ['Προθεσμία FMPI:', sub.proxthesmia_fmpi],
      ['Αναμενόμενη Προθεσμία Επισκευής:', sub.anammenomeni_proxthesmia_episkeuhs],
      ['FMP Outline Date:', sub.fmp_outline_date],
    ].filter(([, v]) => v != null && v !== '');

    if (topLevelFields.length > 0) {
      addSection('Form Fields');
      topLevelFields.forEach(([label, value]) => addLine(label, value));
    }

    // ── Form Data (blob) ──
    if (sub.form_data && typeof sub.form_data === 'object') {
      const formDataEntries = [];
      const flatten = (obj, prefix = '') => {
        Object.entries(obj).forEach(([k, v]) => {
          const key = prefix ? `${prefix} › ${k}` : k;
          if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
            flatten(v, key);
          } else if (v !== null && v !== undefined && v !== '') {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ':';
            const val = Array.isArray(v) ? v.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join(', ') : v;
            formDataEntries.push([label, val]);
          }
        });
      };
      flatten(sub.form_data);
      if (formDataEntries.length > 0) {
        addSection('Additional Form Data');
        formDataEntries.forEach(([label, val]) => addLine(label, val));
      }
    }

    // ── Footer on all pages ──
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - 30, pageHeight - 8);
      doc.text(`${sub.form_name || 'Form Submission'}`, 20, pageHeight - 8);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(sub.form_name || 'form').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}.pdf"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});