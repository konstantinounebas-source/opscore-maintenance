import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import html2pdf from 'npm:html2pdf.js@0.10.1';

Deno.serve(async (req) => {
  try {
    console.log("[generateFormPDF] Received request");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error("[generateFormPDF] User not authenticated");
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[generateFormPDF] User authenticated:", user.email);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (err) {
      console.error("[generateFormPDF] Failed to parse JSON:", err.message);
      return Response.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { submissionId } = requestBody;

    if (!submissionId) {
      console.error("[generateFormPDF] Missing submissionId");
      return Response.json({ error: 'Missing submissionId parameter' }, { status: 400 });
    }

    console.log("[generateFormPDF] Fetching submission:", submissionId);

    let sub;
    try {
      sub = await base44.entities.FormSubmissions.get(submissionId);
    } catch (err) {
      console.error("[generateFormPDF] Error fetching submission:", err.message);
      return Response.json({ error: `Failed to fetch submission: ${err.message}` }, { status: 500 });
    }

    if (!sub) {
      console.error("[generateFormPDF] Submission not found:", submissionId);
      return Response.json({ error: `Submission ${submissionId} not found` }, { status: 404 });
    }

    console.log("[generateFormPDF] Submission found, form_type:", sub.form_type);

    let incident = null;
    let asset = null;
    if (sub.incident_id) {
      try {
        incident = await base44.entities.Incidents.get(sub.incident_id);
      } catch (err) {
        console.warn("[generateFormPDF] Could not fetch incident:", err.message);
      }
    }
    if (sub.asset_id) {
      try {
        asset = await base44.entities.Assets.get(sub.asset_id);
      } catch (err) {
        console.warn("[generateFormPDF] Could not fetch asset:", err.message);
      }
    }

    // Build HTML content with proper Unicode support
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 20px; }
          .header { background: #284fa0; color: white; padding: 15px 20px; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0 0 0; font-size: 11px; }
          .section { margin: 15px 0; }
          .section h2 { border-bottom: 2px solid #284fa0; color: #284fa0; font-size: 13px; margin: 0 0 10px 0; padding-bottom: 5px; }
          .field { display: flex; margin: 8px 0; font-size: 11px; }
          .label { font-weight: bold; width: 150px; color: #3c3c3c; }
          .value { flex: 1; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHtml(sub.form_name || 'Form Submission')}</h1>
          <p>Status: ${escapeHtml(sub.status || 'Draft')} | Generated: ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h2>Submission Details</h2>
          <div class="field"><div class="label">Form Type:</div><div class="value">${escapeHtml(sub.form_type || '—')}</div></div>
          <div class="field"><div class="label">Form Name:</div><div class="value">${escapeHtml(sub.form_name || '—')}</div></div>
          <div class="field"><div class="label">Status:</div><div class="value">${escapeHtml(sub.status || '—')}</div></div>
          <div class="field"><div class="label">Submitted By:</div><div class="value">${escapeHtml(sub.submitted_by || sub.created_by || '—')}</div></div>
          <div class="field"><div class="label">Created Date:</div><div class="value">${sub.created_date ? new Date(sub.created_date).toLocaleString() : '—'}</div></div>
          ${sub.submitted_at ? `<div class="field"><div class="label">Submitted At:</div><div class="value">${new Date(sub.submitted_at).toLocaleString()}</div></div>` : ''}
        </div>
    `;

    if (incident) {
      html += `
        <div class="section">
          <h2>Incident Information</h2>
          <div class="field"><div class="label">Incident ID:</div><div class="value">${escapeHtml(incident.incident_id)}</div></div>
          <div class="field"><div class="label">Title:</div><div class="value">${escapeHtml(incident.title)}</div></div>
          <div class="field"><div class="label">Status:</div><div class="value">${escapeHtml(incident.status)}</div></div>
          <div class="field"><div class="label">Priority:</div><div class="value">${escapeHtml(incident.priority)}</div></div>
          <div class="field"><div class="label">Asset:</div><div class="value">${escapeHtml(incident.related_asset_name || '—')}</div></div>
          <div class="field"><div class="label">Location:</div><div class="value">${escapeHtml(incident.location_address || '—')}</div></div>
          <div class="field"><div class="label">City:</div><div class="value">${escapeHtml(incident.province || incident.city || '—')}</div></div>
          <div class="field"><div class="label">Municipality:</div><div class="value">${escapeHtml(incident.municipality || '—')}</div></div>
          <div class="field"><div class="label">Shelter Type:</div><div class="value">${escapeHtml(incident.shelter_type || '—')}</div></div>
          <div class="field"><div class="label">Reported Date:</div><div class="value">${escapeHtml(incident.reported_date || '—')}</div></div>
          <div class="field"><div class="label">OWR:</div><div class="value">${escapeHtml(incident.out_of_warranty || '—')}</div></div>
          ${incident.description ? `<div class="field"><div class="label">Description:</div><div class="value">${escapeHtml(incident.description)}</div></div>` : ''}
        </div>
      `;
    }

    if (asset) {
      html += `
        <div class="section">
          <h2>Asset Information</h2>
          <div class="field"><div class="label">Asset ID:</div><div class="value">${escapeHtml(asset.asset_id)}</div></div>
          <div class="field"><div class="label">Category:</div><div class="value">${escapeHtml(asset.category || '—')}</div></div>
          <div class="field"><div class="label">Shelter Type:</div><div class="value">${escapeHtml(asset.shelter_type || '—')}</div></div>
          <div class="field"><div class="label">Location:</div><div class="value">${escapeHtml(asset.location_address || '—')}</div></div>
          <div class="field"><div class="label">City:</div><div class="value">${escapeHtml(asset.city || '—')}</div></div>
          <div class="field"><div class="label">Municipality:</div><div class="value">${escapeHtml(asset.municipality || '—')}</div></div>
          <div class="field"><div class="label">Status:</div><div class="value">${escapeHtml(asset.status || '—')}</div></div>
        </div>
      `;
    }

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
      html += '<div class="section"><h2>Form Fields</h2>';
      topLevelFields.forEach(([label, value]) => {
        html += `<div class="field"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value))}</div></div>`;
      });
      html += '</div>';
    }

    if (sub.form_data && typeof sub.form_data === 'object') {
      const formDataEntries = [];
      let rowsHtml = '';

      const flatten = (obj, prefix = '') => {
        Object.entries(obj).forEach(([k, v]) => {
          const key = prefix ? `${prefix} › ${k}` : k;

          // Special handling for "rows" array — render as a table
          if (k === 'rows' && Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
            rowsHtml = `
              <div class="section">
                <h2>Work Items</h2>
                <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;">
                  <thead>
                    <tr style="background:#284fa0;color:white;">
                      <th style="padding:6px 8px;text-align:left;border:1px solid #ccc;">Item</th>
                      <th style="padding:6px 8px;text-align:center;border:1px solid #ccc;">Qty</th>
                      <th style="padding:6px 8px;text-align:right;border:1px solid #ccc;">Unit Price (€)</th>
                      <th style="padding:6px 8px;text-align:right;border:1px solid #ccc;">Total (€)</th>
                      <th style="padding:6px 8px;text-align:left;border:1px solid #ccc;">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${v.map((row, i) => {
                      const qty = Number(row.qty || row.quantity || 0);
                      const unitPrice = Number(row.unit_price || 0);
                      const total = (qty * unitPrice).toFixed(2);
                      const itemName = row.description || row.name || row.catalog_id || `Item ${i + 1}`;
                      const comments = row.comments || '';
                      const bg = i % 2 === 0 ? '#f9f9f9' : '#fff';
                      return `<tr style="background:${bg};">
                        <td style="padding:6px 8px;border:1px solid #ccc;">${escapeHtml(String(itemName))}</td>
                        <td style="padding:6px 8px;text-align:center;border:1px solid #ccc;">${qty}</td>
                        <td style="padding:6px 8px;text-align:right;border:1px solid #ccc;">${unitPrice.toFixed(2)}</td>
                        <td style="padding:6px 8px;text-align:right;border:1px solid #ccc;">${total}</td>
                        <td style="padding:6px 8px;border:1px solid #ccc;">${escapeHtml(comments)}</td>
                      </tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>`;
            return;
          }

          if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
            flatten(v, key);
          } else if (v !== null && v !== undefined && v !== '' && v !== false && v !== 'false') {
            // Skip boolean false values and arrays that are "rows" (handled above)
            if (Array.isArray(v)) {
              // For arrays of objects (photos etc), render nicely
              const formatted = v.map(item => {
                if (typeof item === 'object' && item !== null) {
                  return item.name || item.url || JSON.stringify(item);
                }
                return String(item);
              }).join('\n');
              if (formatted.trim()) {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ':';
                formDataEntries.push([label, formatted]);
              }
            } else {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ':';
              formDataEntries.push([label, v]);
            }
          }
        });
      };
      flatten(sub.form_data);

      // Insert rows table first if present
      if (rowsHtml) {
        html += rowsHtml;
      }

      if (formDataEntries.length > 0) {
        html += '<div class="section"><h2>Additional Form Data</h2>';
        formDataEntries.forEach(([label, val]) => {
          html += `<div class="field"><div class="label">${escapeHtml(label)}</div><div class="value" style="white-space:pre-wrap;">${escapeHtml(String(val))}</div></div>`;
        });
        html += '</div>';
      }
    }

    html += '</body></html>';

    const fileName = `${(sub.form_name || 'form').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')}_${submissionId}.pdf`;
    
    console.log("[generateFormPDF] PDF generated successfully");
    return Response.json({ success: true, html, fileName });

  } catch (error) {
    console.error("[generateFormPDF] Error:", error.message, error.stack);
    return Response.json({ error: `PDF generation failed: ${error.message}` }, { status: 500 });
  }
});

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}