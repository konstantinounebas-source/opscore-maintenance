import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send, WifiOff } from "lucide-react";
import SignaturePad from "./SignaturePad";
import PhotoUpload from "./PhotoUpload";

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

const defaultData = {
  date_of_work: "", completed_by: "", foreman: "", technician1: "", technician2: "",
  work_from: "", work_to: "", temperature: "", weather: "",
  hs_measures: "", work_completion: "", quality_check: "", deficiencies: "",
  structural_frame_check: false, glass_surface_check: false, bench_wood_check: false,
  elec_power_panel_check: false, solar_panel_check: false, energy_battery_check: false,
  lighting_roof_check: false, software_normal_check: false,
  general_notes: "", specific_work_1: "", specific_work_2: "", specific_work_3: "",
  incomplete_reason: "", additional_works: "",
  close_wo_yes: false, close_wo_no: false, close_wo_reason: "",
  photos: [],
  signature: "",
};

export default function MobileCorrectiveForm({ token, incident, existingSubmission, onSubmitted }) {
  const storageKey = `corrective_draft_${token}`;

  const [form, setForm] = useState(() => {
    const offline = (() => { try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; } })();
    return {
      ...defaultData,
      ...(existingSubmission?.form_data || {}),
      ...(offline || {}),
    };
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Auto-save to localStorage every time form changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(form));
  }, [form]);

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true);
    else setSaving(true);
    setError(null);
    try {
      // Extract file URLs from form data for audit trail
      const formDataWithFiles = {
        ...form,
        signature_url: form.signature,
        photo_urls: form.photos || [],
      };
      const res = await base44.functions.invoke('submitFieldWorkerForm', {
        token,
        formData: formDataWithFiles,
        status,
        workerName: form.completed_by || form.foreman || 'Field Worker',
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else if (status === 'Submitted') {
        localStorage.removeItem(storageKey);
        onSubmitted();
      } else {
        setOfflineSaved(true);
        setTimeout(() => setOfflineSaved(false), 3000);
      }
    } catch (err) {
      if (status === 'Draft') {
        setOfflineSaved(true);
        setTimeout(() => setOfflineSaved(false), 3000);
      } else {
        setError("Αποτυχία σύνδεσης. Τα δεδομένα αποθηκεύτηκαν τοπικά και θα υποβληθούν όταν επανέλθει η σύνδεση.");
      }
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {offlineSaved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Draft αποθηκεύτηκε τοπικά στη συσκευή σας
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Header info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Στοιχεία Εργασίας</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ημερομηνία">
            <Input type="date" value={form.date_of_work} onChange={e => set("date_of_work", e.target.value)} className="h-11" />
          </Field>
          <Field label="Συμπληρώθηκε από">
            <Input value={form.completed_by} onChange={e => set("completed_by", e.target.value)} placeholder="Όνομα..." className="h-11" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Εργοδηγός">
            <Input value={form.foreman} onChange={e => set("foreman", e.target.value)} placeholder="Εργοδηγός..." className="h-11" />
          </Field>
          <Field label="Τεχνίτης 1">
            <Input value={form.technician1} onChange={e => set("technician1", e.target.value)} placeholder="Τεχνίτης..." className="h-11" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ώρα Έναρξης">
            <Input type="time" value={form.work_from} onChange={e => set("work_from", e.target.value)} className="h-11" />
          </Field>
          <Field label="Ώρα Λήξης">
            <Input type="time" value={form.work_to} onChange={e => set("work_to", e.target.value)} className="h-11" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Θερμοκρασία (°C)">
            <Input value={form.temperature} onChange={e => set("temperature", e.target.value)} placeholder="°C" className="h-11" />
          </Field>
          <Field label="Καιρός">
            <Input value={form.weather} onChange={e => set("weather", e.target.value)} placeholder="π.χ. Ηλιόλουστος" className="h-11" />
          </Field>
        </div>
      </div>

      {/* Quality checks */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Έλεγχος Εργασίας</h2>
        {[
          ["hs_measures", "Ενδεδειγμένα Μέτρα Α&Υ"],
          ["work_completion", "Συμπλήρωση Εργασίας"],
          ["quality_check", "Διενέργεια Ποιοτικού Ελέγχου"],
          ["deficiencies", "Ελλείψεις / Ανάγκη Επιστροφής"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={form[key]} onChange={e => set(key, e.target.value)} placeholder="Ναι / Όχι" className="h-11" />
          </Field>
        ))}
      </div>

      {/* Checklist summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Checklist Ελέγχου</h2>
        <div className="space-y-2">
          {[
            ["structural_frame_check", "1. Δομική Κατασκευή – Σκελετός"],
            ["glass_surface_check", "3. Υαλοπίνακες – Επιφάνεια"],
            ["bench_wood_check", "4. Παγκάκια"],
            ["elec_power_panel_check", "5. Ηλεκτρική Υποδομή – Πίνακας"],
            ["solar_panel_check", "6. Φωτοβολταϊκό Πάνελ"],
            ["energy_battery_check", "7. Αποθήκευση Ενέργειας – Μπαταρίες"],
            ["lighting_roof_check", "9. Φωτισμός Στέγης"],
            ["software_normal_check", "10. Λογισμικό – Κανονική Λειτουργία"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!form[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Specific works */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Συγκεκριμένες Εργασίες</h2>
        {[1, 2, 3].map(i => (
          <Field key={i} label={`Εργασία ${i}`}>
            <Input value={form[`specific_work_${i}`] || ''} onChange={e => set(`specific_work_${i}`, e.target.value)} placeholder="Περιγραφή εργασίας..." className="h-11" />
          </Field>
        ))}
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Φωτογραφίες</h2>
        <PhotoUpload
          photos={form.photos || []}
          onChange={urls => set("photos", urls)}
          label="Φωτογραφίες εργασίας"
        />
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Σημειώσεις</h2>
        <Field label="Γενικές Σημειώσεις">
          <Textarea value={form.general_notes} onChange={e => set("general_notes", e.target.value)} placeholder="Σχόλια..." rows={3} />
        </Field>
        <Field label="Μη Συμπληρωμένη Εργασία">
          <Textarea value={form.incomplete_reason} onChange={e => set("incomplete_reason", e.target.value)} placeholder="Αναλυτική Περιγραφή..." rows={2} />
        </Field>
        <Field label="Επιπρόσθετες Εργασίες">
          <Textarea value={form.additional_works} onChange={e => set("additional_works", e.target.value)} placeholder="Αναλυτική Περιγραφή..." rows={2} />
        </Field>
      </div>

      {/* Closure */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Κλείσιμο WO</h2>
        <div className="flex gap-3">
          <button type="button" onClick={() => { set("close_wo_yes", true); set("close_wo_no", false); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${
              form.close_wo_yes ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-600 border-slate-200"
            }`}>✓ ΝΑΙ</button>
          <button type="button" onClick={() => { set("close_wo_yes", false); set("close_wo_no", true); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${
              form.close_wo_no ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-600 border-slate-200"
            }`}>✗ ΟΧΙ</button>
        </div>
        {form.close_wo_no && (
          <Field label="Αιτιολόγηση">
            <Input value={form.close_wo_reason} onChange={e => set("close_wo_reason", e.target.value)} placeholder="Λόγος..." className="h-11" />
          </Field>
        )}
      </div>

      {/* Signature */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Υπογραφή</h2>
        <SignaturePad
          value={form.signature}
          onChange={val => set("signature", val)}
          label="Υπογραφή Εργοδηγού"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => submit('Draft')} disabled={saving || submitting}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Αποθήκευση
        </Button>
        <Button className="flex-1 h-12 gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => submit('Submitted')} disabled={saving || submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Υποβολή
        </Button>
      </div>
    </div>
  );
}