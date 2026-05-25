import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X } from "lucide-react";

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-slate-700 bg-slate-100 px-3 py-2 rounded mb-3 uppercase tracking-wide">
      {title}
    </h3>
    <div className="px-1">{children}</div>
  </div>
);

const CheckRow = ({ label, checked, onChange }) => (
  <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0">
    <Checkbox checked={checked} onCheckedChange={onChange} />
    <Label className="text-sm text-slate-700 cursor-pointer" onClick={() => onChange(!checked)}>
      {label}
    </Label>
  </div>
);

const defaultData = {
  // Personnel
  technician_name: "",
  technician_phone: "",
  supervisor_name: "",
  date_of_work: "",
  work_order_ref: "",
  // Vehicle
  vehicle_van: false,
  vehicle_truck: false,
  vehicle_cherry_picker: false,
  vehicle_other: false,
  vehicle_other_text: "",
  // Δομική Κατασκευή
  structural_frame_check: false,
  structural_roof_check: false,
  structural_panels_check: false,
  structural_bolts_check: false,
  structural_notes: "",
  // Πάνελ & Περιμετρικά
  panels_side_check: false,
  panels_back_check: false,
  panels_front_check: false,
  panels_seals_check: false,
  panels_notes: "",
  // Υαλοπίνακες
  glass_front_check: false,
  glass_side_check: false,
  glass_roof_check: false,
  glass_notes: "",
  // Ηλεκτρολογικά
  electrical_lighting_check: false,
  electrical_wiring_check: false,
  electrical_fuse_check: false,
  electrical_notes: "",
  // Ηλεκτρονικά
  electronic_display_check: false,
  electronic_controller_check: false,
  electronic_solar_check: false,
  electronic_notes: "",
  // Καθισματα / Εξοπλισμός
  seating_bench_check: false,
  seating_bin_check: false,
  seating_signage_check: false,
  seating_notes: "",
  // Γενικές Σημειώσεις & Κλείσιμο ΕΕ
  general_notes: "",
  work_completed: null, // true = ΝΑΙ, false = ΟΧΙ
  incomplete_reason: "",
};

export default function CorrectiveWOForm({ submission, incident, incidentId, workOrders, onClose }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const existingData = submission?.form_data || {};
  const [form, setForm] = useState({ ...defaultData, ...existingData });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

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
    form_data: { ...form, work_order_ref: form.work_order_ref || getWorkOrderRef() },
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

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = { ...buildPayload("Submitted"), submitted_at: new Date().toISOString() };
    if (submission?.id) {
      await base44.entities.FormSubmissions.update(submission.id, payload);
    } else {
      await base44.entities.FormSubmissions.create(payload);
    }
    setSubmitting(false);
    toast({ title: "Form submitted successfully" });
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Corrective Work Order Checklist</h2>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-2">

        {/* Personnel & Vehicle */}
        <Section title="Στοιχεία Τεχνικού / Εργασίας">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Όνομα Τεχνικού</Label>
              <Input value={form.technician_name} onChange={e => set("technician_name", e.target.value)} placeholder="Όνομα..." />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Τηλέφωνο</Label>
              <Input value={form.technician_phone} onChange={e => set("technician_phone", e.target.value)} placeholder="Τηλ..." />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Επόπτης</Label>
              <Input value={form.supervisor_name} onChange={e => set("supervisor_name", e.target.value)} placeholder="Επόπτης..." />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Ημερομηνία Εργασίας</Label>
              <Input type="date" value={form.date_of_work} onChange={e => set("date_of_work", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-500 mb-1 block">Αρ. Εντολής Εργασίας</Label>
              <Input value={form.work_order_ref || getWorkOrderRef()} onChange={e => set("work_order_ref", e.target.value)} placeholder="WO-..." />
            </div>
          </div>
        </Section>

        <Section title="Οχήματα / Εξοπλισμός">
          <div className="grid grid-cols-2 gap-2">
            <CheckRow label="Βαν" checked={form.vehicle_van} onChange={v => set("vehicle_van", v)} />
            <CheckRow label="Φορτηγό" checked={form.vehicle_truck} onChange={v => set("vehicle_truck", v)} />
            <CheckRow label="Καλαθοφόρο" checked={form.vehicle_cherry_picker} onChange={v => set("vehicle_cherry_picker", v)} />
            <CheckRow label="Άλλο" checked={form.vehicle_other} onChange={v => set("vehicle_other", v)} />
          </div>
          {form.vehicle_other && (
            <Input className="mt-2" value={form.vehicle_other_text} onChange={e => set("vehicle_other_text", e.target.value)} placeholder="Περιγραφή άλλου οχήματος..." />
          )}
        </Section>

        {/* Structural */}
        <Section title="Δομική Κατασκευή">
          <CheckRow label="Έλεγχος πλαισίου" checked={form.structural_frame_check} onChange={v => set("structural_frame_check", v)} />
          <CheckRow label="Έλεγχος οροφής" checked={form.structural_roof_check} onChange={v => set("structural_roof_check", v)} />
          <CheckRow label="Έλεγχος πάνελ" checked={form.structural_panels_check} onChange={v => set("structural_panels_check", v)} />
          <CheckRow label="Έλεγχος κοχλιών / συνδέσμων" checked={form.structural_bolts_check} onChange={v => set("structural_bolts_check", v)} />
          <Textarea className="mt-2" rows={2} value={form.structural_notes} onChange={e => set("structural_notes", e.target.value)} placeholder="Σημειώσεις..." />
        </Section>

        {/* Panels */}
        <Section title="Πάνελ & Περιμετρικά">
          <CheckRow label="Πλαϊνά πάνελ" checked={form.panels_side_check} onChange={v => set("panels_side_check", v)} />
          <CheckRow label="Πίσω πάνελ" checked={form.panels_back_check} onChange={v => set("panels_back_check", v)} />
          <CheckRow label="Μπροστινό πάνελ" checked={form.panels_front_check} onChange={v => set("panels_front_check", v)} />
          <CheckRow label="Σφραγίσεις / joints" checked={form.panels_seals_check} onChange={v => set("panels_seals_check", v)} />
          <Textarea className="mt-2" rows={2} value={form.panels_notes} onChange={e => set("panels_notes", e.target.value)} placeholder="Σημειώσεις..." />
        </Section>

        {/* Glass */}
        <Section title="Υαλοπίνακες">
          <CheckRow label="Μπροστινός υαλοπίνακας" checked={form.glass_front_check} onChange={v => set("glass_front_check", v)} />
          <CheckRow label="Πλαϊνοί υαλοπίνακες" checked={form.glass_side_check} onChange={v => set("glass_side_check", v)} />
          <CheckRow label="Οροφή (υαλοπίνακας)" checked={form.glass_roof_check} onChange={v => set("glass_roof_check", v)} />
          <Textarea className="mt-2" rows={2} value={form.glass_notes} onChange={e => set("glass_notes", e.target.value)} placeholder="Σημειώσεις..." />
        </Section>

        {/* Electrical */}
        <Section title="Ηλεκτρολογικά">
          <CheckRow label="Φωτισμός" checked={form.electrical_lighting_check} onChange={v => set("electrical_lighting_check", v)} />
          <CheckRow label="Καλωδίωση" checked={form.electrical_wiring_check} onChange={v => set("electrical_wiring_check", v)} />
          <CheckRow label="Ασφάλειες / πίνακας" checked={form.electrical_fuse_check} onChange={v => set("electrical_fuse_check", v)} />
          <Textarea className="mt-2" rows={2} value={form.electrical_notes} onChange={e => set("electrical_notes", e.target.value)} placeholder="Σημειώσεις..." />
        </Section>

        {/* Electronics */}
        <Section title="Ηλεκτρονικά">
          <CheckRow label="Οθόνη / πληροφορίες" checked={form.electronic_display_check} onChange={v => set("electronic_display_check", v)} />
          <CheckRow label="Ελεγκτής / controller" checked={form.electronic_controller_check} onChange={v => set("electronic_controller_check", v)} />
          <CheckRow label="Φωτοβολταϊκά / solar" checked={form.electronic_solar_check} onChange={v => set("electronic_solar_check", v)} />
          <Textarea className="mt-2" rows={2} value={form.electronic_notes} onChange={e => set("electronic_notes", e.target.value)} placeholder="Σημειώσεις..." />
        </Section>

        {/* Seating */}
        <Section title="Καθίσματα / Εξοπλισμός">
          <CheckRow label="Παγκάκι / καθίσματα" checked={form.seating_bench_check} onChange={v => set("seating_bench_check", v)} />
          <CheckRow label="Κάδος απορριμάτων" checked={form.seating_bin_check} onChange={v => set("seating_bin_check", v)} />
          <CheckRow label="Σήμανση / πινακίδες" checked={form.seating_signage_check} onChange={v => set("seating_signage_check", v)} />
          <Textarea className="mt-2" rows={2} value={form.seating_notes} onChange={e => set("seating_notes", e.target.value)} placeholder="Σημειώσεις..." />
        </Section>

        {/* Closure */}
        <Section title="Κλείσιμο Εντολής Εργασίας">
          <div className="mb-4">
            <Label className="text-sm text-slate-700 block mb-2">Ολοκληρώθηκαν οι εργασίες;</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="work_completed" checked={form.work_completed === true} onChange={() => set("work_completed", true)} />
                <span className="text-sm font-medium text-green-700">ΝΑΙ</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="work_completed" checked={form.work_completed === false} onChange={() => set("work_completed", false)} />
                <span className="text-sm font-medium text-red-700">ΟΧΙ</span>
              </label>
            </div>
          </div>
          {form.work_completed === false && (
            <div className="mb-4">
              <Label className="text-xs text-slate-500 mb-1 block">Αιτία μη ολοκλήρωσης</Label>
              <Textarea rows={2} value={form.incomplete_reason} onChange={e => set("incomplete_reason", e.target.value)} placeholder="Περιγράψτε τον λόγο..." />
            </div>
          )}
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Γενικές Σημειώσεις</Label>
            <Textarea rows={3} value={form.general_notes} onChange={e => set("general_notes", e.target.value)} placeholder="Γενικές παρατηρήσεις..." />
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
        <Button variant="outline" onClick={onClose}>Άκυρο</Button>
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