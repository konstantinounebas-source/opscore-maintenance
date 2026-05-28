import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { incidentId } = await req.json();
    if (!incidentId) return Response.json({ error: 'Missing incidentId' }, { status: 400 });

    const incidentList = await base44.asServiceRole.entities.Incidents.filter({ id: incidentId });
    const incident = incidentList[0];
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    let asset = null;
    if (incident.related_asset_id) {
      const results = await base44.asServiceRole.entities.Assets.filter({ id: incident.related_asset_id });
      asset = results[0] || null;
    }

    // Fetch the CR+OMPI form submission
    const submissions = await base44.asServiceRole.entities.FormSubmissions.filter({
      incident_id: incidentId,
      form_type: "cr_ompi"
    });
    const sub = submissions[0] || null;

    const fd = sub?.form_data || {};
    const submittedAt = incident.cr_ompi_submitted_at
      ? new Date(incident.cr_ompi_submitted_at).toLocaleString('el-GR')
      : '—';
    const submittedBy = sub?.submitted_by || '—';

    // Subsystems
    const subsystems = [];
    if (incident.subsystem_structural_selected) subsystems.push(`Δομικό/Σκελετός${incident.subsystem_structural_issue ? ` — ${incident.subsystem_structural_issue}` : ''}`);
    if (incident.subsystem_electrical_selected) subsystems.push(`Ηλεκτρολογικό${incident.subsystem_electrical_issue ? ` — ${incident.subsystem_electrical_issue}` : ''}`);
    if (incident.subsystem_electronic_selected) subsystems.push(`Ηλεκτρονικό${incident.subsystem_electronic_issue ? ` — ${incident.subsystem_electronic_issue}` : ''}`);
    if (incident.subsystem_other_selected) subsystems.push(`Άλλο${incident.subsystem_other_issue ? ` — ${incident.subsystem_other_issue}` : ''}`);
    const subsystemText = subsystems.length ? subsystems.join('<br>') : '—';

    const priority = fd.operational_priority || incident.operational_priority || incident.initial_priority || '—';
    const priorityLabel = priority === 'P1' ? 'P1 – Χαμηλή (Low · 48h)' : priority === 'P2' ? 'P2 – Υψηλή / Επείγον (High · 24h)' : priority;
    const warranty = fd.warranty_status || incident.warranty_status || (incident.is_owr ? 'OWR' : 'In Warranty');
    const makeSafe = fd.make_safe_required !== undefined ? fd.make_safe_required : incident.make_safe_required;
    const inspection = fd.inspection_required !== undefined ? fd.inspection_required : incident.inspection_required;
    const ompiNotes = fd.ompi_notes || incident.description || '';

    function e(s) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(s ?? '').replace(/[&<>"']/g, m => map[m]);
    }

    function row(label, value) {
      return `<tr>
        <td class="label">${label}</td>
        <td class="value">${value}</td>
      </tr>`;
    }

    const html = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>CR+OMPI — ${e(incident.incident_id)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.45; color: #1a1a2e; background: #fff; }
  .page { width: 180mm; margin: 0 auto; padding: 14mm 0 16mm 0; }

  /* Header */
  .doc-header { background: #1e3a8a; color: white; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; page-break-inside: avoid; }
  .doc-header .logo-line { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .doc-header h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
  .doc-header .sub { font-size: 9px; opacity: 0.85; margin-top: 2px; }
  .doc-header .badge { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 4px; padding: 2px 8px; font-size: 9px; font-weight: 600; white-space: nowrap; }

  /* Meta strip */
  .meta-strip { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .meta-chip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 8px; font-size: 9px; color: #475569; }
  .meta-chip strong { color: #1e293b; }

  /* Sections */
  .section { margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
  .section-header { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 6px 12px; display: flex; align-items: center; gap: 6px; }
  .section-header .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .section-header h2 { font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
  .section-body { padding: 10px 12px; }

  /* Table */
  table.fields { width: 100%; border-collapse: collapse; }
  table.fields td { padding: 4px 8px; vertical-align: top; font-size: 10px; }
  table.fields tr:nth-child(even) td { background: #f8fafc; }
  table.fields td.label { font-weight: 600; color: #64748b; width: 38%; }
  table.fields td.value { color: #1e293b; word-break: break-word; }

  /* Badges */
  .badge-p1 { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 7px; font-weight: 700; font-size: 9px; display: inline-block; }
  .badge-p2 { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 4px; padding: 1px 7px; font-weight: 700; font-size: 9px; display: inline-block; }
  .badge-iw { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 4px; padding: 1px 7px; font-weight: 700; font-size: 9px; display: inline-block; }
  .badge-owr { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; padding: 1px 7px; font-weight: 700; font-size: 9px; display: inline-block; }
  .badge-yes { background: #fee2e2; color: #b91c1c; border-radius: 4px; padding: 1px 7px; font-weight: 700; font-size: 9px; display: inline-block; }
  .badge-no { background: #f0fdf4; color: #166534; border-radius: 4px; padding: 1px 7px; font-weight: 700; font-size: 9px; display: inline-block; }

  /* Guidance */
  .guidance { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 5px; padding: 9px 12px; color: #1e40af; font-size: 10px; line-height: 1.55; }
  .guidance .glabel { font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; margin-bottom: 4px; color: #1d4ed8; }

  /* OMPI Steps */
  .ompi-steps { margin: 0; padding-left: 16px; line-height: 1.75; font-size: 10px; }
  .ompi-steps li { margin-bottom: 3px; }

  /* Notes block */
  .notes-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; font-size: 10px; color: #334155; white-space: pre-wrap; min-height: 28px; }

  /* Footer */
  .doc-footer { border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }

  /* Dot colors */
  .dot-blue { background: #3b82f6; }
  .dot-indigo { background: #6366f1; }
  .dot-amber { background: #f59e0b; }
  .dot-green { background: #10b981; }
  .dot-slate { background: #64748b; }

  @media print {
    html, body { margin: 0 !important; padding: 0 !important; }
    .page { width: 100%; padding: 0; }
    @page { size: A4 portrait; margin: 14mm 15mm 16mm 15mm; }
    .section { page-break-inside: avoid; }
    .doc-header { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .guidance { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="doc-header">
    <div class="logo-line">
      <div>
        <h1>Confirmation of Receipt + OMPI</h1>
        <div class="sub">Επιβεβαίωση Παραλαβής &amp; Σχέδιο Διαχείρισης Περιστατικού</div>
      </div>
      <div class="badge">CR + OMPI</div>
    </div>
    <div class="sub">Submitted: ${e(submittedAt)} &nbsp;|&nbsp; By: ${e(submittedBy)} &nbsp;|&nbsp; Incident: ${e(incident.incident_id)}</div>
  </div>

  <!-- Meta chips -->
  <div class="meta-strip">
    <div class="meta-chip"><strong>Incident:</strong> ${e(incident.incident_id)}</div>
    <div class="meta-chip"><strong>Asset:</strong> ${e(incident.related_asset_name || asset?.asset_id || '—')}</div>
    <div class="meta-chip"><strong>Date:</strong> ${e(incident.issue_date || incident.reported_date || '—')}</div>
    <div class="meta-chip"><strong>Reporter:</strong> ${e(incident.reported_by_name || '—')}</div>
  </div>

  <!-- Section 1: Incident Details -->
  <div class="section">
    <div class="section-header">
      <span class="dot dot-blue"></span>
      <h2>1. Στοιχεία Περιστατικού (Incident Details)</h2>
    </div>
    <div class="section-body">
      <table class="fields">
        ${row('Αριθμός Περιστατικού', e(incident.incident_id))}
        ${row('Ημερομηνία Αναφοράς', e(incident.issue_date || incident.reported_date || '—'))}
        ${row('Asset / Στάση', e(incident.related_asset_name || asset?.asset_id || '—'))}
        ${row('Τύπος Στεγάστρου', e(asset?.shelter_type || incident.shelter_type || '—'))}
        ${row('Επαρχία / Πόλη', e(asset?.city || incident.province || '—'))}
        ${row('Δήμος', e(asset?.municipality || incident.municipality || '—'))}
        ${row('Διεύθυνση', e(incident.location_address || asset?.location_address || '—'))}
        ${row('Επηρεαζόμενα Υποσυστήματα', subsystemText)}
        ${incident.damage_description ? row('Περιγραφή Βλάβης', e(incident.damage_description)) : ''}
        ${incident.probable_cause ? row('Πιθανή Αιτία', e(incident.probable_cause) + (incident.probable_cause_other ? ` — ${e(incident.probable_cause_other)}` : '')) : ''}
      </table>
    </div>
  </div>

  <!-- Section 2: Confirmation of Receipt -->
  <div class="section">
    <div class="section-header">
      <span class="dot dot-indigo"></span>
      <h2>2. Επιβεβαίωση Παραλαβής (Confirmation of Receipt – CR)</h2>
    </div>
    <div class="section-body">
      <div class="guidance" style="margin-bottom:12px;">
        <div class="glabel">Επιβεβαίωση Παραλαβής</div>
        <p>Αγαπητοί/ες,</p>
        <p>Επιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): <strong>${e(incident.incident_id)}</strong>.</p>
        <p>Το περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης. Παρακαλώ όπως βρείτε επισυναπτόμενο το Outline Management Plan.</p>
        <p>Παραμένουμε στην διάθεσή σας.</p>
      </div>
      <table class="fields">
        ${row('Λειτουργική Προτεραιότητα', `<span class="${priority === 'P2' ? 'badge-p2' : 'badge-p1'}">${e(priorityLabel)}</span>`)}
      </table>
    </div>
  </div>

  <!-- Section 3: OMPI -->
  <div class="section">
    <div class="section-header">
      <span class="dot dot-amber"></span>
      <h2>3. OMPI – Σχέδιο Διαχείρισης Περιστατικού</h2>
    </div>
    <div class="section-body">
      <div class="guidance" style="margin-bottom:12px;">
        <div class="glabel">Σχέδιο Διαχείρισης Περιστατικού (OMPI)</div>
        <ol class="ompi-steps">
          <li>Καταχώρηση περιστατικού στο Help Desk και έκδοση κωδικού αναφοράς (Incident No.).</li>
          <li>Επιβεβαίωση λήψης περιστατικού και αποστολή σχετικής ενημέρωσης προς την ΑΑ (CA).</li>
          <li>Άμεση τεχνική διερεύνηση και εκτίμηση απαιτούμενων εργασιών.</li>
          <li>Εφόσον απαιτείται, επίσκεψη στον χώρο για περαιτέρω διερεύνηση και τεκμηρίωση.</li>
          <li>Επισκευή / επιδιόρθωση των προβλημάτων εντός των χρονικών ορίων του SLA.</li>
          <li>Αποστολή τελικής φόρμας αναφοράς με φωτογραφίες μετά την επισκευή / επιδιόρθωση.</li>
        </ol>
      </div>
      <table class="fields">
        ${row('Κατάσταση Εγγύησης', `<span class="${warranty === 'OWR' ? 'badge-owr' : 'badge-iw'}">${warranty === 'OWR' ? 'Εκτός Εγγύησης (OWR)' : 'Εντός Εγγύησης (In Warranty)'}</span>`)}
        ${row('Make Safe Απαιτείται', `<span class="${makeSafe ? 'badge-yes' : 'badge-no'}">${makeSafe ? 'Ναι – Απαιτείται' : 'Όχι – Δεν Απαιτείται'}</span>`)}
        ${row('Επιθεώρηση Απαιτείται', `<span class="${inspection ? 'badge-yes' : 'badge-no'}">${inspection ? 'Ναι – Απαιτείται' : 'Όχι – Δεν Απαιτείται'}</span>`)}
        ${row('Απαιτείται Έγκριση CA', `<span class="${warranty === 'OWR' ? 'badge-yes' : 'badge-no'}">${warranty === 'OWR' ? 'Ναι (OWR)' : 'Όχι'}</span>`)}
      </table>
    </div>
  </div>

  ${ompiNotes ? `
  <!-- Section 4: Notes -->
  <div class="section">
    <div class="section-header">
      <span class="dot dot-slate"></span>
      <h2>4. Αρχικές Παρατηρήσεις / Outline Plan Notes</h2>
    </div>
    <div class="section-body">
      <div class="notes-block">${e(ompiNotes)}</div>
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="doc-footer">
    <span>CR+OMPI — Incident ${e(incident.incident_id)}</span>
    <span>Generated: ${new Date().toLocaleString('el-GR')}</span>
  </div>

</div><!-- /page -->
</body>
</html>`;

    const fileName = `CR_OMPI_${incident.incident_id}_${Date.now()}.pdf`;
    return Response.json({ success: true, html, fileName });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});