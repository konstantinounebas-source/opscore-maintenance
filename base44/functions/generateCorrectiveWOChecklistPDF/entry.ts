import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { incidentId, workOrderId, formData } = await req.json();
    if (!incidentId) return Response.json({ error: 'Missing incidentId' }, { status: 400 });

    const incidents = await base44.asServiceRole.entities.Incidents.filter({ incident_id: incidentId });
    const inc = incidents[0] || {};

    // Fetch asset and work orders in parallel using the incident's record ID
    let asset = {};
    let workOrders = [];
    if (inc.id) {
      const [allAssets, wos] = await Promise.all([
        inc.related_asset_id ? base44.asServiceRole.entities.Assets.list('-created_date', 500) : Promise.resolve([]),
        base44.asServiceRole.entities.WorkOrders.filter({ incident_id: inc.id }),
      ]);
      if (inc.related_asset_id) {
        asset = allAssets.find(a => a.id === inc.related_asset_id) || {};
      }
      workOrders = wos;
    }

    // Resolve work order number: prefer passed-in, then corrective WO, then first WO
    const resolvedWorkOrderId = workOrderId ||
      workOrders.find(w => w.title?.toLowerCase().includes('corrective'))?.work_order_id ||
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
<title>Έντυπο Εντολής Εργασίας - Corrective WorkOrder</title>
<style>
  @page { size: A4 landscape; margin: 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 7.5px; color: #000; background: #fff; }
  h1 { text-align: center; font-size: 13px; font-weight: bold; text-decoration: underline; color: #c00000; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 1.5px 3px; vertical-align: middle; font-size: 7px; }
  th { background: #d9d9d9; font-weight: bold; text-align: center; font-size: 7px; }
  .no-border td { border: none; }
  .section-header { background: #d9d9d9; font-weight: bold; text-align: center; font-size: 7px; }
  .label-cell { font-weight: bold; white-space: nowrap; font-size: 7px; }
  .value-cell { font-size: 7px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .red-bold { font-weight: bold; color: #c00000; font-size: 8px; }
  .small { font-size: 6.5px; }
  .notes-row td { height: 20px; vertical-align: top; }
  .tall-row td { height: 25px; vertical-align: top; }
  .sign-row td { height: 18px; }
</style>
</head>
<body>

<h1>Έντυπο Εντολής Εργασίας - Corrective WorkOrder</h1>

<!-- TOP HEADER TABLE -->
<table style="margin-bottom:2px;">
  <tr>
    <td colspan="4" style="border:1px solid #000;padding:1px 3px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="border:none;width:14%;font-weight:bold;font-size:7px;">Ημερομηνία</td>
          <td style="border:none;width:20%;font-size:7px;">${e(fd.date_of_work || '')}</td>
          <td style="border:none;width:14%;font-weight:bold;font-size:7px;">Συμπληρώθηκε από</td>
          <td style="border:none;width:20%;font-size:7px;">${e(fd.completed_by || '')}</td>
          <td style="border:none;width:14%;font-weight:bold;font-size:7px;color:#c00000;">INCIDENT NUMBER:</td>
          <td style="border:none;width:18%;font-weight:bold;font-size:7px;">${e(inc.incident_id || '')}</td>
        </tr>
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;">Αρ. Στάσης (ID)</td>
          <td style="border:none;font-size:7px;">${e(asset.asset_id || asset.asset_code || inc.related_asset_name || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Δήμος</td>
          <td style="border:none;font-size:7px;">${e(inc.municipality || asset.municipality || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;color:#c00000;">WORKORDER NUMBER:</td>
          <td style="border:none;font-weight:bold;font-size:7px;">${e(resolvedWorkOrderId || fd.work_order_ref || '')}</td>
        </tr>
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;">Επαρχία</td>
          <td style="border:none;font-size:7px;">${e(inc.province || asset.city || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Διεύθυνση</td>
          <td style="border:none;font-size:7px;">${e(inc.location_address || asset.location_address || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</td>
          <td style="border:none;font-size:7px;">${today}</td>
        </tr>
        <tr>
          <td style="border:none;font-weight:bold;font-size:7px;">Θερμοκρασία (°C)</td>
          <td style="border:none;font-size:7px;">${e(fd.temperature || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Καιρός</td>
          <td style="border:none;font-size:7px;">${e(fd.weather || '')}</td>
          <td style="border:none;font-weight:bold;font-size:7px;">Αποστολή φωτογραφιών στο πρόγραμμα? (Ναι/Όχι)</td>
          <td style="border:none;font-size:7px;">${e(fd.photos_sent || '')}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ΕΊΔΟΣ ΕΡΓΑΣΙΑΣ & ΕΛΕΓΧΟΣ -->
<table style="margin-bottom:2px;">
  <tr>
    <th colspan="6">Είδος Εργασίας (√)</th>
    <th colspan="6">Έλεγχος Εργασίας (√)</th>
  </tr>
  <tr>
    <td colspan="12">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <!-- Ομάδα Εργασίας -->
          <td style="border:1px solid #000;background:#d9d9d9;font-weight:bold;text-align:center;width:8%;">Ομάδα Εργασίας</td>
          <td style="border:1px solid #000;width:14%;">
            <table style="width:100%;border-collapse:collapse;border:none;">
              <tr><td style="border:none;font-size:7px;">Εργοδηγός</td><td style="border:none;font-size:7px;">${e(fd.foreman || '')}</td></tr>
              <tr><td style="border:none;font-size:7px;">Τεχνίτης1</td><td style="border:none;font-size:7px;">${e(fd.technician1 || '')}</td></tr>
              <tr><td style="border:none;font-size:7px;">Τεχνίτης2</td><td style="border:none;font-size:7px;">${e(fd.technician2 || '')}</td></tr>
              <tr><td style="border:none;font-size:7px;">Τεχνίτης3</td><td style="border:none;font-size:7px;">${e(fd.technician3 || '')}</td></tr>
            </table>
          </td>
          <td style="border:1px solid #000;background:#d9d9d9;font-weight:bold;text-align:center;width:8%;">Ονοματεπώνυμο</td>
          <td style="border:1px solid #000;width:8%;">
            <div style="height:10px;"></div><div style="height:10px;border-top:1px solid #ccc;"></div>
          </td>
          <td style="border:1px solid #000;background:#d9d9d9;font-weight:bold;text-align:center;width:4%;">Από</td>
          <td style="border:1px solid #000;width:6%;">${e(fd.work_from || '')}</td>
          <td style="border:1px solid #000;background:#d9d9d9;font-weight:bold;text-align:center;width:4%;">Έως</td>
          <td style="border:1px solid #000;width:6%;">${e(fd.work_to || '')}</td>
          <!-- Έλεγχος column -->
          <td style="border:1px solid #000;background:#d9d9d9;font-weight:bold;text-align:center;width:14%;">Ενδεδειγμένα Μέτρα Α&amp;Υ</td>
          <td style="border:1px solid #000;width:10%;">
            <div style="font-size:7px;">Συμπλήρωση Εργασίας</div>
            <div style="font-size:7px;">Καθαριότητα / Ταξινόμηση Χώρου</div>
            <div style="font-size:7px;">Διενέργεια Ποιοτικού Έλεγχου Εργασίας</div>
            <div style="font-size:7px;">Ελλείψεις / Ανάγκη για Επιστροφή</div>
          </td>
          <td style="border:1px solid #000;background:#d9d9d9;font-weight:bold;text-align:center;width:8%;">Ναι/Όχι</td>
          <td style="border:1px solid #000;width:10%;">
            <div style="font-size:7px;">${e(fd.hs_measures || '')}</div>
            <div style="font-size:7px;">${e(fd.work_completion || '')}</div>
            <div style="font-size:7px;">${e(fd.quality_check || '')}</div>
            <div style="font-size:7px;">${e(fd.deficiencies || '')}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- CHECKLIST TABLE -->
<table style="margin-bottom:2px;">
  <tr>
    <th colspan="12" style="background:#bdd7ee;font-size:8px;">Checklist Ελέγχου Στάσης/Στεγάστρου</th>
  </tr>
  <tr>
    <th style="width:3%;">N/A</th>
    <th style="width:10%;">Κατηγορία</th>
    <th style="width:13%;">Στοιχείο</th>
    <th style="width:5%;">Απαιτείται Εργασία (✓)</th>
    <th style="width:7%;">Κατάσταση</th>
    <th style="width:12%;">Σχόλια / Εργασία</th>
    <th style="width:3%;">N/A</th>
    <th style="width:10%;">Κατηγορία</th>
    <th style="width:13%;">Στοιχείο</th>
    <th style="width:5%;">Απαιτείται Εργασία (✓)</th>
    <th style="width:7%;">Κατάσταση</th>
    <th style="width:12%;">Σχόλια / Εργασία</th>
  </tr>

  <!-- Row 1: Δομική Κατασκευή + Αποθήκευση Ενέργειας -->
  <tr>
    <td class="center" rowspan="3">${chk(fd.structural_na)}</td>
    <td rowspan="3" class="bold">1) Δομική Κατασκευή</td>
    <td>Σκελετός/βάσεις</td>
    <td class="center">${chk(fd.structural_frame_check)}</td>
    <td>${e(fd.structural_frame_status || '')}</td>
    <td rowspan="3">${e(fd.structural_notes || '')}</td>
    <td class="center" rowspan="3">${chk(fd.energy_na)}</td>
    <td rowspan="3" class="bold">7) Αποθήκευση Ενέργειας</td>
    <td>Μπαταρίες/θήκη</td>
    <td class="center">${chk(fd.energy_battery_check)}</td>
    <td>${e(fd.energy_battery_status || '')}</td>
    <td rowspan="3">${e(fd.energy_notes || '')}</td>
  </tr>
  <tr>
    <td>Συνδέσεις/σταθερότητα</td>
    <td class="center">${chk(fd.structural_connections_check)}</td>
    <td>${e(fd.structural_connections_status || '')}</td>
    <td>Συνδέσεις/ασφάλεια</td>
    <td class="center">${chk(fd.energy_connections_check)}</td>
    <td>${e(fd.energy_connections_status || '')}</td>
  </tr>
  <tr>
    <td>Βαφή/επιφάνειες</td>
    <td class="center">${chk(fd.structural_paint_check)}</td>
    <td>${e(fd.structural_paint_status || '')}</td>
    <td>Αντικατάσταση/ Κλοπή</td>
    <td class="center">${chk(fd.energy_replacement_check)}</td>
    <td>${e(fd.energy_replacement_status || '')}</td>
  </tr>

  <!-- Row 2: Πάνελ & Περιμετρικά + Ηλεκτολογικό Πάνελ -->
  <tr>
    <td class="center" rowspan="3">${chk(fd.panels_na)}</td>
    <td rowspan="3" class="bold">2) Πάνελ &amp; Περιμετρικά</td>
    <td>Πλευρικά/οπίσθια πάνελ</td>
    <td class="center">${chk(fd.panels_side_check)}</td>
    <td>${e(fd.panels_side_status || '')}</td>
    <td rowspan="3">${e(fd.panels_notes || '')}</td>
    <td class="center" rowspan="3">${chk(fd.elec_panel_na)}</td>
    <td rowspan="3" class="bold">8) Ηλεκτολογικό Πάνελ</td>
    <td>Router/SIM</td>
    <td class="center">${chk(fd.elec_router_check)}</td>
    <td>${e(fd.elec_router_status || '')}</td>
    <td rowspan="3">${e(fd.elec_panel_notes || '')}</td>
  </tr>
  <tr>
    <td>Πλαστικά/ακρυλικά</td>
    <td class="center">${chk(fd.panels_plastic_check)}</td>
    <td>${e(fd.panels_plastic_status || '')}</td>
    <td>Controller</td>
    <td class="center">${chk(fd.elec_controller_check)}</td>
    <td>${e(fd.elec_controller_status || '')}</td>
  </tr>
  <tr>
    <td>Στεγάνωση/προστασία</td>
    <td class="center">${chk(fd.panels_sealing_check)}</td>
    <td>${e(fd.panels_sealing_status || '')}</td>
    <td>Power Supply</td>
    <td class="center">${chk(fd.elec_power_check)}</td>
    <td>${e(fd.elec_power_status || '')}</td>
  </tr>

  <!-- Row 3: Υαλοπίνακες + Φωτισμός -->
  <tr>
    <td class="center" rowspan="2">${chk(fd.glass_na)}</td>
    <td rowspan="2" class="bold">3) Υαλοπίνακες</td>
    <td>Γυάλινες επιφάνειες</td>
    <td class="center">${chk(fd.glass_surface_check)}</td>
    <td>${e(fd.glass_surface_status || '')}</td>
    <td rowspan="2">${e(fd.glass_notes || '')}</td>
    <td class="center" rowspan="2">${chk(fd.lighting_na)}</td>
    <td rowspan="2" class="bold">9) Φωτισμός</td>
    <td>Φωτισμός Στέγης</td>
    <td class="center">${chk(fd.lighting_roof_check)}</td>
    <td>${e(fd.lighting_roof_status || '')}</td>
    <td rowspan="2">${e(fd.lighting_notes || '')}</td>
  </tr>
  <tr>
    <td>Πλαίσια/στηρίξεις</td>
    <td class="center">${chk(fd.glass_frames_check)}</td>
    <td>${e(fd.glass_frames_status || '')}</td>
    <td>Υποδομής/Πινακιδας</td>
    <td class="center">${chk(fd.lighting_sign_check)}</td>
    <td>${e(fd.lighting_sign_status || '')}</td>
  </tr>

  <!-- Row 4: Παγκάκια + Λογισμικό Σύστημα -->
  <tr>
    <td class="center" rowspan="2">${chk(fd.bench_na)}</td>
    <td rowspan="2" class="bold">4) Παγκάκια</td>
    <td>Παγκάκι/Ξύλα</td>
    <td class="center">${chk(fd.bench_wood_check)}</td>
    <td>${e(fd.bench_wood_status || '')}</td>
    <td rowspan="2">${e(fd.bench_notes || '')}</td>
    <td class="center" rowspan="2">${chk(fd.software_na)}</td>
    <td rowspan="2" class="bold">10) Λογισμικό Σύστημα</td>
    <td>Λειτουργία φωτισμού</td>
    <td class="center">${chk(fd.software_lighting_check)}</td>
    <td>${e(fd.software_lighting_status || '')}</td>
    <td rowspan="2">${e(fd.software_notes || '')}</td>
  </tr>
  <tr>
    <td>Στηρίγματα/Μεταλλικά μέρη</td>
    <td class="center">${chk(fd.bench_supports_check)}</td>
    <td>${e(fd.bench_supports_status || '')}</td>
    <td>Κανονική λειτουργία</td>
    <td class="center">${chk(fd.software_normal_check)}</td>
    <td>${e(fd.software_normal_status || '')}</td>
  </tr>

  <!-- Row 5: Ηλεκτρική Υποδομή + Πρόσθετος Εξοπλισμός -->
  <tr>
    <td class="center" rowspan="3">${chk(fd.elec_infra_na)}</td>
    <td rowspan="3" class="bold">5) Ηλεκτρική Υποδομή</td>
    <td>Τροφοδοσία/πίνακας</td>
    <td class="center">${chk(fd.elec_power_panel_check)}</td>
    <td>${e(fd.elec_power_panel_status || '')}</td>
    <td rowspan="3">${e(fd.elec_infra_notes || '')}</td>
    <td class="center" rowspan="3">${chk(fd.extra_equip_na)}</td>
    <td rowspan="3" class="bold">11) Πρόσθετος Εξοπλισμός</td>
    <td>Δυσλειτουργία/έλεγχος</td>
    <td class="center">${chk(fd.extra_malfunction_check)}</td>
    <td>${e(fd.extra_malfunction_status || '')}</td>
    <td rowspan="3">${e(fd.extra_equip_notes || '')}</td>
  </tr>
  <tr>
    <td>Καλωδιώσεις/συνδέσεις</td>
    <td class="center">${chk(fd.elec_wiring_check)}</td>
    <td>${e(fd.elec_wiring_status || '')}</td>
    <td>Κάδος/βάσεις ποδηλ.</td>
    <td class="center">${chk(fd.extra_bin_check)}</td>
    <td>${e(fd.extra_bin_status || '')}</td>
  </tr>
  <tr>
    <td>Οθόνη/e-paper</td>
    <td class="center">${chk(fd.elec_screen_check)}</td>
    <td>${e(fd.elec_screen_status || '')}</td>
    <td>Πινακίδες</td>
    <td class="center">${chk(fd.extra_signs_check)}</td>
    <td>${e(fd.extra_signs_status || '')}</td>
  </tr>

  <!-- Row 6: Φωτοβολταϊκό Πάνελ + Στέγη -->
  <tr>
    <td class="center" rowspan="2">${chk(fd.solar_na)}</td>
    <td rowspan="2" class="bold">6) Φωτοβολταϊκό Πάνελ</td>
    <td>Πάνελ &amp; βάσεις</td>
    <td class="center">${chk(fd.solar_panel_check)}</td>
    <td>${e(fd.solar_panel_status || '')}</td>
    <td rowspan="2">${e(fd.solar_notes || '')}</td>
    <td class="center" rowspan="2">${chk(fd.roof_na)}</td>
    <td rowspan="2" class="bold">12) Στέγη</td>
    <td>Light Box</td>
    <td class="center">${chk(fd.roof_lightbox_check)}</td>
    <td>${e(fd.roof_lightbox_status || '')}</td>
    <td rowspan="2">${e(fd.roof_notes || '')}</td>
  </tr>
  <tr>
    <td>Ένδειξη λειτουργίας</td>
    <td class="center">${chk(fd.solar_indicator_check)}</td>
    <td>${e(fd.solar_indicator_status || '')}</td>
    <td>Πανέλα Καπακιών</td>
    <td class="center">${chk(fd.roof_panels_check)}</td>
    <td>${e(fd.roof_panels_status || '')}</td>
  </tr>
</table>

<!-- VEHICLES + PHOTOS + SECURITY BOTTOM TABLE -->
<table style="margin-bottom:2px;">
  <tr>
    <th colspan="4" style="width:32%;">Οχήματα και Εξοπλισμός</th>
    <th colspan="2" style="width:20%;">Είδος check</th>
    <th colspan="2" style="width:25%;">Ασφάλεια</th>
    <th colspan="2" style="width:23%;">Σχόλια</th>
  </tr>
  <tr>
    <td style="width:8%;" class="bold">Είδος</td>
    <td style="width:5%;" class="center bold">Actual</td>
    <td style="width:8%;" class="bold">Είδος</td>
    <td style="width:5%;" class="center bold">Actual</td>
    <td colspan="2" style="width:20%;">
      <div>${chk(fd.photo_inspection)} ΦΩΤΟΓΡΑΦΙΕΣ ΓΙΑ ΕΠΙΘΕΩΡΗΣΗ ΕΡΓΑΣΙΑΣ</div>
      <div>${chk(fd.photo_hs)} H&amp;S MEASURES (SIGNS)</div>
      <div>${chk(fd.photo_traffic)} TRAFFIC MANAGEMENT PHOTO</div>
    </td>
    <td style="width:12%;">Είδος</td>
    <td style="width:8%;" class="center">check</td>
    <td colspan="2" style="width:23%;">Σχόλια</td>
  </tr>
  <tr>
    <td>${chk(fd.veh_personnel)} Όχημα Μεταφοράς Προσωπικού</td>
    <td class="center">${chk(fd.veh_grinder)} Σμιρίλιο Χεριού</td>
    <td colspan="2"></td>
    <td colspan="2" rowspan="4"></td>
    <td>Ηλεκτρογεννήτρια</td><td class="center">${chk(fd.sec_generator)}</td>
    <td colspan="2" rowspan="4">${e(fd.security_notes || '')}</td>
  </tr>
  <tr>
    <td>${chk(fd.veh_materials)} Όχημα Μεταφοράς Υλικών και Εξοπλισμού</td>
    <td class="center">${chk(fd.veh_disc)} Διαμαντοδίσκος Κοπής</td>
    <td colspan="2"></td>
    <td>Ηλεκτρικός Σπαστήρας</td><td class="center">${chk(fd.sec_crusher)}</td>
  </tr>
  <tr>
    <td>${chk(fd.veh_truck)} Φορτηγό Όχημα</td>
    <td class="center">${chk(fd.veh_compressor)} Συμπιεστήρας</td>
    <td colspan="2"></td>
    <td>Φορτηγό Όχημα</td><td class="center">${chk(fd.sec_truck)}</td>
  </tr>
  <tr>
    <td>${chk(fd.veh_crane)} Γερανοφόρο Όχημα</td>
    <td colspan="3">${chk(fd.veh_other)} ΑΝ ΑΛΛΟ, ΑΝΈΛΥΣΕ: ${e(fd.veh_other_text || '')}</td>
    <td>Γερανοφόρο Όχημα</td><td class="center">${chk(fd.sec_crane)}</td>
  </tr>
</table>

<!-- NOTES SECTIONS -->
<table style="margin-bottom:2px;">
  <tr>
    <td colspan="12" class="section-header" style="background:#bdd7ee;">ΣΗΜΕΙΩΣΕΙΣ (Άλλα θέματα για αναφορά)</td>
  </tr>
  <tr><td colspan="12" style="height:16px;vertical-align:top;font-size:7px;">${e(fd.general_notes || '')}</td></tr>
  <tr>
    <td colspan="12" class="section-header" style="background:#bdd7ee;">ΣΥΓΚΕΚΡΙΜΕΝΕΣ ΕΡΓΑΣΙΕΣ(ΣΧΟΛΙΑ):</td>
  </tr>
  <tr>
    <td colspan="12">
      <table style="width:100%;border-collapse:collapse;border:none;">
        <tr>
          ${[1,2,3,4,5,6].map(i => `<td style="border:none;width:16%;font-size:7px;vertical-align:top;">${i}) ${e(fd['specific_work_'+i] || '')}</td>`).join('')}
        </tr>
        <tr>
          ${[7,8,9,10,11,12].map(i => `<td style="border:none;width:16%;font-size:7px;vertical-align:top;">${i}) ${e(fd['specific_work_'+i] || '')}</td>`).join('')}
        </tr>
      </table>
    </td>
  </tr>
</table>

<table style="margin-bottom:2px;">
  <tr>
    <td colspan="12" class="bold" style="font-size:7px;">Μη Συμπληρωμένη Εργασία - Ελλείψεις - Ανάγκη για Επιστροφή στο Σημείο (Αναλυτική Περιγραφή)</td>
  </tr>
  <tr><td colspan="12" style="height:18px;vertical-align:top;font-size:7px;">${e(fd.incomplete_reason || '')}</td></tr>
</table>

<table style="margin-bottom:2px;">
  <tr>
    <td colspan="12" class="bold" style="font-size:7px;">Επιπρόσθετες Εργασίες πέραν των Προβλεπομένων (Αναλυτική Περιγραφή)</td>
  </tr>
  <tr><td colspan="12" style="height:18px;vertical-align:top;font-size:7px;">${e(fd.additional_works || '')}</td></tr>
</table>

<!-- FOOTER CLOSURE -->
<table>
  <tr>
    <td style="width:30%;font-size:7px;"><span class="bold">Κλείσιμο WO:</span> ${chk(fd.close_wo_yes)} ΝΑΙ &nbsp; ${chk(fd.close_wo_no)} ΟΧΙ</td>
    <td style="width:40%;font-size:7px;"><span class="bold">Αν όχι, αιτιολόγησε:</span> ${e(fd.close_wo_reason || '')}</td>
    <td style="width:30%;font-size:7px;text-align:right;font-weight:bold;color:#c00000;text-decoration:underline;">ΟΝΟΜΑ ΥΠΟΓΡΑΦΉ:</td>
  </tr>
</table>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;

    const fileName = `CorrectiveWO_${inc.incident_id || 'form'}_${resolvedWorkOrderId || ''}.pdf`;
    return Response.json({ success: true, html, fileName });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});