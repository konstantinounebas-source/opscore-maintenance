import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send, ShieldAlert, WifiOff } from "lucide-react";
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

const defaultData = () => ({
  technician: "", date: "", time_start: "", vehicle: "",
  danger_electrical: false, danger_glass: false, danger_structural: false, danger_pv: false,
  immediate_danger: "no", danger_description: "",
  ppe_vest: false, ppe_helmet: false, ppe_gloves: false, ppe_glasses: false, ppe_shoes: false,
  loto_ac: false, loto_pv: false, loto_battery: false,
  f1_cover: false, f2_collect: false, f3_stabilize: false, f4_isolate: false,
  doc_photo_before: false, doc_photo_after: false, doc_make_safe_completed: false,
  pending_corrective: "", doc_hd_comments: "", sig_tech: "",
  photos: [],
  signature: "",
});

export default function MobileMakeSafeForm({ token, incident, asset, existingSubmission, onSubmitted }) {
  const storageKey = `make_safe_draft_${token}`;

  const [fd, setFd] = useState(() => {
    // Priority: existingSubmission > localStorage offline draft > defaults
    const offline = (() => { try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; } })();
    return {
      ...defaultData(),
      ...(existingSubmission?.form_data || {}),
      ...(offline || {}),
    };
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const set = (key, val) => setFd(prev => ({ ...prev, [key]: val }));
  const isHighRisk = fd.immediate_danger === "yes";

  // Auto-save to localStorage every time form changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(fd));
  }, [fd]);

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true);
    else setSaving(true);
    setError(null);
    try {
      // Extract file URLs from form data for audit trail
      const formDataWithFiles = {
        ...fd,
        signature_url: fd.signature,
        photo_urls: fd.photos || [],
      };
      const res = await base44.functions.invoke('submitFieldWorkerForm', {
        token,
        formData: formDataWithFiles,
        status,
        workerName: fd.technician || 'Field Worker',
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
      // If network error, data is already saved in localStorage
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
      {isHighRisk && (
        <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-2 font-bold text-sm animate-pulse">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          ΑΜΕΣΟΣ ΚΙΝΔΥΝΟΣ – ΚΑΛΕΣΤΕ 112
        </div>
      )}

      {offlineSaved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Draft αποθηκεύτηκε τοπικά στη συσκευή σας
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Basic info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">A. Στοιχεία</h2>
        <Field label="Τεχνικός">
          <Input value={fd.technician} onChange={e => set("technician", e.target.value)} placeholder="Ονοματεπώνυμο..." className="h-11" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ημερομηνία">
            <Input type="date" value={fd.date} onChange={e => set("date", e.target.value)} className="h-11" />
          </Field>
          <Field label="Ώρα Έναρξης">
            <Input type="time" value={fd.time_start} onChange={e => set("time_start", e.target.value)} className="h-11" />
          </Field>
        </div>
        <Field label="Όχημα">
          <Input value={fd.vehicle} onChange={e => set("vehicle", e.target.value)} placeholder="Αρ. κυκλοφορίας..." className="h-11" />
        </Field>
      </div>

      {/* Dangers */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">B. Stop & Assess</h2>
        <Field label="Είδος Κινδύνου">
          <div className="space-y-2">
            <ChkCard checked={fd.danger_electrical} onChange={v => set("danger_electrical", v)} label="⚡ Ηλεκτρολογικός" />
            <ChkCard checked={fd.danger_glass} onChange={v => set("danger_glass", v)} label="🪟 Γυαλί" />
            <ChkCard checked={fd.danger_structural} onChange={v => set("danger_structural", v)} label="🏗️ Δομικός" />
            <ChkCard checked={fd.danger_pv} onChange={v => set("danger_pv", v)} label="☀️ PV / Μπαταρία" />
          </div>
        </Field>
        <Field label="Άμεσος Κίνδυνος Ζωής;">
          <div className="flex gap-3">
            {["yes", "no"].map(val => (
              <button key={val} type="button" onClick={() => set("immediate_danger", val)}
                className={`flex-1 py-3 rounded-lg border text-sm font-bold transition-all ${
                  fd.immediate_danger === val
                    ? val === "yes" ? "bg-red-600 text-white border-red-600" : "bg-green-600 text-white border-green-600"
                    : "bg-white text-slate-600 border-slate-200"
                }`}>
                {val === "yes" ? "⚠️ ΝΑΙ" : "✓ ΟΧΙ"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Περιγραφή Κινδύνου">
          <Textarea value={fd.danger_description} onChange={e => set("danger_description", e.target.value)} placeholder="Περιγράψτε τον κίνδυνο..." rows={3} />
        </Field>
      </div>

      {/* PPE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">C. PPE</h2>
        <div className="space-y-2">
          {[
            ["ppe_vest", "🦺 Γιλέκο"], ["ppe_helmet", "⛑️ Κράνος"],
            ["ppe_gloves", "🧤 Γάντια"], ["ppe_glasses", "🥽 Γυαλιά"],
            ["ppe_shoes", "👟 Υποδήματα"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* LOTO */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">E. LOTO</h2>
        <div className="space-y-2">
          {[
            ["loto_ac", "⚡ AC Απομόνωση"], ["loto_pv", "☀️ PV DC Απομόνωση"],
            ["loto_battery", "🔋 Μπαταρία Απομόνωση"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Make-Safe Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">F. Ενέργειες Make-Safe</h2>
        <div className="space-y-2">
          {[
            ["f1_cover", "F1 – Κάλυψη/απομόνωση ηλεκτρολογικού"], ["f2_collect", "F2 – Συλλογή/σταθεροποίηση γυαλιού"],
            ["f3_stabilize", "F3 – Σταθεροποίηση δομικού"], ["f4_isolate", "F4 – Απομόνωση PV/Μπαταρίας"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">G. Φωτογραφίες</h2>
        <PhotoUpload
          photos={fd.photos || []}
          onChange={urls => set("photos", urls)}
          label="Φωτογραφίες πριν / μετά"
        />
      </div>

      {/* Pending / Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">H. Εκκρεμότητες</h2>
        <Field label="Εκκρεμότητες / Απαιτούμενες διορθωτικές">
          <Textarea value={fd.pending_corrective} onChange={e => set("pending_corrective", e.target.value)} placeholder="Εκκρεμότητες..." rows={3} />
        </Field>
        <Field label="Σχόλια HD/IM">
          <Textarea value={fd.doc_hd_comments} onChange={e => set("doc_hd_comments", e.target.value)} placeholder="Σχόλια..." rows={2} />
        </Field>
      </div>

      {/* Documentation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">I. Τεκμηρίωση</h2>
        <div className="space-y-2">
          <ChkCard checked={fd.doc_photo_before} onChange={v => set("doc_photo_before", v)} label="📷 Φωτο ΠΡΙΝ" />
          <ChkCard checked={fd.doc_photo_after} onChange={v => set("doc_photo_after", v)} label="📷 Φωτο ΜΕΤΑ" />
          <ChkCard checked={fd.doc_make_safe_completed} onChange={v => set("doc_make_safe_completed", v)} label="✅ Make Safe COMPLETED" />
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">K. Υπογραφή</h2>
        <SignaturePad
          value={fd.signature}
          onChange={val => set("signature", val)}
          label="Υπογραφή Τεχνικού"
        />
        <Field label="Ονοματεπώνυμο Τεχνικού">
          <Input value={fd.sig_tech} onChange={e => set("sig_tech", e.target.value)} placeholder="Πλήρες όνομα..." className="h-11" />
        </Field>
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