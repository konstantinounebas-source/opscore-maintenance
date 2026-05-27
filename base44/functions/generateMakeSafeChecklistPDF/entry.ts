import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { incidentId, workOrderId, formData } = await req.json();
    if (!incidentId) return Response.json({ error: 'Missing incidentId' }, { status: 400 });

    const incidents = await base44.entities.Incidents.filter({ incident_id: incidentId });
    const inc = incidents[0] || {};

    let asset = {};
    let workOrders = [];
    if (inc.id) {
      const [allAssets, wos] = await Promise.all([
        inc.related_asset_id ? base44.entities.Assets.list('-created_date', 500) : Promise.resolve([]),
        base44.entities.WorkOrders.filter({ incident_id: inc.id }),
      ]);
      if (inc.related_asset_id) {
        asset = allAssets.find(a => a.id === inc.related_asset_id) || {};
      }
      workOrders = wos;
    }

    // Resolve Make Safe WO number: prefer passed-in, then make safe WO, then first WO
    const resolvedWorkOrderId = workOrderId ||
      workOrders.find(w => w.title?.toLowerCase().includes('make safe') || w.title?.toLowerCase().includes('make-safe'))?.work_order_id ||
      workOrders[0]?.work_order_id || '';

    const fd = formData || {};

    function e(s) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(s ?? '').replace(/[&<>"']/g, m => map[m]);
    }

    const chk = (val) => val ? '&#9745;' : '&#9744;';
    const today = new Date().toLocaleDateString('el-GR');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Make-Safe Checklist Πεδίου</title>
<style>
  @page { size: A4 landscape; margin: 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5px; color: #000; background: #fff; }
  h1 { text-align: center; font-size: 13px; font-weight: bold; text-decoration: underline; color: #c00000; margin-bottom: 2px; }
  h2 { text-align: center; font-size: 9px; color: #333; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 1.5px 3px; vertical-align: middle; font-size: 7px; }
  th { background: #d9d9d9; font-weight: bold; text-align: center; font-size: 7px; }
  .section-header { background: #d9d9d9; font-weight: bold; text-align: left; font-size: 7.5px; padding: 2px 4px; }
  .label-cell { font-weight: bold; white-space: nowrap; font-size: 7px; }
  .value-cell { font-size: 7px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .red-bold { font-weight: bold; color: #c00000; }
</style>
</head>
<body>

<h1>MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ</h1>
<h2>Smart Bus Shelters – Άμεση ασφάλιση χώρου/κινδύνου (Make-Safe)</h2>

<!-- A. ΣΤΟΙΧΕΙΑ -->
<table style="margin-bottom:2px;">
  <tr>
    <td colspan="8" style="border:1px solid #000;padding:1px 3px;">
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

<!-- B. STOP & ASSESS -->
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

<!-- C. PPE & ΕΞΟΠΛΙΣΜΟΣ -->
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
      ${chk(fd.eq_cones)} Κιτ σήμανσης/αποκλεισμού (Κώνοι/κορδέλες κλπ.) &nbsp;&nbsp;
      ${chk(fd.eq_loto_kit)} LOTO kit (Lock/Tag) &nbsp;
      ${chk(fd.eq_all)} Όλα τα παραπάνω &nbsp;
      ${chk(fd.eq_other)} Άλλο: ${e(fd.eq_other_text || '')}
    </td>
  </tr>
</table>

<!-- D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ -->
<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ</td></tr>
  <tr>
    <td style="width:50%;vertical-align:top;">
      ${chk(fd.tmp1)} TMP-1 Ασφάλιση της περιμέτρου στάσης λεωφορείου με διατήρηση διέλευσης πεζών.<br/>
      ${chk(fd.tmp2)} TMP-2 Ασφάλιση της περιμέτρου στάσης λεωφορείου με εκτροπή πεζών.<br/>
      ${chk(fd.tmp3)} TMP-3 Προσωρινά καλύμματα πάνω από εκσκαφές για πλευρές που παραμένουν χωρίς επίβλεψη.<br/>
      ${chk(fd.tmp4)} TMP-4 Προσωρινές ξύλινες διαβάσεις πεζών (footway boards) πάνω από εκσκαφές.
    </td>
    <td style="width:50%;vertical-align:top;">
      ${chk(fd.tmr1)} TMR-1 Ασφάλιση της εσοχής στάσης λεωφορείου (bus stop bay).<br/>
      ${chk(fd.tmr2)} TMR-2 Προσωρινή στάθμευση οχήματος εργασιών μπροστά από την περιοχή εργασιών.<br/>
      ${chk(fd.tmr3)} TMR-3 Ρύθμιση κυκλοφορίας με πινακίδες Stop/Go.<br/>
      ${chk(fd.tmbs1)} TMBS-1 Προσωρινή στάση λεωφορείου.<br/>
      ${chk(fd.tmbs2)} TMBS-2 Προσωρινά μη εξυπηρετούμενη στάση λεωφορείου.
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

<!-- E. LOTO -->
<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">E. LOTO (όπου εφαρμόζεται)</td></tr>
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
    <td>${chk(fd.loto_lock_tag)} Lock + Tag (όνομα/ώρα): ${e(fd.loto_lock_tag_name || '')}</td>
    <td>${chk(fd.loto_confirm)} Επιβεβαίωση ασφαλούς κατάστασης (όπου δυνατό).</td>
  </tr>
  <tr>
    <td colspan="2" style="height:16px;vertical-align:top;"><span class="bold">Παρατηρήσεις:</span> ${e(fd.loto_notes || '')}</td>
  </tr>
</table>

<!-- F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE -->
<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE</td></tr>
  <tr>
    <td style="width:50%;vertical-align:top;">
      <div>F1 Ηλεκτρ.: ${chk(fd.f1_cover)} Κάλυψη/απομόνωση &nbsp; ${chk(fd.f1_panel_lock)} Κλείδωμα πίνακα / αποτροπή πρόσβασης</div>
      <div style="margin-top:3px;">F2 Γυαλί: ${chk(fd.f2_collect)} Συλλογή &nbsp; ${chk(fd.f2_stabilize)} Σταθεροποίηση/αφαίρεση &nbsp; ${chk(fd.f2_cover)} Κάλυψη + αποκλεισμός</div>
      <div style="margin-top:3px;">F3 Δομικό: ${chk(fd.f3_stabilize)} Σταθεροποίηση &nbsp; ${chk(fd.f3_remove)} Αφαίρεση χαλαρών μερών</div>
    </td>
    <td style="width:50%;vertical-align:top;">
      <div>F4 PV/Μπατ.: ${chk(fd.f4_isolate)} Απομόνωση</div>
      <div style="margin-top:2px;">Θερμικό/οσμές/φούσκωμα: ${chk(fd.f4_thermal === 'yes')} Ναι &nbsp; ${chk(fd.f4_thermal === 'no')} Όχι</div>
      <div style="margin-top:2px;">Αν ΝΑΙ: ${chk(fd.f4_evacuate)} Απομάκρυνση κοινού + ενημέρωση Help Desk/Maintenance Supervisor</div>
      <div style="margin-top:3px;">${chk(fd.f4_full_removal)} Ολική αφαίρεση Στάσης</div>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="vertical-align:top;height:14px;"><span class="bold">F5 Άλλο:</span> ${e(fd.f5_other || '')}</td>
  </tr>
</table>

<!-- G. ΕΙΔΙΚΟ ΟΧΗΜΑ -->
<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">G. ΕΙΔΙΚΟ ΟΧΗΜΑ / ΕΞΟΠΛΙΣΜΟΣ (αν απαιτήθηκε)</td></tr>
  <tr>
    <td colspan="2">
      ${chk(fd.vehicle_none)} Όχι &nbsp;
      ${chk(fd.vehicle_yes)} Ναι &nbsp;
      Τύπος: ${chk(fd.veh_cherry)} Cherry picker &nbsp; ${chk(fd.veh_crane)} Crane &nbsp; ${chk(fd.veh_other)} Άλλο: ${e(fd.veh_other_text || '')}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="height:14px;vertical-align:top;"><span class="bold">Αιτιολόγηση:</span> ${e(fd.veh_justification || '')}</td>
  </tr>
</table>

<!-- H. Εκκρεμότητες / Corrective -->
<table style="margin-bottom:2px;">
  <tr><td class="section-header">Εκκρεμότητες / Corrective:</td></tr>
  <tr><td style="height:16px;vertical-align:top;">${e(fd.pending_corrective || '')}</td></tr>
</table>

<!-- I. ΤΕΚΜΗΡΙΩΣΗ -->
<table style="margin-bottom:2px;">
  <tr><td colspan="2" class="section-header">I. ΤΕΚΜΗΡΙΩΣΗ &amp; WM / ΚΛΙΜΑΚΩΣΗ</td></tr>
  <tr>
    <td colspan="2">
      ${chk(fd.doc_photo_before)} Φωτο ΠΡΙΝ &nbsp;
      ${chk(fd.doc_photo_after)} Φωτο ΜΕΤΑ (με σήμανση) &nbsp;
      ${chk(fd.doc_wm)} Καταχώρηση ενεργειών στο WM
    </td>
  </tr>
  <tr>
    <td colspan="2">
      ${chk(fd.doc_materials)} Υλικά προσωρινής ασφάλειας: ${e(fd.doc_materials_text || '')}
    </td>
  </tr>
  <tr>
    <td colspan="2" class="bold">${chk(fd.doc_make_safe_completed)} Make Safe WO COMPLETED (Make-Safe)</td>
  </tr>
  <tr>
    <td colspan="2" style="height:14px;vertical-align:top;"><span class="bold">Ενημέρωση HD/IM Σχόλια:</span> ${e(fd.doc_hd_comments || '')}</td>
  </tr>
</table>

<!-- K. ΥΠΟΓΡΑΦΕΣ -->
<table>
  <tr><td colspan="4" class="section-header">K. ΥΠΟΓΡΑΦΕΣ</td></tr>
  <tr>
    <td style="width:30%;font-weight:bold;font-size:7px;">Τεχνικός: ${e(fd.sig_tech || '')}</td>
    <td style="width:20%;font-size:7px;">Υπογρ.: <span style="display:inline-block;width:80px;border-bottom:1px solid #000;">&nbsp;</span></td>
    <td style="width:30%;font-weight:bold;font-size:7px;">HD / Maintenance Supervisor: ${e(fd.sig_hd || '')}</td>
    <td style="width:20%;font-size:7px;">Υπογρ.: <span style="display:inline-block;width:80px;border-bottom:1px solid #000;">&nbsp;</span></td>
  </tr>
  <tr>
    <td colspan="4" style="font-size:7px;font-weight:bold;">Ημ/νία: ${e(fd.sig_date || today)}</td>
  </tr>
</table>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;

    const fileName = `MakeSafe_${inc.incident_id || 'form'}_${resolvedWorkOrderId || ''}.pdf`;
    return Response.json({ success: true, html, fileName });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});