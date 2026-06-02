import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import SignaturePad from "./SignaturePad";
import PhotoUpload from "./PhotoUpload";
import { correctiveDefaultData as defaultData } from "@/lib/formSchemas";

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function ChkCard({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 w-full px-3 py-3 rounded-lg border text-sm text-left transition-all ${
        checked ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-700"
      }`}
    >
      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold ${
        checked ? "border-white bg-white text-slate-800" : "border-slate-400"
      }`}>{checked ? "✓" : ""}</span>
      {label}
    </button>
  );
}

// Mobile-optimised checklist category with N/A toggle, per-item check+status, and category notes
function ChecklistCategory({ title, naKey, notesKey, items, form, set }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50">
        {/* N/A toggle */}
        <button
          type="button"
          onClick={() => set(naKey, !form[naKey])}
          className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold border transition-all ${
            form[naKey] ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-slate-300 text-slate-500"
          }`}
        >N/A</button>
        {/* Title */}
        <span className="flex-1 text-sm font-bold text-slate-800">{title}</span>
        {/* Expand toggle */}
        <button type="button" onClick={() => setOpen(o => !o)} className="text-slate-400 p-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded content */}
      {open && !form[naKey] && (
        <div className="p-3 space-y-3 bg-white">
          {items.map(item => (
            <div key={item.checkKey} className="flex items-center gap-2">
              {/* Check */}
              <button
                type="button"
                onClick={() => set(item.checkKey, !form[item.checkKey])}
                className={`flex-shrink-0 w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-bold transition-all ${
                  form[item.checkKey] ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-400"
                }`}
              >{form[item.checkKey] ? "✓" : ""}</button>
              {/* Label */}
              <span className="flex-1 text-xs text-slate-700">{item.label}</span>
              {/* Status input */}
              <Input
                value={form[item.statusKey] || ""}
                onChange={e => set(item.statusKey, e.target.value)}
                placeholder="Κατάσταση"
                className="h-8 text-xs w-28 flex-shrink-0"
              />
            </div>
          ))}
          {/* Category notes */}
          <Field label="Σχόλια κατηγορίας">
            <Textarea value={form[notesKey] || ""} onChange={e => set(notesKey, e.target.value)} rows={2} placeholder="Σχόλια..." />
          </Field>
        </div>
      )}

      {/* N/A message */}
      {open && form[naKey] && (
        <div className="px-4 py-2 bg-amber-50 text-amber-700 text-xs font-semibold">Επιλέχθηκε N/A — δεν απαιτείται έλεγχος</div>
      )}
    </div>
  );
}

export default function MobileCorrectiveForm({ token, incident, existingSubmission, onSubmitted }) {
  const storageKey = `corrective_draft_${token}`;

  const [form, setForm] = useState(() => {
    const offline = (() => { try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; } })();
    return { ...defaultData, ...(existingSubmission?.form_data || {}), ...(offline || {}) };
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(form)); }, [form]);

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true); else setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${window.location.origin}/functions/submitFieldWorkerForm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          formData: { ...form, signature_url: form.signature, photo_urls: form.photos || [] },
          status,
          workerName: form.completed_by || form.foreman || 'Field Worker',
        }),
      });
      const resData = await res.json();
      if (resData?.error) { setError(resData.error); }
      else if (status === 'Submitted') {
        localStorage.removeItem(storageKey);
        generateAndUploadPDF(resData.id, token).catch(err => console.error('PDF generation failed:', err));
        onSubmitted();
      } else { setOfflineSaved(true); setTimeout(() => setOfflineSaved(false), 3000); }
    } catch (err) {
      if (status === 'Draft') { setOfflineSaved(true); setTimeout(() => setOfflineSaved(false), 3000); }
      else { setError("Αποτυχία σύνδεσης. Τα δεδομένα αποθηκεύτηκαν τοπικά."); }
    } finally { setSaving(false); setSubmitting(false); }
  };

  const generateAndUploadPDF = async (submissionId, token) => {
    const pdfRes = await fetch(`${window.location.origin}/functions/generateFieldWorkerFormPDF`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, token }),
    });
    const pdfData = await pdfRes.json();
    if (!pdfData?.html) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const container = document.createElement('div');
    container.innerHTML = pdfData.html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    const pdfBlob = await html2pdf().set({ margin: 0, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(container).outputPdf('blob');
    document.body.removeChild(container);
    const pdfFile = new File([pdfBlob], pdfData.fileName || 'form.pdf', { type: 'application/pdf' });
    const formDataUpload = new FormData();
    formDataUpload.append('file', pdfFile);
    const uploadRes = await fetch(`${window.location.origin}/functions/uploadPublicFile`, { method: 'POST', body: formDataUpload });
    const uploadData = await uploadRes.json();
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const lastColon = decoded.lastIndexOf(':');
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
    const incidentId = decoded.substring(0, secondLastColon);
    await fetch(`${window.location.origin}/functions/attachFieldWorkerFormPDF`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, submissionId, pdfUrl: uploadData.file_url, pdfName: pdfData.fileName, token }),
    });
  };

  const checklistCategories = [
    {
      title: "1) Δομική Κατασκευή", naKey: "structural_na", notesKey: "structural_notes",
      items: [
        { label: "Σκελετός/βάσεις", checkKey: "structural_frame_check", statusKey: "structural_frame_status" },
        { label: "Συνδέσεις/σταθερότητα", checkKey: "structural_connections_check", statusKey: "structural_connections_status" },
        { label: "Βαφή/επιφάνειες", checkKey: "structural_paint_check", statusKey: "structural_paint_status" },
      ]
    },
    {
      title: "2) Πάνελ & Περιμετρικά", naKey: "panels_na", notesKey: "panels_notes",
      items: [
        { label: "Πλευρικά/οπίσθια πάνελ", checkKey: "panels_side_check", statusKey: "panels_side_status" },
        { label: "Πλαστικά/ακρυλικά", checkKey: "panels_plastic_check", statusKey: "panels_plastic_status" },
        { label: "Στεγάνωση/προστασία", checkKey: "panels_sealing_check", statusKey: "panels_sealing_status" },
      ]
    },
    {
      title: "3) Υαλοπίνακες", naKey: "glass_na", notesKey: "glass_notes",
      items: [
        { label: "Γυάλινες επιφάνειες", checkKey: "glass_surface_check", statusKey: "glass_surface_status" },
        { label: "Πλαίσια/στηρίξεις", checkKey: "glass_frames_check", statusKey: "glass_frames_status" },
      ]
    },
    {
      title: "4) Παγκάκια", naKey: "bench_na", notesKey: "bench_notes",
      items: [
        { label: "Παγκάκι/Ξύλα", checkKey: "bench_wood_check", statusKey: "bench_wood_status" },
        { label: "Στηρίγματα/Μεταλλικά μέρη", checkKey: "bench_supports_check", statusKey: "bench_supports_status" },
      ]
    },
    {
      title: "5) Ηλεκτρική Υποδομή", naKey: "elec_infra_na", notesKey: "elec_infra_notes",
      items: [
        { label: "Τροφοδοσία/πίνακας", checkKey: "elec_power_panel_check", statusKey: "elec_power_panel_status" },
        { label: "Καλωδιώσεις/συνδέσεις", checkKey: "elec_wiring_check", statusKey: "elec_wiring_status" },
        { label: "Οθόνη/e-paper", checkKey: "elec_screen_check", statusKey: "elec_screen_status" },
      ]
    },
    {
      title: "6) Φωτοβολταϊκό Πάνελ", naKey: "solar_na", notesKey: "solar_notes",
      items: [
        { label: "Πάνελ & βάσεις", checkKey: "solar_panel_check", statusKey: "solar_panel_status" },
        { label: "Ένδειξη λειτουργίας", checkKey: "solar_indicator_check", statusKey: "solar_indicator_status" },
      ]
    },
    {
      title: "7) Αποθήκευση Ενέργειας", naKey: "energy_na", notesKey: "energy_notes",
      items: [
        { label: "Μπαταρίες/θήκη", checkKey: "energy_battery_check", statusKey: "energy_battery_status" },
        { label: "Συνδέσεις/ασφάλεια", checkKey: "energy_connections_check", statusKey: "energy_connections_status" },
        { label: "Αντικατάσταση/Κλοπή", checkKey: "energy_replacement_check", statusKey: "energy_replacement_status" },
      ]
    },
    {
      title: "8) Ηλεκτρολογικό Πάνελ", naKey: "elec_panel_na", notesKey: "elec_panel_notes",
      items: [
        { label: "Router/SIM", checkKey: "elec_router_check", statusKey: "elec_router_status" },
        { label: "Controller", checkKey: "elec_controller_check", statusKey: "elec_controller_status" },
        { label: "Power Supply", checkKey: "elec_power_check", statusKey: "elec_power_status" },
      ]
    },
    {
      title: "9) Φωτισμός", naKey: "lighting_na", notesKey: "lighting_notes",
      items: [
        { label: "Φωτισμός Στέγης", checkKey: "lighting_roof_check", statusKey: "lighting_roof_status" },
        { label: "Υποδομής/Πινακίδας", checkKey: "lighting_sign_check", statusKey: "lighting_sign_status" },
      ]
    },
    {
      title: "10) Λογισμικό Σύστημα", naKey: "software_na", notesKey: "software_notes",
      items: [
        { label: "Λειτουργία φωτισμού", checkKey: "software_lighting_check", statusKey: "software_lighting_status" },
        { label: "Κανονική λειτουργία", checkKey: "software_normal_check", statusKey: "software_normal_status" },
      ]
    },
    {
      title: "11) Πρόσθετος Εξοπλισμός", naKey: "extra_equip_na", notesKey: "extra_equip_notes",
      items: [
        { label: "Δυσλειτουργία/έλεγχος", checkKey: "extra_malfunction_check", statusKey: "extra_malfunction_status" },
        { label: "Κάδος/βάσεις ποδηλ.", checkKey: "extra_bin_check", statusKey: "extra_bin_status" },
        { label: "Πινακίδες", checkKey: "extra_signs_check", statusKey: "extra_signs_status" },
      ]
    },
    {
      title: "12) Στέγη", naKey: "roof_na", notesKey: "roof_notes",
      items: [
        { label: "Light Box", checkKey: "roof_lightbox_check", statusKey: "roof_lightbox_status" },
        { label: "Πανέλα Καπακιών", checkKey: "roof_panels_check", statusKey: "roof_panels_status" },
      ]
    },
  ];

  return (
    <div className="space-y-4 pb-10">
      {offlineSaved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Draft αποθηκεύτηκε τοπικά
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Στοιχεία Εργασίας</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ημερομηνία"><Input type="date" value={form.date_of_work} onChange={e => set("date_of_work", e.target.value)} className="h-11" /></Field>
          <Field label="Συμπληρώθηκε από"><Input value={form.completed_by} onChange={e => set("completed_by", e.target.value)} className="h-11" /></Field>
        </div>
        <Field label="Εργοδηγός"><Input value={form.foreman} onChange={e => set("foreman", e.target.value)} className="h-11" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Τεχνίτης 1"><Input value={form.technician1} onChange={e => set("technician1", e.target.value)} className="h-11" /></Field>
          <Field label="Τεχνίτης 2"><Input value={form.technician2} onChange={e => set("technician2", e.target.value)} className="h-11" /></Field>
        </div>
        <Field label="Τεχνίτης 3"><Input value={form.technician3} onChange={e => set("technician3", e.target.value)} className="h-11" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Από (ώρα)"><Input type="time" value={form.work_from} onChange={e => set("work_from", e.target.value)} className="h-11" /></Field>
          <Field label="Έως (ώρα)"><Input type="time" value={form.work_to} onChange={e => set("work_to", e.target.value)} className="h-11" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Θερμοκρασία (°C)"><Input value={form.temperature} onChange={e => set("temperature", e.target.value)} className="h-11" /></Field>
          <Field label="Καιρός"><Input value={form.weather} onChange={e => set("weather", e.target.value)} className="h-11" /></Field>
        </div>
        <Field label="Αποστολή φωτογραφιών (Ναι/Όχι)"><Input value={form.photos_sent} onChange={e => set("photos_sent", e.target.value)} placeholder="Ναι/Όχι" className="h-11" /></Field>
      </div>

      {/* Quality checks */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Έλεγχος Εργασίας (Ναι/Όχι)</h2>
        <Field label="Ενδεδειγμένα Μέτρα Α&Υ"><Input value={form.hs_measures} onChange={e => set("hs_measures", e.target.value)} placeholder="Ναι/Όχι" className="h-11" /></Field>
        <Field label="Συμπλήρωση Εργασίας"><Input value={form.work_completion} onChange={e => set("work_completion", e.target.value)} placeholder="Ναι/Όχι" className="h-11" /></Field>
        <Field label="Διενέργεια Ποιοτικού Ελέγχου"><Input value={form.quality_check} onChange={e => set("quality_check", e.target.value)} placeholder="Ναι/Όχι" className="h-11" /></Field>
        <Field label="Ελλείψεις / Ανάγκη Επιστροφής"><Input value={form.deficiencies} onChange={e => set("deficiencies", e.target.value)} placeholder="Ναι/Όχι" className="h-11" /></Field>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-800 uppercase px-1">Checklist Ελέγχου Στάσης/Στεγάστρου</h2>
        <p className="text-xs text-slate-500 px-1">Πατήστε σε κάθε κατηγορία για να την επεκτείνετε. Χρησιμοποιήστε N/A αν δεν εφαρμόζεται.</p>
        {checklistCategories.map(cat => (
          <ChecklistCategory key={cat.naKey} {...cat} form={form} set={set} />
        ))}
      </div>

      {/* Vehicles */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Οχήματα & Εξοπλισμός</h2>
        <p className="text-xs font-semibold text-slate-600">Οχήματα:</p>
        <ChkCard checked={form.veh_personnel} onChange={v => set("veh_personnel", v)} label="Όχημα Μεταφοράς Προσωπικού" />
        <ChkCard checked={form.veh_materials} onChange={v => set("veh_materials", v)} label="Όχημα Μεταφοράς Υλικών και Εξοπλισμού" />
        <ChkCard checked={form.veh_truck} onChange={v => set("veh_truck", v)} label="Φορτηγό Όχημα" />
        <ChkCard checked={form.veh_crane} onChange={v => set("veh_crane", v)} label="Γερανοφόρο Όχημα" />
        <p className="text-xs font-semibold text-slate-600 mt-2">Εργαλεία/Εξοπλισμός:</p>
        <ChkCard checked={form.veh_grinder} onChange={v => set("veh_grinder", v)} label="Σμιρίλιο Χεριού" />
        <ChkCard checked={form.veh_disc} onChange={v => set("veh_disc", v)} label="Διαμαντοδίσκος Κοπής" />
        <ChkCard checked={form.veh_compressor} onChange={v => set("veh_compressor", v)} label="Συμπιεστήρας" />
        <ChkCard checked={form.veh_other} onChange={v => set("veh_other", v)} label="Άλλο" />
        {form.veh_other && <Input value={form.veh_other_text} onChange={e => set("veh_other_text", e.target.value)} placeholder="Περιγραφή..." className="h-10" />}
      </div>

      {/* Photos checkboxes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Είδος Check Φωτογραφιών</h2>
        <ChkCard checked={form.photo_inspection} onChange={v => set("photo_inspection", v)} label="ΦΩΤΟΓΡΑΦΙΕΣ ΓΙΑ ΕΠΙΘΕΩΡΗΣΗ ΕΡΓΑΣΙΑΣ" />
        <ChkCard checked={form.photo_hs} onChange={v => set("photo_hs", v)} label="H&S MEASURES (SIGNS)" />
        <ChkCard checked={form.photo_traffic} onChange={v => set("photo_traffic", v)} label="TRAFFIC MANAGEMENT PHOTO" />
        <PhotoUpload photos={form.photos || []} onChange={urls => set("photos", urls)} label="Φωτογραφίες εργασίας" />
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Ασφάλεια</h2>
        <ChkCard checked={form.sec_generator} onChange={v => set("sec_generator", v)} label="Ηλεκτρογεννήτρια" />
        <ChkCard checked={form.sec_crusher} onChange={v => set("sec_crusher", v)} label="Ηλεκτρικός Σπαστήρας" />
        <ChkCard checked={form.sec_truck} onChange={v => set("sec_truck", v)} label="Φορτηγό Όχημα" />
        <ChkCard checked={form.sec_crane} onChange={v => set("sec_crane", v)} label="Γερανοφόρο Όχημα" />
        <Field label="Σχόλια Ασφάλειας"><Textarea value={form.security_notes} onChange={e => set("security_notes", e.target.value)} rows={2} /></Field>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Σημειώσεις</h2>
        <Field label="Γενικές Σημειώσεις"><Textarea value={form.general_notes} onChange={e => set("general_notes", e.target.value)} rows={3} /></Field>
        <Field label="Συγκεκριμένες Εργασίες (1-12)">
          <div className="space-y-2">
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
              <Input key={i} value={form[`specific_work_${i}`] || ''} onChange={e => set(`specific_work_${i}`, e.target.value)} placeholder={`Εργασία ${i}`} className="h-10" />
            ))}
          </div>
        </Field>
        <Field label="Μη Συμπληρωμένη Εργασία / Ελλείψεις"><Textarea value={form.incomplete_reason} onChange={e => set("incomplete_reason", e.target.value)} rows={2} /></Field>
        <Field label="Επιπρόσθετες Εργασίες πέραν των Προβλεπομένων"><Textarea value={form.additional_works} onChange={e => set("additional_works", e.target.value)} rows={2} /></Field>
      </div>

      {/* Closure */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Κλείσιμο WO</h2>
        <div className="flex gap-3">
          <button type="button" onClick={() => { set("close_wo_yes", true); set("close_wo_no", false); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm ${form.close_wo_yes ? "bg-green-600 text-white border-green-600" : "bg-white border-slate-200"}`}>✓ ΝΑΙ</button>
          <button type="button" onClick={() => { set("close_wo_yes", false); set("close_wo_no", true); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm ${form.close_wo_no ? "bg-red-600 text-white border-red-600" : "bg-white border-slate-200"}`}>✗ ΟΧΙ</button>
        </div>
        {form.close_wo_no && <Field label="Αιτιολόγηση (αν Όχι)"><Input value={form.close_wo_reason} onChange={e => set("close_wo_reason", e.target.value)} className="h-11" /></Field>}
      </div>

      {/* Signature */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Υπογραφή</h2>
        <SignaturePad value={form.signature} onChange={val => set("signature", val)} label="Υπογραφή Εργοδηγού" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => submit('Draft')} disabled={saving || submitting}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Αποθήκευση
        </Button>
        <Button className="flex-1 h-12 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => submit('Submitted')} disabled={saving || submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Υποβολή
        </Button>
      </div>
    </div>
  );
}