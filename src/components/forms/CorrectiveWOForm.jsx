import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, Printer, Save, Send } from "lucide-react";
import { openHtmlPrintWindow } from "@/lib/printFormAsPDF";
import { generateWorkOrderId } from "@/lib/workOrderIdGenerator";

// ── PDF-style primitives ──────────────────────────────────────────────────────

function PdfSection({ title, blue, children }) {
  return (
    <div className="border border-black">
      <div className={`px-2 py-1 font-bold text-xs uppercase tracking-wide border-b border-black ${blue ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-900"}`}>
        {title}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <span className="font-bold text-xs text-gray-800 whitespace-nowrap">{children}</span>;
}

function EditableField({ value, onChange, placeholder, type = "text", className }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border-b border-gray-400 bg-transparent text-xs text-gray-900 outline-none focus:border-blue-500 px-1 w-full ${className || ""}`}
    />
  );
}

function EditableTextarea({ value, onChange, placeholder, rows = 2, className }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`border border-gray-300 bg-white text-xs text-gray-900 outline-none focus:border-blue-500 px-1 w-full resize-none ${className || ""}`}
    />
  );
}

function ChkBox({ checked, onChange, label, className }) {
  return (
    <label className={`flex items-center gap-1 cursor-pointer ${className || ""}`}>
      <span
        onClick={() => onChange(!checked)}
        className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0 cursor-pointer text-xs font-bold select-none
          ${checked ? "bg-gray-800 border-gray-800 text-white" : "bg-white border-gray-500"}`}
      >
        {checked ? "✓" : ""}
      </span>
      {label && <span className="text-xs text-gray-800 leading-tight">{label}</span>}
    </label>
  );
}

// ── Checklist table row (mirrors PDF layout) ──────────────────────────────────
function ChecklistRow({ category, items, notesKey, naKey, form, set }) {
  return (
    <>
      {items.map((item, idx) => (
        <tr key={item.checkKey} className="border-b border-gray-200">
          {idx === 0 && (
            <>
              <td rowSpan={items.length} className="border border-gray-400 px-1 text-center align-middle w-8">
                <ChkBox checked={!!form[naKey]} onChange={v => set(naKey, v)} />
              </td>
              <td rowSpan={items.length} className="border border-gray-400 px-1 font-bold text-xs align-middle whitespace-nowrap">
                {category}
              </td>
            </>
          )}
          <td className="border border-gray-400 px-1 text-xs">{item.label}</td>
          <td className="border border-gray-400 px-1 text-center w-10">
            <ChkBox checked={!!form[item.checkKey]} onChange={v => set(item.checkKey, v)} />
          </td>
          <td className="border border-gray-400 px-1 w-20">
            <input className="w-full text-xs border-0 bg-transparent outline-none focus:bg-blue-50 px-0.5"
              value={form[item.statusKey] || ''} onChange={e => set(item.statusKey, e.target.value)} />
          </td>
          {idx === 0 && (
            <td rowSpan={items.length} className="border border-gray-400 px-1 align-top">
              <textarea rows={items.length} className="text-xs border-0 bg-transparent outline-none w-full resize-none focus:bg-blue-50"
                value={form[notesKey] || ''} onChange={e => set(notesKey, e.target.value)} />
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

// ── Default state (imported from shared schema) ───────────────────────────────
import { correctiveDefaultData as defaultData } from "@/lib/formSchemas";

// ── Main Component ────────────────────────────────────────────────────────────
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

  const getWorkOrderRef = () => corrId || form.work_order_ref || "";

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
    if (submission?.id) { await base44.entities.FormSubmissions.update(submission.id, buildPayload("Draft")); }
    else { await base44.entities.FormSubmissions.create(buildPayload("Draft")); }
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
      if (res.data?.html) { openHtmlPrintWindow(res.data.html, res.data.fileName || 'CorrectiveWO.pdf'); }
      else { toast({ title: "PDF Error", description: res.data?.error || "Failed", variant: "destructive" }); }
    } catch (err) { toast({ title: "PDF Error", description: err.message, variant: "destructive" }); }
    setPrintingPDF(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = { ...buildPayload("Submitted"), submitted_at: new Date().toISOString() };
    const result = submission?.id
      ? await base44.entities.FormSubmissions.update(submission.id, payload)
      : await base44.entities.FormSubmissions.create(payload);



    setSubmitting(false);
    toast({ title: "Form submitted successfully" });
    onClose();
  };

  const woRef = form.work_order_ref || getWorkOrderRef();

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-red-800 uppercase">Corrective Work Order Checklist</h2>
            {corrId && (
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {corrId}
              </span>
            )}
          </div>
          {incident && (
            <p className="text-xs text-gray-500 mt-0.5">Incident: {incident.incident_id} — {incident.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintPDF} disabled={printingPDF} className="gap-1 text-xs h-7">
            <Printer className="w-3 h-3" /> {printingPDF ? "..." : "PDF / Εκτύπωση"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1 text-xs h-7">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Draft
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1 text-xs h-7 bg-indigo-600 hover:bg-indigo-700">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Υποβολή
          </Button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Form body: print-style ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto bg-white border border-gray-300 shadow p-3 font-sans space-y-1">

          {/* Title */}
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold underline text-red-800">Έντυπο Εντολής Εργασίας - Corrective WorkOrder</h2>
          </div>

          {/* ── Header info table ── */}
          <div className="border border-gray-400 p-2 mb-1">
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Ημερομηνία:</td>
                  <td className="pr-4 py-0.5"><EditableField type="date" value={form.date_of_work} onChange={v => set("date_of_work", v)} /></td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Συμπληρώθηκε από:</td>
                  <td className="pr-4 py-0.5"><EditableField value={form.completed_by} onChange={v => set("completed_by", v)} /></td>
                  <td className="pr-2 py-0.5 font-bold text-red-700 whitespace-nowrap">INCIDENT NUMBER:</td>
                  <td className="py-0.5 font-bold">{incident?.incident_id || incidentId}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Αρ. Στάσης (ID):</td>
                  <td className="pr-4 py-0.5 text-gray-700">{incident?.related_asset_name || ""}</td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Δήμος:</td>
                  <td className="pr-4 py-0.5 text-gray-700">{incident?.municipality || ""}</td>
                  <td className="pr-2 py-0.5 font-bold text-red-700 whitespace-nowrap">WORKORDER NUMBER:</td>
                  <td className="py-0.5 font-bold">{woRef}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Επαρχία:</td>
                  <td className="pr-4 py-0.5 text-gray-700">{incident?.province || ""}</td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Διεύθυνση:</td>
                  <td className="pr-4 py-0.5 text-gray-700">{incident?.location_address || ""}</td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ:</td>
                  <td className="py-0.5 text-gray-700">{new Date().toLocaleDateString('el-GR')}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Θερμοκρασία (°C):</td>
                  <td className="pr-4 py-0.5"><EditableField value={form.temperature} onChange={v => set("temperature", v)} /></td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Καιρός:</td>
                  <td className="pr-4 py-0.5"><EditableField value={form.weather} onChange={v => set("weather", v)} /></td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap text-xs">Αποστολή φωτ. στο πρόγραμμα;</td>
                  <td className="py-0.5"><EditableField value={form.photos_sent} onChange={v => set("photos_sent", v)} placeholder="Ναι/Όχι" /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Ομάδα Εργασίας + Έλεγχος ── */}
          <div className="border border-gray-400">
            <div className="grid grid-cols-2 border-b border-gray-400">
              <div className="px-2 py-1 font-bold text-xs text-center bg-gray-200 border-r border-gray-400">Ομάδα Εργασίας</div>
              <div className="px-2 py-1 font-bold text-xs text-center bg-gray-200">Έλεγχος Εργασίας (Ναι/Όχι)</div>
            </div>
            <div className="grid grid-cols-2">
              {/* Left: Personnel */}
              <div className="border-r border-gray-400 p-2">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  {[
                    ["Εργοδηγός", "foreman"],
                    ["Τεχνίτης 1", "technician1"],
                    ["Τεχνίτης 2", "technician2"],
                    ["Τεχνίτης 3", "technician3"],
                  ].map(([label, key]) => (
                    <React.Fragment key={key}>
                      <span className="font-bold text-gray-700">{label}:</span>
                      <EditableField value={form[key]} onChange={v => set(key, v)} />
                    </React.Fragment>
                  ))}
                  <span className="font-bold text-gray-700">Από (ώρα):</span>
                  <EditableField value={form.work_from} onChange={v => set("work_from", v)} />
                  <span className="font-bold text-gray-700">Έως (ώρα):</span>
                  <EditableField value={form.work_to} onChange={v => set("work_to", v)} />
                </div>
              </div>
              {/* Right: Quality checks */}
              <div className="p-2">
                <div className="space-y-1 text-xs">
                  {[
                    ["Ενδεδειγμένα Μέτρα Α&Υ", "hs_measures"],
                    ["Συμπλήρωση Εργασίας", "work_completion"],
                    ["Διενέργεια Ποιοτικού Έλεγχου", "quality_check"],
                    ["Ελλείψεις / Ανάγκη για Επιστροφή", "deficiencies"],
                  ].map(([label, key]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="font-bold text-gray-700 w-48 flex-shrink-0">{label}:</span>
                      <EditableField value={form[key]} onChange={v => set(key, v)} placeholder="Ναι/Όχι" className="w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Checklist Table ── */}
          <PdfSection title="Checklist Ελέγχου Στάσης/Στεγάστρου" blue>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-400 px-1 py-1 w-8">N/A</th>
                    <th className="border border-gray-400 px-1 py-1">Κατηγορία</th>
                    <th className="border border-gray-400 px-1 py-1">Στοιχείο</th>
                    <th className="border border-gray-400 px-1 py-1 w-12">Εργασία ✓</th>
                    <th className="border border-gray-400 px-1 py-1 w-20">Κατάσταση</th>
                    <th className="border border-gray-400 px-1 py-1">Σχόλια</th>
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
          </PdfSection>

          {/* ── Vehicles + Photos + Security ── */}
          <div className="border border-gray-400">
            <div className="grid grid-cols-3 border-b border-gray-400 bg-gray-200">
              <div className="px-2 py-1 font-bold text-xs text-center border-r border-gray-400">Οχήματα και Εξοπλισμός</div>
              <div className="px-2 py-1 font-bold text-xs text-center border-r border-gray-400">Είδος check</div>
              <div className="px-2 py-1 font-bold text-xs text-center">Ασφάλεια</div>
            </div>
            <div className="grid grid-cols-3 text-xs">
              {/* Vehicles */}
              <div className="border-r border-gray-400 p-2 space-y-0.5">
                <p className="font-bold text-gray-700 text-xs mb-1">Οχήματα:</p>
                {[
                  ["Όχημα Μεταφοράς Προσωπικού", "veh_personnel"],
                  ["Όχημα Μεταφοράς Υλικών και Εξοπλισμού", "veh_materials"],
                  ["Φορτηγό Όχημα", "veh_truck"],
                  ["Γερανοφόρο Όχημα", "veh_crane"],
                ].map(([label, key]) => <ChkBox key={key} checked={!!form[key]} onChange={v => set(key, v)} label={label} />)}
                <p className="font-bold text-gray-700 text-xs mt-1 mb-1">Εργαλεία/Εξοπλισμός:</p>
                {[
                  ["Σμιρίλιο Χεριού", "veh_grinder"],
                  ["Διαμαντοδίσκος Κοπής", "veh_disc"],
                  ["Συμπιεστήρας", "veh_compressor"],
                  ["Άλλο", "veh_other"],
                ].map(([label, key]) => <ChkBox key={key} checked={!!form[key]} onChange={v => set(key, v)} label={label} />)}
                {form.veh_other && <Input className="mt-1 h-6 text-xs" value={form.veh_other_text} onChange={e => set("veh_other_text", e.target.value)} placeholder="Περιγραφή..." />}
              </div>
              {/* Photos */}
              <div className="border-r border-gray-400 p-2 space-y-0.5">
                <p className="font-bold text-gray-700 mb-1">Φωτογραφίες:</p>
                <ChkBox checked={!!form.photo_inspection} onChange={v => set("photo_inspection", v)} label="ΦΩΤΟΓΡΑΦΙΕΣ ΓΙΑ ΕΠΙΘΕΩΡΗΣΗ ΕΡΓΑΣΙΑΣ" />
                <ChkBox checked={!!form.photo_hs} onChange={v => set("photo_hs", v)} label="H&S MEASURES (SIGNS)" />
                <ChkBox checked={!!form.photo_traffic} onChange={v => set("photo_traffic", v)} label="TRAFFIC MANAGEMENT PHOTO" />
              </div>
              {/* Security */}
              <div className="p-2 space-y-0.5">
                <p className="font-bold text-gray-700 mb-1">Ασφάλεια:</p>
                <ChkBox checked={!!form.sec_generator} onChange={v => set("sec_generator", v)} label="Ηλεκτρογεννήτρια" />
                <ChkBox checked={!!form.sec_crusher} onChange={v => set("sec_crusher", v)} label="Ηλεκτρικός Σπαστήρας" />
                <ChkBox checked={!!form.sec_truck} onChange={v => set("sec_truck", v)} label="Φορτηγό Όχημα" />
                <ChkBox checked={!!form.sec_crane} onChange={v => set("sec_crane", v)} label="Γερανοφόρο Όχημα" />
                <div className="mt-1">
                  <EditableTextarea value={form.security_notes} onChange={v => set("security_notes", v)} placeholder="Σχόλια ασφάλειας..." rows={2} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes ── */}
          <PdfSection title="ΣΗΜΕΙΩΣΕΙΣ (Άλλα θέματα για αναφορά)" blue>
            <EditableTextarea value={form.general_notes} onChange={v => set("general_notes", v)} placeholder="Γενικές σημειώσεις..." rows={2} />
          </PdfSection>

          <PdfSection title="ΣΥΓΚΕΚΡΙΜΕΝΕΣ ΕΡΓΑΣΙΕΣ (ΣΧΟΛΙΑ)" blue>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-xs font-bold text-gray-600 flex-shrink-0">{i})</span>
                  <EditableField value={form[`specific_work_${i}`] || ''} onChange={v => set(`specific_work_${i}`, v)} className="text-xs" />
                </div>
              ))}
            </div>
          </PdfSection>

          <PdfSection title="Μη Συμπληρωμένη Εργασία - Ελλείψεις - Ανάγκη για Επιστροφή">
            <EditableTextarea value={form.incomplete_reason} onChange={v => set("incomplete_reason", v)} placeholder="Αναλυτική Περιγραφή..." rows={2} />
          </PdfSection>

          <PdfSection title="Επιπρόσθετες Εργασίες πέραν των Προβλεπομένων">
            <EditableTextarea value={form.additional_works} onChange={v => set("additional_works", v)} placeholder="Αναλυτική Περιγραφή..." rows={2} />
          </PdfSection>

          {/* ── Closure ── */}
          <div className="border border-gray-400 p-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold text-xs">Κλείσιμο WO:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="close_wo" checked={!!form.close_wo_yes} onChange={() => { set("close_wo_yes", true); set("close_wo_no", false); }} className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-green-700">ΝΑΙ</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="close_wo" checked={!!form.close_wo_no} onChange={() => { set("close_wo_yes", false); set("close_wo_no", true); }} className="w-3.5 h-3.5" />
                <span className="text-xs font-bold text-red-700">ΟΧΙ</span>
              </label>
              {form.close_wo_no && (
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Αν όχι, αιτιολόγησε:</span>
                  <EditableField value={form.close_wo_reason} onChange={v => set("close_wo_reason", v)} placeholder="Αιτιολόγηση..." className="flex-1" />
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pt-3 pb-2">
            <Button variant="outline" onClick={onClose} className="text-xs h-8">Άκυρο</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={printingPDF} className="gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" /> {printingPDF ? "..." : "PDF / Εκτύπωση"}
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs h-8">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Αποθήκευση Draft
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5 text-xs h-8 bg-indigo-600 hover:bg-indigo-700">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Υποβολή
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}