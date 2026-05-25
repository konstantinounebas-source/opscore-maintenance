import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, Printer } from "lucide-react";
import { openHtmlPrintWindow } from "@/lib/printFormAsPDF";
import { generateWorkOrderId } from "@/lib/workOrderIdGenerator";

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h3 className="text-xs font-semibold text-slate-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded mb-2 uppercase tracking-wide">
      {title}
    </h3>
    <div className="px-1">{children}</div>
  </div>
);

const CheckRow = ({ label, fieldKey, form, set }) => (
  <div className="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
    <Checkbox checked={!!form[fieldKey]} onCheckedChange={v => set(fieldKey, v)} />
    <Label className="text-xs text-slate-700 cursor-pointer flex-1" onClick={() => set(fieldKey, !form[fieldKey])}>
      {label}
    </Label>
  </div>
);

const ChecklistRow = ({ category, items, notesKey, naKey, form, set }) => (
  <>
    {items.map((item, idx) => (
      <tr key={item.checkKey} className="border-b border-slate-100">
        {idx === 0 && (
          <>
            <td rowSpan={items.length} className="border border-slate-300 px-1 text-center align-middle">
              <Checkbox checked={!!form[naKey]} onCheckedChange={v => set(naKey, v)} />
            </td>
            <td rowSpan={items.length} className="border border-slate-300 px-1 font-semibold text-xs align-middle whitespace-nowrap">
              {category}
            </td>
          </>
        )}
        <td className="border border-slate-300 px-1 text-xs">{item.label}</td>
        <td className="border border-slate-300 px-1 text-center">
          <Checkbox checked={!!form[item.checkKey]} onCheckedChange={v => set(item.checkKey, v)} />
        </td>
        <td className="border border-slate-300 px-1">
          <Input className="h-5 text-xs border-0 p-0" value={form[item.statusKey] || ''} onChange={e => set(item.statusKey, e.target.value)} />
        </td>
        {idx === 0 && (
          <td rowSpan={items.length} className="border border-slate-300 px-1 align-top">
            <Textarea rows={items.length} className="text-xs min-h-0 border-0 p-0 resize-none" value={form[notesKey] || ''} onChange={e => set(notesKey, e.target.value)} />
          </td>
        )}
      </tr>
    ))}
  </>
);

const defaultData = {
  // Header
  date_of_work: "",
  completed_by: "",
  temperature: "",
  weather: "",
  photos_sent: "",
  // Personnel
  foreman: "",
  technician1: "",
  technician2: "",
  technician3: "",
  work_from: "",
  work_to: "",
  // Work quality checks
  hs_measures: "",
  work_completion: "",
  quality_check: "",
  deficiencies: "",
  // 1) Δομική Κατασκευή
  structural_na: false,
  structural_frame_check: false, structural_frame_status: "",
  structural_connections_check: false, structural_connections_status: "",
  structural_paint_check: false, structural_paint_status: "",
  structural_notes: "",
  // 2) Πάνελ & Περιμετρικά
  panels_na: false,
  panels_side_check: false, panels_side_status: "",
  panels_plastic_check: false, panels_plastic_status: "",
  panels_sealing_check: false, panels_sealing_status: "",
  panels_notes: "",
  // 3) Υαλοπίνακες
  glass_na: false,
  glass_surface_check: false, glass_surface_status: "",
  glass_frames_check: false, glass_frames_status: "",
  glass_notes: "",
  // 4) Παγκάκια
  bench_na: false,
  bench_wood_check: false, bench_wood_status: "",
  bench_supports_check: false, bench_supports_status: "",
  bench_notes: "",
  // 5) Ηλεκτρική Υποδομή
  elec_infra_na: false,
  elec_power_panel_check: false, elec_power_panel_status: "",
  elec_wiring_check: false, elec_wiring_status: "",
  elec_screen_check: false, elec_screen_status: "",
  elec_infra_notes: "",
  // 6) Φωτοβολταϊκό Πάνελ
  solar_na: false,
  solar_panel_check: false, solar_panel_status: "",
  solar_indicator_check: false, solar_indicator_status: "",
  solar_notes: "",
  // 7) Αποθήκευση Ενέργειας
  energy_na: false,
  energy_battery_check: false, energy_battery_status: "",
  energy_connections_check: false, energy_connections_status: "",
  energy_replacement_check: false, energy_replacement_status: "",
  energy_notes: "",
  // 8) Ηλεκτολογικό Πάνελ
  elec_panel_na: false,
  elec_router_check: false, elec_router_status: "",
  elec_controller_check: false, elec_controller_status: "",
  elec_power_check: false, elec_power_status: "",
  elec_panel_notes: "",
  // 9) Φωτισμός
  lighting_na: false,
  lighting_roof_check: false, lighting_roof_status: "",
  lighting_sign_check: false, lighting_sign_status: "",
  lighting_notes: "",
  // 10) Λογισμικό Σύστημα
  software_na: false,
  software_lighting_check: false, software_lighting_status: "",
  software_normal_check: false, software_normal_status: "",
  software_notes: "",
  // 11) Πρόσθετος Εξοπλισμός
  extra_equip_na: false,
  extra_malfunction_check: false, extra_malfunction_status: "",
  extra_bin_check: false, extra_bin_status: "",
  extra_signs_check: false, extra_signs_status: "",
  extra_equip_notes: "",
  // 12) Στέγη
  roof_na: false,
  roof_lightbox_check: false, roof_lightbox_status: "",
  roof_panels_check: false, roof_panels_status: "",
  roof_notes: "",
  // Vehicles
  veh_personnel: false, veh_materials: false, veh_truck: false, veh_crane: false,
  veh_grinder: false, veh_disc: false, veh_compressor: false, veh_other: false, veh_other_text: "",
  // Photos
  photo_inspection: false, photo_hs: false, photo_traffic: false,
  // Security
  sec_generator: false, sec_crusher: false, sec_truck: false, sec_crane: false,
  security_notes: "",
  // Notes & Works
  general_notes: "",
  specific_work_1: "", specific_work_2: "", specific_work_3: "",
  specific_work_4: "", specific_work_5: "", specific_work_6: "",
  specific_work_7: "", specific_work_8: "", specific_work_9: "",
  specific_work_10: "", specific_work_11: "", specific_work_12: "",
  incomplete_reason: "",
  additional_works: "",
  // Closure
  close_wo_yes: false, close_wo_no: false, close_wo_reason: "",
  work_order_ref: "",
};

export default function CorrectiveWOForm({ submission, incident, incidentId, workOrders, onClose }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printingPDF, setPrintingPDF] = useState(false);

  const existingData = submission?.form_data || {};
  const [form, setForm] = useState({ ...defaultData, ...existingData });
  const [corrId, setCorrId] = useState(existingData.corr_id || "");

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!existingData.corr_id) {
      generateWorkOrderId("corrective").then(id => setCorrId(id));
    }
  }, []);

  const getWorkOrderRef = () => {
    if (form.work_order_ref) return form.work_order_ref;
    const wo = workOrders?.find(w => w.incident_id === incidentId && w.work_order_type === "corrective");
    return wo?.work_order_id || "";
  };

  const buildPayload = (status) => ({
    form_type: "corrective_wo_checklist",
    form_name: "Corrective Work Order Checklist",
    incident_id: incidentId,
    asset_id: incident?.related_asset_id || "",
    status,
    form_data: { ...form, work_order_ref: form.work_order_ref || getWorkOrderRef(), corr_id: corrId },
  });

  const handleSave = async () => {
    setSaving(true);
    if (submission?.id) {
      await base44.entities.FormSubmissions.update(submission.id, buildPayload("Draft"));
    } else {
      await base44.entities.FormSubmissions.create(buildPayload("Draft"));
    }
    setSaving(false);
    toast({ title: "Saved as draft" });
  };

  const handlePrintPDF = async () => {
    setPrintingPDF(true);
    try {
      const res = await base44.functions.invoke('generateCorrectiveWOChecklistPDF', {
        incidentId: incident?.incident_id || incidentId,
        workOrderId: form.work_order_ref || getWorkOrderRef(),
        formData: { ...form, corr_id: corrId },
      });
      if (res.data?.html) {
        openHtmlPrintWindow(res.data.html, res.data.fileName || 'CorrectiveWO.pdf');
      } else {
        toast({ title: "PDF Error", description: res.data?.error || "Failed to generate PDF", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "PDF Error", description: err.message, variant: "destructive" });
    }
    setPrintingPDF(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = { ...buildPayload("Submitted"), submitted_at: new Date().toISOString() };
    const result = submission?.id
      ? await base44.entities.FormSubmissions.update(submission.id, payload)
      : await base44.entities.FormSubmissions.create(payload);
    
    // Auto-generate PDF and attach to incident evidence
    try {
      const user = await base44.auth.me();
      const pdfRes = await base44.functions.invoke('generateCorrectiveWOChecklistPDF', {
        incidentId: incident?.incident_id || incidentId,
        workOrderId: form.work_order_ref || getWorkOrderRef(),
        formData: { ...form, corr_id: corrId },
      });
      const { html, fileName } = pdfRes.data;
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], fileName.replace('.pdf', '_CorrectiveWO_Report.html'), { type: 'text/html' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.IncidentAttachments.create({
        incident_id: incidentId,
        file_url,
        file_name: fileName.replace('.pdf', '_CorrectiveWO_Report.html'),
        file_type: "Document",
        uploaded_by: user?.email,
      });
      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "Corrective WO PDF Generated",
        details: `Corrective WO Checklist PDF report automatically generated and attached.`,
        user: user?.email,
        attachments: [file_url],
        attachment_names: [fileName.replace('.pdf', '_CorrectiveWO_Report.html')],
      });
    } catch (pdfErr) {
      console.warn("Corrective WO PDF auto-attach failed:", pdfErr?.message);
    }
    
    setSubmitting(false);
    toast({ title: "Form submitted successfully" });
    onClose();
  };

  const woRef = form.work_order_ref || getWorkOrderRef();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-800">Corrective Work Order Checklist</h2>
            {corrId && (
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {corrId}
              </span>
            )}
          </div>
          {incident && (
            <p className="text-xs text-slate-500 mt-0.5">
              Incident: {incident.incident_id} — {incident.title}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">

        {/* ΣΤΟΙΧΕΙΑ */}
        <Section title="ΣΤΟΙΧΕΙΑ">
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs text-slate-500 mb-1 block">Ημερομηνία</Label>
              <Input type="date" value={form.date_of_work} onChange={e => set("date_of_work", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Συμπληρώθηκε από</Label>
              <Input value={form.completed_by} onChange={e => set("completed_by", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Θερμοκρασία (°C)</Label>
              <Input value={form.temperature} onChange={e => set("temperature", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Καιρός</Label>
              <Input value={form.weather} onChange={e => set("weather", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Αποστολή φωτογραφιών στο πρόγραμμα; (Ναι/Όχι)</Label>
              <Input value={form.photos_sent} onChange={e => set("photos_sent", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3 bg-slate-50 p-2 rounded border border-slate-200">
            <div><Label className="text-xs text-slate-500 mb-1 block font-semibold">Εργοδηγός</Label>
              <Input value={form.foreman} onChange={e => set("foreman", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Τεχνίτης 1</Label>
              <Input value={form.technician1} onChange={e => set("technician1", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Τεχνίτης 2</Label>
              <Input value={form.technician2} onChange={e => set("technician2", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Τεχνίτης 3</Label>
              <Input value={form.technician3} onChange={e => set("technician3", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Από (ώρα)</Label>
              <Input value={form.work_from} onChange={e => set("work_from", e.target.value)} /></div>
            <div><Label className="text-xs text-slate-500 mb-1 block">Έως (ώρα)</Label>
              <Input value={form.work_to} onChange={e => set("work_to", e.target.value)} /></div>
          </div>
        </Section>

        {/* Έλεγχος Εργασίας */}
        <Section title="Έλεγχος Εργασίας (Ναι/Όχι)">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Ενδεδειγμένα Μέτρα Α&Υ", key: "hs_measures" },
              { label: "Συμπλήρωση Εργασίας", key: "work_completion" },
              { label: "Διενέργεια Ποιοτικού Έλεγχου Εργασίας", key: "quality_check" },
              { label: "Ελλείψεις / Ανάγκη για Επιστροφή", key: "deficiencies" },
            ].map(({ label, key }) => (
              <div key={key}>
                <Label className="text-xs text-slate-500 mb-1 block">{label}</Label>
                <Input value={form[key]} onChange={e => set(key, e.target.value)} placeholder="Ναι/Όχι" />
              </div>
            ))}
          </div>
        </Section>

        {/* CHECKLIST */}
        <Section title="Checklist Ελέγχου Στάσης/Στεγάστρου">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-slate-300 px-1 py-1 w-8">N/A</th>
                  <th className="border border-slate-300 px-1 py-1">Κατηγορία</th>
                  <th className="border border-slate-300 px-1 py-1">Στοιχείο</th>
                  <th className="border border-slate-300 px-1 py-1 w-12">Εργασία ✓</th>
                  <th className="border border-slate-300 px-1 py-1 w-20">Κατάσταση</th>
                  <th className="border border-slate-300 px-1 py-1">Σχόλια</th>
                </tr>
              </thead>
              <tbody>
                <ChecklistRow category="1) Δομική Κατασκευή" naKey="structural_na" notesKey="structural_notes" form={form} set={set}
                  items={[
                    { label: "Σκελετός/βάσεις", checkKey: "structural_frame_check", statusKey: "structural_frame_status" },
                    { label: "Συνδέσεις/σταθερότητα", checkKey: "structural_connections_check", statusKey: "structural_connections_status" },
                    { label: "Βαφή/επιφάνειες", checkKey: "structural_paint_check", statusKey: "structural_paint_status" },
                  ]} />
                <ChecklistRow category="2) Πάνελ & Περιμετρικά" naKey="panels_na" notesKey="panels_notes" form={form} set={set}
                  items={[
                    { label: "Πλευρικά/οπίσθια πάνελ", checkKey: "panels_side_check", statusKey: "panels_side_status" },
                    { label: "Πλαστικά/ακρυλικά", checkKey: "panels_plastic_check", statusKey: "panels_plastic_status" },
                    { label: "Στεγάνωση/προστασία", checkKey: "panels_sealing_check", statusKey: "panels_sealing_status" },
                  ]} />
                <ChecklistRow category="3) Υαλοπίνακες" naKey="glass_na" notesKey="glass_notes" form={form} set={set}
                  items={[
                    { label: "Γυάλινες επιφάνειες", checkKey: "glass_surface_check", statusKey: "glass_surface_status" },
                    { label: "Πλαίσια/στηρίξεις", checkKey: "glass_frames_check", statusKey: "glass_frames_status" },
                  ]} />
                <ChecklistRow category="4) Παγκάκια" naKey="bench_na" notesKey="bench_notes" form={form} set={set}
                  items={[
                    { label: "Παγκάκι/Ξύλα", checkKey: "bench_wood_check", statusKey: "bench_wood_status" },
                    { label: "Στηρίγματα/Μεταλλικά μέρη", checkKey: "bench_supports_check", statusKey: "bench_supports_status" },
                  ]} />
                <ChecklistRow category="5) Ηλεκτρική Υποδομή" naKey="elec_infra_na" notesKey="elec_infra_notes" form={form} set={set}
                  items={[
                    { label: "Τροφοδοσία/πίνακας", checkKey: "elec_power_panel_check", statusKey: "elec_power_panel_status" },
                    { label: "Καλωδιώσεις/συνδέσεις", checkKey: "elec_wiring_check", statusKey: "elec_wiring_status" },
                    { label: "Οθόνη/e-paper", checkKey: "elec_screen_check", statusKey: "elec_screen_status" },
                  ]} />
                <ChecklistRow category="6) Φωτοβολταϊκό Πάνελ" naKey="solar_na" notesKey="solar_notes" form={form} set={set}
                  items={[
                    { label: "Πάνελ & βάσεις", checkKey: "solar_panel_check", statusKey: "solar_panel_status" },
                    { label: "Ένδειξη λειτουργίας", checkKey: "solar_indicator_check", statusKey: "solar_indicator_status" },
                  ]} />
                <ChecklistRow category="7) Αποθήκευση Ενέργειας" naKey="energy_na" notesKey="energy_notes" form={form} set={set}
                  items={[
                    { label: "Μπαταρίες/θήκη", checkKey: "energy_battery_check", statusKey: "energy_battery_status" },
                    { label: "Συνδέσεις/ασφάλεια", checkKey: "energy_connections_check", statusKey: "energy_connections_status" },
                    { label: "Αντικατάσταση/Κλοπή", checkKey: "energy_replacement_check", statusKey: "energy_replacement_status" },
                  ]} />
                <ChecklistRow category="8) Ηλεκτολογικό Πάνελ" naKey="elec_panel_na" notesKey="elec_panel_notes" form={form} set={set}
                  items={[
                    { label: "Router/SIM", checkKey: "elec_router_check", statusKey: "elec_router_status" },
                    { label: "Controller", checkKey: "elec_controller_check", statusKey: "elec_controller_status" },
                    { label: "Power Supply", checkKey: "elec_power_check", statusKey: "elec_power_status" },
                  ]} />
                <ChecklistRow category="9) Φωτισμός" naKey="lighting_na" notesKey="lighting_notes" form={form} set={set}
                  items={[
                    { label: "Φωτισμός Στέγης", checkKey: "lighting_roof_check", statusKey: "lighting_roof_status" },
                    { label: "Υποδομής/Πινακιδας", checkKey: "lighting_sign_check", statusKey: "lighting_sign_status" },
                  ]} />
                <ChecklistRow category="10) Λογισμικό Σύστημα" naKey="software_na" notesKey="software_notes" form={form} set={set}
                  items={[
                    { label: "Λειτουργία φωτισμού", checkKey: "software_lighting_check", statusKey: "software_lighting_status" },
                    { label: "Κανονική λειτουργία", checkKey: "software_normal_check", statusKey: "software_normal_status" },
                  ]} />
                <ChecklistRow category="11) Πρόσθετος Εξοπλισμός" naKey="extra_equip_na" notesKey="extra_equip_notes" form={form} set={set}
                  items={[
                    { label: "Δυσλειτουργία/έλεγχος", checkKey: "extra_malfunction_check", statusKey: "extra_malfunction_status" },
                    { label: "Κάδος/βάσεις ποδηλ.", checkKey: "extra_bin_check", statusKey: "extra_bin_status" },
                    { label: "Πινακίδες", checkKey: "extra_signs_check", statusKey: "extra_signs_status" },
                  ]} />
                <ChecklistRow category="12) Στέγη" naKey="roof_na" notesKey="roof_notes" form={form} set={set}
                  items={[
                    { label: "Light Box", checkKey: "roof_lightbox_check", statusKey: "roof_lightbox_status" },
                    { label: "Πανέλα Καπακιών", checkKey: "roof_panels_check", statusKey: "roof_panels_status" },
                  ]} />
              </tbody>
            </table>
          </div>
        </Section>

        {/* Vehicles & Equipment */}
        <Section title="Οχήματα και Εξοπλισμός">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Οχήματα</p>
              {[
                { label: "Όχημα Μεταφοράς Προσωπικού", key: "veh_personnel" },
                { label: "Όχημα Μεταφοράς Υλικών και Εξοπλισμού", key: "veh_materials" },
                { label: "Φορτηγό Όχημα", key: "veh_truck" },
                { label: "Γερανοφόρο Όχημα", key: "veh_crane" },
              ].map(({ label, key }) => <CheckRow key={key} label={label} fieldKey={key} form={form} set={set} />)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Εργαλεία/Εξοπλισμός</p>
              {[
                { label: "Σμιρίλιο Χεριού", key: "veh_grinder" },
                { label: "Διαμαντοδίσκος Κοπής", key: "veh_disc" },
                { label: "Συμπιεστήρας", key: "veh_compressor" },
                { label: "Άλλο", key: "veh_other" },
              ].map(({ label, key }) => <CheckRow key={key} label={label} fieldKey={key} form={form} set={set} />)}
              {form.veh_other && <Input className="mt-1 text-xs" value={form.veh_other_text} onChange={e => set("veh_other_text", e.target.value)} placeholder="Περιγραφή..." />}
            </div>
          </div>
        </Section>

        {/* Photos */}
        <Section title="Φωτογραφίες">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "ΦΩΤΟΓΡΑΦΙΕΣ ΓΙΑ ΕΠΙΘΕΩΡΗΣΗ ΕΡΓΑΣΙΑΣ", key: "photo_inspection" },
              { label: "H&S MEASURES (SIGNS)", key: "photo_hs" },
              { label: "TRAFFIC MANAGEMENT PHOTO", key: "photo_traffic" },
            ].map(({ label, key }) => <CheckRow key={key} label={label} fieldKey={key} form={form} set={set} />)}
          </div>
        </Section>

        {/* Security */}
        <Section title="Ασφάλεια">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Ηλεκτρογεννήτρια", key: "sec_generator" },
              { label: "Ηλεκτρικός Σπαστήρας", key: "sec_crusher" },
              { label: "Φορτηγό Όχημα", key: "sec_truck" },
              { label: "Γερανοφόρο Όχημα", key: "sec_crane" },
            ].map(({ label, key }) => <CheckRow key={key} label={label} fieldKey={key} form={form} set={set} />)}
          </div>
          <Textarea className="mt-2 text-xs" rows={2} value={form.security_notes} onChange={e => set("security_notes", e.target.value)} placeholder="Σχόλια ασφάλειας..." />
        </Section>

        {/* Notes */}
        <Section title="ΣΗΜΕΙΩΣΕΙΣ (Άλλα θέματα για αναφορά)">
          <Textarea rows={2} className="text-xs" value={form.general_notes} onChange={e => set("general_notes", e.target.value)} placeholder="Γενικές σημειώσεις..." />
        </Section>

        <Section title="ΣΥΓΚΕΚΡΙΜΕΝΕΣ ΕΡΓΑΣΙΕΣ (ΣΧΟΛΙΑ)">
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
              <div key={i}>
                <Label className="text-xs text-slate-500 mb-1 block">{i})</Label>
                <Input className="text-xs" value={form[`specific_work_${i}`] || ''} onChange={e => set(`specific_work_${i}`, e.target.value)} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Μη Συμπληρωμένη Εργασία - Ελλείψεις - Ανάγκη για Επιστροφή">
          <Textarea rows={2} className="text-xs" value={form.incomplete_reason} onChange={e => set("incomplete_reason", e.target.value)} placeholder="Αναλυτική Περιγραφή..." />
        </Section>

        <Section title="Επιπρόσθετες Εργασίες πέραν των Προβλεπομένων">
          <Textarea rows={2} className="text-xs" value={form.additional_works} onChange={e => set("additional_works", e.target.value)} placeholder="Αναλυτική Περιγραφή..." />
        </Section>

        {/* Closure */}
        <Section title="Κλείσιμο WO">
          <div className="flex items-center gap-6 mb-3">
            <Label className="text-sm font-semibold text-slate-700">Κλείσιμο WO:</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="close_wo" checked={!!form.close_wo_yes} onChange={() => { set("close_wo_yes", true); set("close_wo_no", false); }} />
              <span className="text-sm font-medium text-green-700">ΝΑΙ</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="close_wo" checked={!!form.close_wo_no} onChange={() => { set("close_wo_yes", false); set("close_wo_no", true); }} />
              <span className="text-sm font-medium text-red-700">ΟΧΙ</span>
            </label>
          </div>
          {form.close_wo_no && (
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Αν όχι, αιτιολόγησε:</Label>
              <Textarea rows={2} className="text-xs" value={form.close_wo_reason} onChange={e => set("close_wo_reason", e.target.value)} />
            </div>
          )}
        </Section>

      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
        <Button variant="outline" onClick={onClose}>Άκυρο</Button>
        <Button variant="outline" onClick={handlePrintPDF} disabled={printingPDF} className="gap-1.5">
          <Printer className="w-4 h-4" /> {printingPDF ? "..." : "PDF"}
        </Button>
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Αποθήκευση Draft
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Υποβολή
        </Button>
      </div>
    </div>
  );
}