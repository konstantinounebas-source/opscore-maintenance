import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workOrderId, workOrderType, incidentId } = await req.json();

    if (!workOrderId || !workOrderType || !incidentId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const [workOrders, incidents] = await Promise.all([
      base44.entities.WorkOrders.filter({ id: workOrderId }),
      base44.entities.Incidents.filter({ id: incidentId }),
    ]);

    if (!workOrders.length || !incidents.length) {
      return Response.json({ error: 'Work order or incident not found' }, { status: 404 });
    }

    const wo = workOrders[0];
    const inc = incidents[0];

    function e(s) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(s ?? '—').replace(/[&<>"']/g, m => map[m]);
    }

    function row(label, value) {
      return `<tr>
        <td style="padding:4px 8px;font-weight:600;color:#64748b;width:38%;font-size:11px;border-bottom:1px solid #f1f5f9;vertical-align:top;">${label}</td>
        <td style="padding:4px 8px;color:#1e293b;font-size:11px;border-bottom:1px solid #f1f5f9;vertical-align:top;">${value}</td>
      </tr>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${e(workOrderType)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.45; color: #1a1a2e; background: #fff; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; }
    @page { size: A4 portrait; margin: 14mm 15mm 16mm 15mm; }
    .section { page-break-inside: avoid; }
  }
  .header { background: #1e3a8a; color: white; padding: 14px 18px; border-radius: 5px; margin-bottom: 14px; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header h1 { font-size: 14px; font-weight: 700; margin: 0; }
  .header p { font-size: 9px; opacity: 0.85; margin-top: 3px; }
  .section { margin-bottom: 11px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
  .section-title { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 5px 10px; font-size: 9.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; }
  .footer { border-top: 1px solid #e2e8f0; margin-top: 12px; padding-top: 5px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="header">
    <h1>${e(workOrderType)}</h1>
    <p>Work Order: ${e(wo.work_order_id)} &nbsp;|&nbsp; Incident: ${e(inc.incident_id)} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('el-GR')}</p>
  </div>

  <div class="section">
    <div class="section-title">Incident Information</div>
    <table>
      ${row('Incident ID', e(inc.incident_id))}
      ${row('Title', e(inc.title))}
      ${row('Asset', e(inc.related_asset_name))}
      ${row('Location', e(inc.location_address))}
      ${row('Status', e(inc.status))}
      ${row('Priority', e(inc.operational_priority || inc.priority))}
      ${row('Reported Date', e(inc.reported_date || inc.issue_date))}
      ${inc.description ? row('Description', e(inc.description)) : ''}
    </table>
  </div>

  <div class="section">
    <div class="section-title">Work Order Information</div>
    <table>
      ${row('Work Order ID', e(wo.work_order_id))}
      ${row('Type', e(workOrderType))}
      ${row('Title', e(wo.title))}
      ${row('Status', e(wo.status))}
      ${row('Priority', e(wo.priority))}
      ${row('Assigned To', e(wo.assigned_to))}
      ${row('Due Date', e(wo.due_date))}
      ${wo.description ? row('Description', e(wo.description)) : ''}
    </table>
  </div>

  <div class="footer">
    <span>${e(workOrderType)} — ${e(wo.work_order_id)}</span>
    <span>Generated: ${new Date().toLocaleString('el-GR')}</span>
  </div>

  <script>
    window.onload = function() {
      document.title = '${e(workOrderType)}_${e(wo.work_order_id)}';
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

    const fileName = `${workOrderType.replace(/\s+/g, '_')}_${wo.work_order_id}.pdf`;
    return Response.json({ success: true, html, fileName });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});