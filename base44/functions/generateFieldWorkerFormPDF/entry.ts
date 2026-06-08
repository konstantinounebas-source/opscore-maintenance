import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { incidentId, submissionId, token } = await req.json();

    // Allow either authenticated user OR valid field-worker token
    if (token) {
      try {
        const standard = token.replace(/-/g, '+').replace(/_/g, '/');
        const padded = standard + '=='.slice(0, (4 - standard.length % 4) % 4);
        const decoded = atob(padded);
        const lastColon = decoded.lastIndexOf(':');
        const timestamp = parseInt(decoded.substring(lastColon + 1));
        if (Date.now() - timestamp > 48 * 60 * 60 * 1000) {
          return Response.json({ error: 'Token expired' }, { status: 401 });
        }
      } catch {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!submissionId) return Response.json({ error: 'Missing submissionId' }, { status: 400 });

    // Fetch submission using service role (works for unauthenticated field workers)
    const submission = await base44.asServiceRole.entities.FormSubmissions.get(submissionId);
    if (!submission) return Response.json({ error: 'Submission not found' }, { status: 404 });

    const formData = submission.form_data || {};
    const formType = submission.form_type;
    
    // Fetch incident and asset
    const incidents = await base44.asServiceRole.entities.Incidents.filter({ id: submission.incident_id });
    const inc = incidents[0] || {};
    
    let asset = {};
    if (inc.related_asset_id) {
      const allAssets = await base44.asServiceRole.entities.Assets.list('-created_date', 500);
      asset = allAssets.find(a => a.id === inc.related_asset_id) || {};
    }

    // Get work order
    const workOrders = await base44.asServiceRole.entities.WorkOrders.filter({ incident_id: inc.id });
    const resolvedWorkOrderId = workOrders.find(w => w.title?.toLowerCase().includes('make safe'))?.work_order_id ||
      workOrders[0]?.work_order_id || '';

    function e(s) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(s ?? '').replace(/[&<>"']/g, m => map[m]);
    }

    const chk = (val) => val ? '&#9745;' : '&#9744;';
    const today = new Date().toLocaleDateString('el-GR');

    // Generate HTML based on form type
    let html = '';
    let fileName = '';
    
    if (formType === 'make_safe_checklist') {
      fileName = `MakeSafe_${inc.incident_id || 'form'}_${resolvedWorkOrderId || ''}.pdf`;
      html = generateMakeSafeHTML(inc, asset, resolvedWorkOrderId, formData, today, e, chk);
    } else if (formType === 'corrective_wo_checklist') {
      fileName = `Corrective_${inc.incident_id || 'form'}_${resolvedWorkOrderId || ''}.pdf`;
      html = generateCorrectiveHTML(inc, asset, resolvedWorkOrderId, formData, today, e, chk);
    } else if (formType === 'inspection_wo_checklist') {
      fileName = `Inspection_${inc.incident_id || 'form'}_${resolvedWorkOrderId || ''}.pdf`;
      html = generateInspectionHTML(inc, asset, resolvedWorkOrderId, formData, today, e, chk);
    } else {
      return Response.json({ error: 'Unknown form type' }, { status: 400 });
    }

    return Response.json({ success: true, html, fileName });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateMakeSafeHTML(inc, asset, resolvedWorkOrderId, fd, today, e, chk) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Make-Safe Checklist ΠΕΔΙΟΥ</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { font-size: 7px; color: #000; background: #fff; }
  h1 { text-align: center; font-size: 12px; font-weight: bold; text-decoration: underline; color: #c00000; margin-bottom: 2px; }
  h2 { text-align: center; font-size: 8.5px; color: #333; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { border: 1px solid #000; padding: 1.5px 3px; vertical-align: middle; font-size: 7px; word-break: break-word; }
  th { background: #d9d9d9; font-weight: bold; text-align: center; }
  .section-header { background: #d9d9d9; font-weight: bold; text-align: left; padding: 2px 4px; }
  @page { size: A4 landscape; margin: 6mm 7mm; }
</style>
</head>
<body>
<h1>MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ</h1>
<h2>Smart Bus Shelters – Άμεση ασφάλιση χώρου/κινδύνου (Make-Safe)</h2>

<table style="margin-bottom:2px;">
  <tr>
    <td colspan="8">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;width:12%;">Ημερομηνία:</td>
          <td style="border:none;font-size:7px;width:18%;">${e(fd.date || '')}</td>
          <td style="border:none;font-weight:bold;font-size:6.5px;color:#c00000;width:14%;">Incident ID:</td>
          <td style="border:none;font-weight:bold;font-size:6.5px;width:18%;">${e(inc.incident_id || '')}</td>
          <td style="border:none;font-weight:bold;font-size:6.5px;color:#c00000;width:10%;">WO ID:</td>
          <td style="border:none;font-weight:bold;font-size:6.5px;width:28%;">${e(resolvedWorkOrderId || '')}</td>
        </tr>
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;">Asset ID:</td>
          <td style="border:none;font-size:7px;">${e(asset.asset_id || asset.asset_code || inc.related_asset_name || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;" colspan="2">Τοποθεσία: ${e(inc.location_address || asset.location_address || '')}</td>
          <td colspan="2" style="border:none;font-size:7px;"></td>
        </tr>
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;">Ώρα Έναρξης:</td>
          <td style="border:none;font-size:7px;">${e(fd.time_start || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Τεχνικός:</td>
          <td style="border:none;font-size:7px;">${e(fd.technician || '')}</td>
          <td colspan="2" style="border:none;"></td>
        </tr>
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;">Όχημα:</td>
          <td style="border:none;font-size:7px;">${e(fd.vehicle || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Ωρα Άφιξης:</td>
          <td style="border:none;font-size:7px;">${e(fd.time_arrival || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Ώρα ολοκλ.:</td>
          <td style="border:none;font-size:7px;">${e(fd.time_end || '')}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="4" class="section-header">B. STOP &amp; ASSESS</td></tr>
  <tr>
    <td colspan="4">${chk(fd.check_360)} 360° έλεγχος.</td>
  </tr>
  <tr>
    <td colspan="4">
      ${chk(fd.danger_electrical || fd.danger_glass || fd.danger_structural || fd.danger_pv || fd.danger_other)} Κίνδυνος: &nbsp;
      ${chk(fd.danger_electrical)} Ηλεκτρ. &nbsp;
      ${chk(fd.danger_glass)} Γυαλί &nbsp;
      ${chk(fd.danger_structural)} Δομικό &nbsp;
      ${chk(fd.danger_pv)} PV/μπατ. &nbsp;
      ${chk(fd.danger_other)} Άλλο: ${e(fd.danger_other_text || '')}
    </td>
  </tr>
  <tr>
    <td colspan="4">
      ${chk(fd.immediate_danger === 'yes' || fd.immediate_danger === 'no')} Άμεσος κίνδυνος ζωής: &nbsp;
      ${chk(fd.immediate_danger === 'yes')} Ναι → 112 / απομάκρυνση &nbsp;
      ${chk(fd.immediate_danger === 'no')} Όχι
    </td>
  </tr>
  <tr>
    <td colspan="4"><span class="bold">Περιγραφή κινδύνου:</span> ${e(fd.danger_description || '')}</td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="4" class="section-header">C. PPE &amp; ΕΞΟΠΛΙΣΜΟΣ</td></tr>
  <tr>
    <td colspan="4">
      ${chk(fd.ppe_vest)} Γιλέκο &nbsp;
      ${chk(fd.ppe_helmet)} Κράνος &nbsp;
      ${chk(fd.ppe_gloves)} Γάντια &nbsp;
      ${chk(fd.ppe_glasses)} Γυαλιά &nbsp;
      ${chk(fd.ppe_shoes)} Υποδήματα &nbsp;
      ${chk(fd.ppe_mask)} Μάσκα &nbsp;
      ${chk(fd.ppe_extinguisher)} Πυροσβεστήρας &nbsp;
      ${chk(fd.ppe_all)} Όλα τα παραπάνω
    </td>
  </tr>
  <tr>
    <td colspan="4">
      ${chk(fd.eq_cones)} Κιτ σήμανσης/αποκλεισμού &nbsp;&nbsp;
      ${chk(fd.eq_loto_kit)} LOTO kit &nbsp;
      ${chk(fd.eq_all)} Όλα τα παραπάνω &nbsp;
      ${chk(fd.eq_other)} Άλλο: ${e(fd.eq_other_text || '')}
    </td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ</td></tr>
  <tr>
    <td style="width:50%;vertical-align:top;">
      ${chk(fd.tmp1)} TMP-1 &nbsp; ${chk(fd.tmp2)} TMP-2 &nbsp;
      ${chk(fd.tmp3)} TMP-3 &nbsp; ${chk(fd.tmp4)} TMP-4
    </td>
    <td style="width:50%;vertical-align:top;">
      ${chk(fd.tmr1)} TMR-1 &nbsp; ${chk(fd.tmr2)} TMR-2 &nbsp;
      ${chk(fd.tmr3)} TMR-3 &nbsp; ${chk(fd.tmbs1)} TMBS-1 &nbsp; ${chk(fd.tmbs2)} TMBS-2
    </td>
  </tr>
  <tr>
    <td colspan="2">
      Συντονισμός με: &nbsp;
      ${chk(fd.coord_police)} Αστυνομία &nbsp;
      ${chk(fd.coord_municipality)} Δήμος &nbsp;
      ${chk(fd.coord_other)} Άλλο: ${e(fd.coord_other_text || '')}
    </td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">E. LOTO</td></tr>
  <tr>
    <td colspan="2">
      Πηγές: &nbsp;
      ${chk(fd.loto_ac)} AC &nbsp;
      ${chk(fd.loto_pv)} PV DC &nbsp;
      ${chk(fd.loto_battery)} Μπαταρία &nbsp;
      ${chk(fd.loto_other)} Άλλο: ${e(fd.loto_other_text || '')}
    </td>
  </tr>
  <tr>
    <td style="width:50%;">${chk(fd.loto_isolation)} Απομόνωση / απενεργοποίηση.</td>
    <td style="width:50%;"></td>
  </tr>
  <tr>
    <td>${chk(fd.loto_lock_tag)} Lock + Tag: ${e(fd.loto_lock_tag_name || '')}</td>
    <td>${chk(fd.loto_confirm)} Επιβεβαίωση</td>
  </tr>
  <tr>
    <td colspan="2" style="height:16px;"><span class="bold">Παρατηρήσεις:</span> ${e(fd.loto_notes || '')}</td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE</td></tr>
  <tr>
    <td style="width:50%;vertical-align:top;">
      <div>F1 Ηλεκτρ.: ${chk(fd.f1_cover)} Κάλυψη &nbsp; ${chk(fd.f1_panel_lock)} Κλείδωμα</div>
      <div style="margin-top:3px;">F2 Γυαλί: ${chk(fd.f2_collect)} Συλλογή &nbsp; ${chk(fd.f2_stabilize)} Σταθεροποίηση &nbsp; ${chk(fd.f2_cover)} Κάλυψη</div>
      <div style="margin-top:3px;">F3 Δομικό: ${chk(fd.f3_stabilize)} Σταθεροποίηση &nbsp; ${chk(fd.f3_remove)} Αφαίρεση</div>
    </td>
    <td style="width:50%;vertical-align:top;">
      <div>F4 PV/Μπατ.: ${chk(fd.f4_isolate)} Απομόνωση</div>
      <div style="margin-top:2px;">Θερμικό: ${chk(fd.f4_thermal === 'yes')} Ναι &nbsp; ${chk(fd.f4_thermal === 'no')} Όχι</div>
      <div style="margin-top:2px;">${chk(fd.f4_evacuate)} Απομάκρυνση + ενημέρωση</div>
      <div style="margin-top:3px;">${chk(fd.f4_full_removal)} Ολική αφαίρεση Στάσης</div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="vertical-align:top;height:14px;"><span class="bold">F5 Άλλο:</span> ${e(fd.f5_other || '')}</td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">G. ΕΙΔΙΚΟ ΟΧΗΜΑ</td></tr>
  <tr>
    <td colspan="2">
      ${chk(fd.vehicle_none)} Όχι &nbsp;
      ${chk(fd.vehicle_yes)} Ναι &nbsp;
      Τύπος: ${chk(fd.veh_cherry)} Cherry picker &nbsp; ${chk(fd.veh_crane)} Crane &nbsp; ${chk(fd.veh_other)} Άλλο: ${e(fd.veh_other_text || '')}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="height:14px;"><span class="bold">Αιτιολόγηση:</span> ${e(fd.veh_justification || '')}</td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td class="section-header">Εκκρεμότητες / Corrective:</td></tr>
  <tr><td style="height:16px;">${e(fd.pending_corrective || '')}</td></tr>
</table>

<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">I. ΤΕΚΜΗΡΙΩΣΗ</td></tr>
  <tr>
    <td colspan="2">
      ${chk(fd.doc_photo_before)} Φωτο ΠΡΙΝ &nbsp;
      ${chk(fd.doc_photo_after)} Φωτο ΜΕΤΑ &nbsp;
      ${chk(fd.doc_wm)} WM
    </td>
  </tr>
  <tr>
    <td colspan="2">${chk(fd.doc_materials)} Υλικά: ${e(fd.doc_materials_text || '')}</td>
  </tr>
  <tr>
    <td colspan="2" class="bold">${chk(fd.doc_make_safe_completed)} Make Safe WO COMPLETED</td>
  </tr>
  <tr>
    <td colspan="2" style="height:14px;"><span class="bold">HD Comments:</span> ${e(fd.doc_hd_comments || '')}</td>
  </tr>
</table>

<table>
  <tr><td colspan="4" class="section-header">K. ΥΠΟΓΡΑΦΕΣ</td></tr>
  <tr>
    <td style="width:30%;font-weight:bold;">Τεχνικός: ${e(fd.sig_tech || '')}</td>
    <td style="width:20%;">${fd.signature_url || fd.signature ? `<img src="${fd.signature_url || fd.signature}" style="max-height:35px;max-width:120px;display:block;" />` : 'Υπογρ.: _______________'}</td>
    <td style="width:30%;font-weight:bold;">HD: ${e(fd.sig_hd || '')}</td>
    <td style="width:20%;">Υπογρ.: _______________</td>
  </tr>
  <tr>
    <td colspan="4" style="font-size:7px;font-weight:bold;">Ημ/νία: ${e(fd.sig_date || today)}</td>
  </tr>
</table>
</body>
</html>`;
}

function generateCorrectiveHTML(inc, asset, resolvedWorkOrderId, fd, today, e, chk) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Corrective Work Order Checklist</title>
<style>
  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 7px; }
  h1 { text-align: center; font-size: 12px; font-weight: bold; color: #c00000; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 2px; font-size: 7px; }
  th { background: #d9d9d9; font-weight: bold; }
  .section-header { background: #d9d9d9; font-weight: bold; padding: 3px; }
  @page { size: A4 landscape; margin: 6mm 7mm; }
</style>
</head>
<body>
<h1>CORRECTIVE WORK ORDER CHECKLIST</h1>
<table style="margin-bottom:3px;">
  <tr>
    <td style="width:20%;font-weight:bold;">Incident ID:</td>
    <td style="width:30%;">${e(inc.incident_id || '')}</td>
    <td style="width:20%;font-weight:bold;">Work Order:</td>
    <td style="width:30%;">${e(resolvedWorkOrderId || '')}</td>
  </tr>
  <tr>
    <td style="font-weight:bold;">Asset:</td>
    <td>${e(asset.asset_id || inc.related_asset_name || '')}</td>
    <td style="font-weight:bold;">Date:</td>
    <td>${e(fd.date || today)}</td>
  </tr>
</table>

<table style="margin-bottom:3px;">
  <tr><td colspan="2" class="section-header">WORK DETAILS</td></tr>
  <tr>
    <td style="width:50%;"><b>Work Performed:</b> ${e(fd.work_performed || '')}</td>
    <td style="width:50%;"><b>Materials Used:</b> ${e(fd.materials_used || '')}</td>
  </tr>
  <tr>
    <td><b>Labor Hours:</b> ${e(fd.labor_hours || '')}</td>
    <td><b>Equipment Used:</b> ${e(fd.equipment_used || '')}</td>
  </tr>
</table>

<table style="margin-bottom:3px;">
  <tr><td colspan="4" class="section-header">QUALITY CHECKS</td></tr>
  <tr>
    <td>${chk(fd.qc_structural)} Structural OK</td>
    <td>${chk(fd.qc_electrical)} Electrical OK</td>
    <td>${chk(fd.qc_electronic)} Electronic OK</td>
    <td>${chk(fd.qc_other)} Other OK</td>
  </tr>
</table>

<table style="margin-bottom:3px;">
  <tr><td colspan="2" class="section-header">PHOTOS</td></tr>
  <tr>
    <td colspan="2">${chk(fd.photo_before)} Before &nbsp; ${chk(fd.photo_after)} After</td>
  </tr>
</table>

<table>
  <tr><td colspan="3" class="section-header">SIGNATURES</td></tr>
  <tr>
    <td style="width:33%;"><b>Technician:</b> ${e(fd.technician || fd.completed_by || '')}</td>
    <td style="width:33%;">${fd.signature_url || fd.signature ? `<img src="${fd.signature_url || fd.signature}" style="max-height:35px;max-width:120px;display:block;" />` : 'Υπογραφή: _______________'}</td>
    <td style="width:33%;">Date: ${e(fd.date || fd.date_of_work || today)}</td>
  </tr>
</table>
</body>
</html>`;
}

function generateInspectionHTML(inc, asset, resolvedWorkOrderId, fd, today, e, chk) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Inspection WO Checklist</title>
<style>
  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 7px; }
  h1 { text-align: center; font-size: 12px; font-weight: bold; color: #c00000; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 2px; font-size: 7px; }
  th { background: #d9d9d9; font-weight: bold; }
  .section-header { background: #d9d9d9; font-weight: bold; padding: 3px; }
  @page { size: A4 landscape; margin: 6mm 7mm; }
</style>
</head>
<body>
<h1>INSPECTION WO CHECKLIST</h1>
<table style="margin-bottom:3px;">
  <tr>
    <td style="width:20%;font-weight:bold;">Incident ID:</td>
    <td style="width:30%;">${e(inc.incident_id || '')}</td>
    <td style="width:20%;font-weight:bold;">Work Order:</td>
    <td style="width:30%;">${e(resolvedWorkOrderId || '')}</td>
  </tr>
  <tr>
    <td style="font-weight:bold;">Asset:</td>
    <td>${e(asset.asset_id || inc.related_asset_name || '')}</td>
    <td style="font-weight:bold;">Date:</td>
    <td>${e(fd.date || today)}</td>
  </tr>
</table>

<table style="margin-bottom:3px;">
  <tr><td colspan="4" class="section-header">INSPECTION CHECKLIST</td></tr>
  <tr>
    <td>${chk(fd.check_structure)} Structure</td>
    <td>${chk(fd.check_glass)} Glass</td>
    <td>${chk(fd.check_electrical)} Electrical</td>
    <td>${chk(fd.check_electronic)} Electronic</td>
  </tr>
  <tr>
    <td>${chk(fd.check_paving)} Paving</td>
    <td>${chk(fd.check_cleanliness)} Cleanliness</td>
    <td>${chk(fd.check_safety)} Safety</td>
    <td>${chk(fd.check_other)} Other</td>
  </tr>
</table>

<table style="margin-bottom:3px;">
  <tr><td colspan="2" class="section-header">FINDINGS</td></tr>
  <tr>
    <td colspan="2"><b>Issues Found:</b> ${e(fd.issues_found || '')}</td>
  </tr>
  <tr>
    <td colspan="2"><b>Recommendations:</b> ${e(fd.recommendations || '')}</td>
  </tr>
</table>

<table>
  <tr><td colspan="3" class="section-header">ΥΠΟΓΡΑΦΕΣ</td></tr>
  <tr>
    <td style="width:33%;"><b>Επιθεωρητής:</b> ${e(fd.completed_by || fd.epalitheusi_onoma || '')}</td>
    <td style="width:33%;">${fd.signature_url || fd.signature ? `<img src="${fd.signature_url || fd.signature}" style="max-height:35px;max-width:120px;display:block;" />` : 'Υπογραφή: _______________'}</td>
    <td style="width:33%;">Ημερ: ${e(fd.date || fd.date_of_work || fd.epalitheusi_imerominia || today)}</td>
  </tr>
</table>
</body>
</html>`;
}