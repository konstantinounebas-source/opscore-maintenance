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
  // Header
  date_of_work: "", completed_by: "", foreman: "", technician1: "", technician2: "", technician3: "",
  work_from: "", work_to: "", temperature: "", weather: "", photos_sent: "",
  
  // Quality checks
  hs_measures: "", work_completion: "", quality_check: "", deficiencies: "",
  
  // Checklist - all categories
  structural_frame_check: false, structural_frame_status: "",
  structural_connections_check: false, structural_connections_status: "",
  structural_paint_check: false, structural_paint_status: "",
  panels_side_check: false, panels_side_status: "",
  panels_plastic_check: false, panels_plastic_status: "",
  panels_sealing_check: false, panels_sealing_status: "",
  glass_surface_check: false, glass_surface_status: "",
  glass_frames_check: false, glass_frames_status: "",
  bench_wood_check: false, bench_wood_status: "",
  bench_supports_check: false, bench_supports_status: "",
  elec_power_panel_check: false, elec_power_panel_status: "",
  elec_wiring_check: false, elec_wiring_status: "",
  elec_screen_check: false, elec_screen_status: "",
  solar_panel_check: false, solar_panel_status: "",
  solar_indicator_check: false, solar_indicator_status: "",
  energy_battery_check: false, energy_battery_status: "",
  energy_connections_check: false, energy_connections_status: "",
  energy_replacement_check: false, energy_replacement_status: "",
  elec_router_check: false, elec_router_status: "",
  elec_controller_check: false, elec_controller_status: "",
  elec_power_check: false, elec_power_status: "",
  lighting_roof_check: false, lighting_roof_status: "",
  lighting_sign_check: false, lighting_sign_status: "",
  software_lighting_check: false, software_lighting_status: "",
  software_normal_check: false, software_normal_status: "",
  extra_malfunction_check: false, extra_malfunction_status: "",
  extra_bin_check: false, extra_bin_status: "",
  extra_signs_check: false, extra_signs_status: "",
  roof_lightbox_check: false, roof_lightbox_status: "",
  roof_panels_check: false, roof_panels_status: "",
  
  // Notes for each category
  structural_notes: "", panels_notes: "", glass_notes: "", bench_notes: "",
  elec_infra_notes: "", solar_notes: "", energy_notes: "", elec_panel_notes: "",
  lighting_notes: "", software_notes: "", extra_equip_notes: "", roof_notes: "",
  
  // NA flags
  structural_na: false, panels_na: false, glass_na: false, bench_na: false,
  elec_infra_na: false, solar_na: false, energy_na: false, elec_panel_na: false,
  lighting_na: false, software_na: false, extra_equip_na: false, roof_na: false,
  
  // Vehicles
  veh_personnel: false, veh_materials: false, veh_truck: false, veh_crane: false,
  veh_grinder: false, veh_disc: false, veh_compressor: false, veh_other: false,
  veh_other_text: "",
  
  // Security equipment
  sec_generator: false, sec_crusher: false, sec_truck: false, sec_crane: false, security_notes: "",
  
  // Photos
  photo_inspection: false, photo_hs: false, photo_traffic: false,
  
  // Notes
  general_notes: "",
  specific_work_1: "", specific_work_2: "", specific_work_3: "",
  specific_work_4: "", specific_work_5: "", specific_work_6: "",
  specific_work_7: "", specific_work_8: "", specific_work_9: "",
  specific_work_10: "", specific_work_11: "", specific_work_12: "",
  
  incomplete_reason: "", additional_works: "",
  close_wo_yes: false, close_wo_no: false, close_wo_reason: "",
  
  // Files
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

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(form));
  }, [form]);

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true);
    else setSaving(true);
    setError(null);
    try {
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
        setError("Αποτυχία σύνδεσης. Τα δεδομένα αποθηκεύτηκαν τοπικά.");
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
        <Field label="Αποστολή φωτογραφιών;"><Input value={form.photos_sent} onChange={e => set("photos_sent", e.target.value)} placeholder="Ναι/Όχι" className="h-11" /></Field>
      </div>

      {/* Quality checks */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Έλεγχος Εργασίας</h2>
        <Field label="Ενδεδειγμένα Μέτρα Α&Υ"><Textarea value={form.hs_measures} onChange={e => set("hs_measures", e.target.value)} rows={2} /></Field>
        <Field label="Συμπλήρωση Εργασίας"><Textarea value={form.work_completion} onChange={e => set("work_completion", e.target.value)} rows={2} /></Field>
        <Field label="Διενέργεια Ποιοτικού Ελέγχου"><Textarea value={form.quality_check} onChange={e => set("quality_check", e.target.value)} rows={2} /></Field>
        <Field label="Ελλείψεις / Ανάγκη Επιστροφής"><Textarea value={form.deficiencies} onChange={e => set("deficiencies", e.target.value)} rows={2} /></Field>
      </div>

      {/* Checklist - Structural */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">1) Δομική Κατασκευή</h2>
        <ChkCard checked={form.structural_na} onChange={v => set("structural_na", v)} label="N/A" />
        {!form.structural_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.structural_frame_check} onChange={v => set("structural_frame_check", v)} label="Σκελετός/βάσεις" /><Input value={form.structural_frame_status} onChange={e => set("structural_frame_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.structural_connections_check} onChange={v => set("structural_connections_check", v)} label="Συνδέσεις" /><Input value={form.structural_connections_status} onChange={e => set("structural_connections_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.structural_paint_check} onChange={v => set("structural_paint_check", v)} label="Βαφή" /><Input value={form.structural_paint_status} onChange={e => set("structural_paint_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.structural_notes} onChange={e => set("structural_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Panels, Glass, Bench - similar pattern */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">2) Πάνελ & Περιμετρικά</h2>
        <ChkCard checked={form.panels_na} onChange={v => set("panels_na", v)} label="N/A" />
        {!form.panels_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.panels_side_check} onChange={v => set("panels_side_check", v)} label="Πλευρικά" /><Input value={form.panels_side_status} onChange={e => set("panels_side_status", e.target.value)} /></div>
            <div className="flex gap-2"><ChkCard checked={form.panels_plastic_check} onChange={v => set("panels_plastic_check", v)} label="Πλαστικά" /><Input value={form.panels_plastic_status} onChange={e => set("panels_plastic_status", e.target.value)} /></div>
            <div className="flex gap-2"><ChkCard checked={form.panels_sealing_check} onChange={v => set("panels_sealing_check", v)} label="Στεγάνωση" /><Input value={form.panels_sealing_status} onChange={e => set("panels_sealing_status", e.target.value)} /></div>
            <Field label="Σχόλια"><Textarea value={form.panels_notes} onChange={e => set("panels_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">3) Υαλοπίνακες</h2>
        <ChkCard checked={form.glass_na} onChange={v => set("glass_na", v)} label="N/A" />
        {!form.glass_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.glass_surface_check} onChange={v => set("glass_surface_check", v)} label="Επιφάνειες" /><Input value={form.glass_surface_status} onChange={e => set("glass_surface_status", e.target.value)} /></div>
            <div className="flex gap-2"><ChkCard checked={form.glass_frames_check} onChange={v => set("glass_frames_check", v)} label="Πλαίσια" /><Input value={form.glass_frames_status} onChange={e => set("glass_frames_status", e.target.value)} /></div>
            <Field label="Σχόλια"><Textarea value={form.glass_notes} onChange={e => set("glass_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">4) Παγκάκια</h2>
        <ChkCard checked={form.bench_na} onChange={v => set("bench_na", v)} label="N/A" />
        {!form.bench_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.bench_wood_check} onChange={v => set("bench_wood_check", v)} label="Ξύλα" /><Input value={form.bench_wood_status} onChange={e => set("bench_wood_status", e.target.value)} /></div>
            <div className="flex gap-2"><ChkCard checked={form.bench_supports_check} onChange={v => set("bench_supports_check", v)} label="Στηρίγματα" /><Input value={form.bench_supports_status} onChange={e => set("bench_supports_status", e.target.value)} /></div>
            <Field label="Σχόλια"><Textarea value={form.bench_notes} onChange={e => set("bench_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Electrical Infrastructure */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">5) Ηλεκτρική Υποδομή</h2>
        <ChkCard checked={form.elec_infra_na} onChange={v => set("elec_infra_na", v)} label="N/A" />
        {!form.elec_infra_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.elec_power_panel_check} onChange={v => set("elec_power_panel_check", v)} label="Πίνακας" /><Input value={form.elec_power_panel_status} onChange={e => set("elec_power_panel_status", e.target.value)} /></div>
            <div className="flex gap-2"><ChkCard checked={form.elec_wiring_check} onChange={v => set("elec_wiring_check", v)} label="Καλωδιώσεις" /><Input value={form.elec_wiring_status} onChange={e => set("elec_wiring_status", e.target.value)} /></div>
            <div className="flex gap-2"><ChkCard checked={form.elec_screen_check} onChange={v => set("elec_screen_check", v)} label="Οθόνη" /><Input value={form.elec_screen_status} onChange={e => set("elec_screen_status", e.target.value)} /></div>
            <Field label="Σχόλια"><Textarea value={form.elec_infra_notes} onChange={e => set("elec_infra_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Solar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">6) Φωτοβολταϊκό Πάνελ</h2>
        <ChkCard checked={form.solar_na} onChange={v => set("solar_na", v)} label="N/A" />
        {!form.solar_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.solar_panel_check} onChange={v => set("solar_panel_check", v)} label="Πάνελ & βάσεις" /><Input value={form.solar_panel_status} onChange={e => set("solar_panel_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.solar_indicator_check} onChange={v => set("solar_indicator_check", v)} label="Ένδειξη λειτουργίας" /><Input value={form.solar_indicator_status} onChange={e => set("solar_indicator_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.solar_notes} onChange={e => set("solar_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Energy Storage */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">7) Αποθήκευση Ενέργειας</h2>
        <ChkCard checked={form.energy_na} onChange={v => set("energy_na", v)} label="N/A" />
        {!form.energy_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.energy_battery_check} onChange={v => set("energy_battery_check", v)} label="Μπαταρίες/θήκη" /><Input value={form.energy_battery_status} onChange={e => set("energy_battery_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.energy_connections_check} onChange={v => set("energy_connections_check", v)} label="Συνδέσεις/ασφάλεια" /><Input value={form.energy_connections_status} onChange={e => set("energy_connections_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.energy_replacement_check} onChange={v => set("energy_replacement_check", v)} label="Αντικατάσταση/Κλοπή" /><Input value={form.energy_replacement_status} onChange={e => set("energy_replacement_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.energy_notes} onChange={e => set("energy_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Electrical Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">8) Ηλεκτρολογικό Πάνελ</h2>
        <ChkCard checked={form.elec_panel_na} onChange={v => set("elec_panel_na", v)} label="N/A" />
        {!form.elec_panel_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.elec_router_check} onChange={v => set("elec_router_check", v)} label="Router/SIM" /><Input value={form.elec_router_status} onChange={e => set("elec_router_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.elec_controller_check} onChange={v => set("elec_controller_check", v)} label="Controller" /><Input value={form.elec_controller_status} onChange={e => set("elec_controller_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.elec_power_check} onChange={v => set("elec_power_check", v)} label="Power Supply" /><Input value={form.elec_power_status} onChange={e => set("elec_power_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.elec_panel_notes} onChange={e => set("elec_panel_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Lighting */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">9) Φωτισμός</h2>
        <ChkCard checked={form.lighting_na} onChange={v => set("lighting_na", v)} label="N/A" />
        {!form.lighting_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.lighting_roof_check} onChange={v => set("lighting_roof_check", v)} label="Φωτισμός Στέγης" /><Input value={form.lighting_roof_status} onChange={e => set("lighting_roof_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.lighting_sign_check} onChange={v => set("lighting_sign_check", v)} label="Υποδομής/Πινακίδας" /><Input value={form.lighting_sign_status} onChange={e => set("lighting_sign_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.lighting_notes} onChange={e => set("lighting_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Software */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">10) Λογισμικό Σύστημα</h2>
        <ChkCard checked={form.software_na} onChange={v => set("software_na", v)} label="N/A" />
        {!form.software_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.software_lighting_check} onChange={v => set("software_lighting_check", v)} label="Λειτουργία φωτισμού" /><Input value={form.software_lighting_status} onChange={e => set("software_lighting_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.software_normal_check} onChange={v => set("software_normal_check", v)} label="Κανονική λειτουργία" /><Input value={form.software_normal_status} onChange={e => set("software_normal_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.software_notes} onChange={e => set("software_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Extra Equipment */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">11) Πρόσθετος Εξοπλισμός</h2>
        <ChkCard checked={form.extra_equip_na} onChange={v => set("extra_equip_na", v)} label="N/A" />
        {!form.extra_equip_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.extra_malfunction_check} onChange={v => set("extra_malfunction_check", v)} label="Δυσλειτουργία/έλεγχος" /><Input value={form.extra_malfunction_status} onChange={e => set("extra_malfunction_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.extra_bin_check} onChange={v => set("extra_bin_check", v)} label="Κάδος/βάσεις ποδηλ." /><Input value={form.extra_bin_status} onChange={e => set("extra_bin_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.extra_signs_check} onChange={v => set("extra_signs_check", v)} label="Πινακίδες" /><Input value={form.extra_signs_status} onChange={e => set("extra_signs_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.extra_equip_notes} onChange={e => set("extra_equip_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Roof */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">12) Στέγη</h2>
        <ChkCard checked={form.roof_na} onChange={v => set("roof_na", v)} label="N/A" />
        {!form.roof_na && (
          <>
            <div className="flex gap-2"><ChkCard checked={form.roof_lightbox_check} onChange={v => set("roof_lightbox_check", v)} label="Light Box" /><Input value={form.roof_lightbox_status} onChange={e => set("roof_lightbox_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <div className="flex gap-2"><ChkCard checked={form.roof_panels_check} onChange={v => set("roof_panels_check", v)} label="Πανέλα Καπακιών" /><Input value={form.roof_panels_status} onChange={e => set("roof_panels_status", e.target.value)} placeholder="Κατάσταση" /></div>
            <Field label="Σχόλια"><Textarea value={form.roof_notes} onChange={e => set("roof_notes", e.target.value)} rows={2} /></Field>
          </>
        )}
      </div>

      {/* Vehicles */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Οχήματα & Εξοπλισμός</h2>
        <div className="space-y-2">
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
      </div>

      {/* Security Equipment */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Ασφάλεια</h2>
        <div className="space-y-2">
          <ChkCard checked={form.sec_generator} onChange={v => set("sec_generator", v)} label="Ηλεκτρογεννήτρια" />
          <ChkCard checked={form.sec_crusher} onChange={v => set("sec_crusher", v)} label="Ηλεκτρικός Σπαστήρας" />
          <ChkCard checked={form.sec_truck} onChange={v => set("sec_truck", v)} label="Φορτηγό Όχημα" />
          <ChkCard checked={form.sec_crane} onChange={v => set("sec_crane", v)} label="Γερανοφόρο Όχημα" />
          <Field label="Σχόλια Ασφάλειας"><Textarea value={form.security_notes} onChange={e => set("security_notes", e.target.value)} rows={2} /></Field>
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Φωτογραφίες</h2>
        <ChkCard checked={form.photo_inspection} onChange={v => set("photo_inspection", v)} label="ΦΩΤΟΓΡΑΦΙΕΣ ΓΙΑ ΕΠΙΘΕΩΡΗΣΗ" />
        <ChkCard checked={form.photo_hs} onChange={v => set("photo_hs", v)} label="H&S MEASURES" />
        <ChkCard checked={form.photo_traffic} onChange={v => set("photo_traffic", v)} label="TRAFFIC MANAGEMENT" />
        <PhotoUpload photos={form.photos || []} onChange={urls => set("photos", urls)} label="Φωτογραφίες εργασίας" />
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
        <Field label="Μη Συμπληρωμένη Εργασία"><Textarea value={form.incomplete_reason} onChange={e => set("incomplete_reason", e.target.value)} rows={2} /></Field>
        <Field label="Επιπρόσθετες Εργασίες"><Textarea value={form.additional_works} onChange={e => set("additional_works", e.target.value)} rows={2} /></Field>
      </div>

      {/* Closure */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Κλείσιμο WO</h2>
        <div className="flex gap-3">
          <button type="button" onClick={() => { set("close_wo_yes", true); set("close_wo_no", false); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm ${form.close_wo_yes ? "bg-green-600 text-white" : "bg-white"}`}>✓ ΝΑΙ</button>
          <button type="button" onClick={() => { set("close_wo_yes", false); set("close_wo_no", true); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm ${form.close_wo_no ? "bg-red-600 text-white" : "bg-white"}`}>✗ ΟΧΙ</button>
        </div>
        {form.close_wo_no && <Field label="Αιτιολόγηση"><Input value={form.close_wo_reason} onChange={e => set("close_wo_reason", e.target.value)} /></Field>}
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