import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { submissionId } = await req.json();
    if (!submissionId) return Response.json({ error: 'Missing submissionId' }, { status: 400 });

    const sub = await base44.entities.FormSubmissions.get(submissionId);
    if (!sub) return Response.json({ error: `Submission ${submissionId} not found` }, { status: 404 });

    let incident = null;
    let asset = null;
    if (sub.incident_id) {
      try { incident = await base44.entities.Incidents.get(sub.incident_id); } catch (_) {}
    }
    if (sub.asset_id) {
      try { asset = await base44.entities.Assets.get(sub.asset_id); } catch (_) {}
    }

    const fmtDate = (d) => {
      if (!d) return '—';
      try {
        const dt = new Date(d);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch { return String(d); }
    };

    const fmtNum = (n) => {
      const v = parseFloat(n);
      return isNaN(v) ? '—' : v.toFixed(2);
    };

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));

    const fd = sub.form_data || {};
    const rows = fd.rows || [];

    // OWR / CA display
    const owrRaw = sub.ektos_eggyhshs;
    const caRaw = sub.apaiteitai_eggkrisi_ca;
    const owrDisplay = owrRaw === 'Yes' ? 'ΝΑΙ — Εκτός Εγγύησης' : owrRaw === 'No' ? 'ΟΧΙ — Εντός Εγγύησης' : (owrRaw || '—');
    const caDisplay  = caRaw  === 'Yes' ? 'ΝΑΙ — Απαιτείται Έγκριση' : caRaw === 'No' ? 'ΟΧΙ' : (caRaw || '—');

    const owrBg = owrRaw === 'Yes' ? '#fef3c7' : '#dcfce7';
    const owrColor = owrRaw === 'Yes' ? '#78350f' : '#14532d';
    const owrBorder = owrRaw === 'Yes' ? '#f59e0b' : '#22c55e';
    const caBg = caRaw === 'Yes' ? '#fee2e2' : '#dcfce7';
    const caColor = caRaw === 'Yes' ? '#7f1d1d' : '#14532d';
    const caBorder = caRaw === 'Yes' ? '#ef4444' : '#22c55e';

    // Build subsystem strings
    const subsystemParts = [];
    if (incident?.subsystem_structural_selected) subsystemParts.push('Structural');
    if (incident?.subsystem_electrical_selected) subsystemParts.push('Electrical');
    if (incident?.subsystem_electronic_selected) subsystemParts.push('Electronic');
    if (incident?.subsystem_other_selected) subsystemParts.push('Other');
    const subsystem = subsystemParts.join(', ') || '—';

    const subcatParts = [
      incident?.subsystem_structural_issue,
      incident?.subsystem_electrical_issue,
      incident?.subsystem_electronic_issue,
      incident?.subsystem_other_issue,
    ].filter(Boolean);
    const subcategory = subcatParts.join(', ') || '—';

    // Work items rows
    let totalCost = 0;
    const rowsHtml = rows.map((row, i) => {
      const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
      totalCost += amount;
      const code = row.catalog_code ? `[${row.catalog_code}] ` : '';
      const name = row.catalog_name ? `${code}${row.catalog_name}` : (row.catalog_id || `Item ${i + 1}`);
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `<tr style="background:${bg};page-break-inside:avoid">
        <td style="padding:5px 8px;border:1px solid #cbd5e1;font-size:8.5pt;word-break:break-word">${esc(name)}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:8.5pt">${esc(String(row.qty ?? ''))}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;font-size:8.5pt">${fmtNum(row.unit_price)}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:right;font-weight:700;color:#1e3a8a;font-size:8.5pt">${fmtNum(amount)}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:center;font-size:10pt;color:#16a34a">${row.confirmed ? '✓' : ''}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;font-size:8pt;color:#475569;word-break:break-word">${esc(row.comments || '')}</td>
      </tr>`;
    }).join('');

    const commentsBlock = fd.comments ? `
      <div class="section-block">
        <div class="section-title">Σχόλια / Παρατηρήσεις</div>
        <div class="section-body">
          <p style="font-size:9.5pt;line-height:1.5;white-space:pre-wrap;color:#1e293b">${esc(fd.comments)}</p>
        </div>
      </div>` : '';

    const sigImgHtml = fd.sig_upload?.url
      ? `<img src="${esc(fd.sig_upload.url)}" style="max-height:56px;max-width:160px;object-fit:contain;border:1px solid #e2e8f0;padding:3px;border-radius:3px;display:block" crossorigin="anonymous"/>`
      : `<div style="border-bottom:1.5px solid #94a3b8;min-height:56px;"></div>`;

    const html = `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(sub.form_name || 'FMPI & Pricing Order')}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #1e293b;
      background: #fff;
    }
    .page-wrap { width: 180mm; margin: 0 auto; padding: 14mm 0 18mm 0; }
    .doc-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px;
    }
    .doc-title { font-size: 15pt; font-weight: 800; color: #1e3a8a; margin: 0; }
    .doc-subtitle { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 8pt; color: #475569; line-height: 1.6; white-space: nowrap; }
    .status-pill {
      display: inline-block; padding: 2px 8px; border-radius: 12px;
      font-size: 7.5pt; font-weight: 700;
      background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;
    }
    .section-block { margin-bottom: 9px; page-break-inside: avoid; }
    .section-title {
      background: #1e3a8a; color: #fff; padding: 5px 10px;
      font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
      border-radius: 3px 3px 0 0;
    }
    .section-body {
      border: 1px solid #cbd5e1; border-top: none;
      border-radius: 0 0 3px 3px; padding: 9px 11px; background: #fff;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 14px; }
    .span-2 { grid-column: span 2; }
    .field-label {
      font-size: 7pt; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;
    }
    .field-value {
      font-size: 9.5pt; font-weight: 500; color: #0f172a;
      border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; min-height: 16px;
    }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 7.5pt; font-weight: 700; border: 1px solid;
    }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; table-layout: fixed; }
    th {
      background: #1e3a8a; color: #fff; border: 1px solid #1e3a8a;
      padding: 5px 7px; text-align: left; font-weight: 700; font-size: 7.5pt;
      text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
    }
    td { border: 1px solid #cbd5e1; padding: 5px 7px; vertical-align: middle; }
    .total-row td {
      background: #1e3a8a; color: #fff; font-weight: 700; font-size: 10pt;
      border: 1px solid #1e3a8a; padding: 7px 9px;
    }
    .sig-label {
      font-size: 7pt; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px;
    }
    .sig-line {
      border-bottom: 1.5px solid #334155; min-height: 20px; padding-top: 3px;
      font-size: 9.5pt; font-weight: 500; color: #0f172a;
    }
    .ca-box {
      border: 1px dashed #94a3b8; min-height: 60px; border-radius: 3px; background: #f8fafc;
    }
    .doc-footer {
      border-top: 1px solid #e2e8f0; margin-top: 12px; padding-top: 5px;
      font-size: 7pt; color: #94a3b8; display: flex; justify-content: space-between;
    }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; }
      .page-wrap { width: 100%; padding: 0; }
      @page { size: A4 portrait; margin: 14mm 15mm 16mm 15mm; }
      .section-block { page-break-inside: avoid; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page-wrap">

  <div class="doc-header">
    <div>
      <div class="doc-title">FMPI &amp; Pricing Order</div>
      <div class="doc-subtitle">Full Management Plan &amp; Invoice Submission</div>
    </div>
    <div class="doc-meta">
      <span class="status-pill">${esc(sub.status || '')}</span><br/>
      Submitted: ${fmtDate(sub.submitted_at)}<br/>
      By: ${esc(sub.submitted_by || '—')}
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">1. Γενικά Στοιχεία / Incident</div>
    <div class="section-body">
      <div class="grid-2">
        <div><div class="field-label">Αριθμός Περιστατικού</div><div class="field-value">${esc(incident?.incident_id || '—')}</div></div>
        <div><div class="field-label">Ημερομηνία Αναφοράς από Α.Α.</div><div class="field-value">${fmtDate(incident?.reported_date || incident?.first_report_date)}</div></div>
        <div><div class="field-label">Ημερομηνία Outline Management Plan</div><div class="field-value">${fmtDate(sub.fmp_outline_date)}</div></div>
        <div><div class="field-label">Ημερομηνία Υποβολής FMPI</div><div class="field-value">${fmtDate(sub.submitted_at)}</div></div>
        <div><div class="field-label">Υποβλήθηκε από</div><div class="field-value">${esc(sub.submitted_by || '—')}</div></div>
        <div><div class="field-label">Κωδικός Στάσης</div><div class="field-value">${esc(asset?.active_shelter_id || asset?.asset_id || '—')}</div></div>
        <div><div class="field-label">Τύπος Στεγάστρου</div><div class="field-value">${esc(fd.shelter_type || asset?.installed_shelter_type || asset?.ordered_shelter_type || asset?.shelter_type || '—')}</div></div>
        <div><div class="field-label">Επαρχία</div><div class="field-value">${esc(asset?.city || '—')}</div></div>
        <div><div class="field-label">Δήμος</div><div class="field-value">${esc(asset?.municipality || '—')}</div></div>
        <div class="span-2"><div class="field-label">Διεύθυνση</div><div class="field-value">${esc(asset?.location_address || '—')}</div></div>
        <div><div class="field-label">Επηρεαζόμενο Υποσύστημα</div><div class="field-value">${esc(subsystem)}</div></div>
        <div><div class="field-label">Υποκατηγορία</div><div class="field-value">${esc(subcategory)}</div></div>
        <div><div class="field-label">Προέλευση Αναφοράς</div><div class="field-value">${esc(incident?.incident_source || '—')}</div></div>
        <div><div class="field-label">Αναφέρθηκε από</div><div class="field-value">${esc(incident?.reported_by_name || '—')}</div></div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">2. Λογική Απόφασης / Decision Logic</div>
    <div class="section-body">
      <div class="grid-2">
        <div>
          <div class="field-label">Εκτός Εγγύησης (OWR)</div>
          <div style="margin-top:4px"><span class="badge" style="background:${owrBg};color:${owrColor};border-color:${owrBorder}">${esc(owrDisplay)}</span></div>
        </div>
        <div>
          <div class="field-label">Απαιτείται Έγκριση CA</div>
          <div style="margin-top:4px"><span class="badge" style="background:${caBg};color:${caColor};border-color:${caBorder}">${esc(caDisplay)}</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-block">
    <div class="section-title">3. Περιγραφή Εργασιών βάσει Συμβολαίου (Work Items)</div>
    <div class="section-body" style="padding:8px 10px">
      <table>
        <colgroup>
          <col style="width:35%"/>
          <col style="width:9%"/>
          <col style="width:14%"/>
          <col style="width:14%"/>
          <col style="width:8%"/>
          <col style="width:20%"/>
        </colgroup>
        <thead>
          <tr>
            <th>Περιγραφή / Child</th>
            <th style="text-align:center">Ποσ/τα</th>
            <th style="text-align:right">Τιμή Μον. (€)</th>
            <th style="text-align:right">Ποσό (€)</th>
            <th style="text-align:center">✓</th>
            <th>Σχόλια</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0
            ? `<tr><td colspan="6" style="text-align:center;color:#94a3b8;font-style:italic;padding:10px">Δεν υπάρχουν εγγραφές</td></tr>`
            : rowsHtml}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3" style="text-align:right;letter-spacing:0.04em">ΚΟΣΤΟΣ ΕΡΓΑΣΙΩΝ — ΣΥΝΟΛΟ:</td>
            <td style="text-align:right">€ ${totalCost.toFixed(2)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  ${commentsBlock}

  <div class="section-block">
    <div class="section-title">Παραλαβή / Υπογραφή — Εκπρόσωπος Αναθέτουσας Αρχής</div>
    <div class="section-body">
      <div class="grid-2" style="gap:12px 24px;margin-bottom:12px">
        <div><div class="sig-label">Ονοματεπώνυμο</div><div class="sig-line">${esc(fd.sig_name || '')}</div></div>
        <div><div class="sig-label">Υπηρεσία / Θέση</div><div class="sig-line">${esc(fd.sig_service || '')}</div></div>
        <div><div class="sig-label">Ημερομηνία Παραλαβής</div><div class="sig-line">${fd.sig_date ? fmtDate(fd.sig_date) : ''}</div></div>
        <div><div class="sig-label">Υπογραφή Εκπροσώπου</div><div style="margin-top:3px">${sigImgHtml}</div></div>
      </div>
      <div style="border-top:1.5px dashed #cbd5e1;margin-top:10px;padding-top:10px">
        <div style="font-size:7.5pt;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">
          Απόφαση CA — Contracting Authority
        </div>
        <div class="grid-3" style="gap:10px">
          <div><div class="sig-label">Απόφαση (Approved / Rejected)</div><div class="ca-box"></div></div>
          <div><div class="sig-label">Ονοματεπώνυμο CA</div><div class="ca-box"></div></div>
          <div><div class="sig-label">Υπογραφή CA</div><div class="ca-box"></div></div>
        </div>
      </div>
    </div>
  </div>

  <div class="doc-footer">
    <span>FMPI &amp; Pricing Order — Confidential</span>
    <span>Εκτύπωση: ${fmtDate(new Date().toISOString())}</span>
  </div>

</div>
</body>
</html>`;

    const fileName = `FMPI_${(sub.form_name || 'form').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_${submissionId}.pdf`;
    return Response.json({ success: true, html, fileName });

  } catch (error) {
    console.error('[generateFormPDF] Error:', error.message);
    return Response.json({ error: `PDF generation failed: ${error.message}` }, { status: 500 });
  }
});