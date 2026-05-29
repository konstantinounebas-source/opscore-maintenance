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

import { makeSafeDefaultData as defaultData } from "@/lib/formSchemas";

export default function MobileMakeSafeForm({ token, incident, asset, existingSubmission, onSubmitted }) {
  const storageKey = `make_safe_draft_${token}`;

  const [fd, setFd] = useState(() => {
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

  const generateAndUploadPDF = async (submissionId, token) => {
    try {
      // Generate PDF HTML from backend
      const pdfRes = await base44.functions.invoke('generateFieldWorkerFormPDF', { submissionId });
      if (!pdfRes.data?.html) return;

      // Generate PDF client-side
      const html2pdf = (await import('html2pdf.js')).default;
      const container = document.createElement('div');
      container.innerHTML = pdfRes.data.html;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const pdfBlob = await html2pdf()
        .set({
          margin: 0,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        })
        .from(container)
        .outputPdf('blob');

      document.body.removeChild(container);

      // Upload PDF
      const pdfFile = new File([pdfBlob], pdfRes.data.fileName || 'form.pdf', { type: 'application/pdf' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file: pdfFile });

      // Attach to incident via backend function
      const decoded = atob(token);
      const incidentId = decoded.split(':')[0];
      
      await base44.functions.invoke('attachFieldWorkerFormPDF', {
        incidentId,
        submissionId,
        pdfUrl: uploadRes.file_url,
        pdfName: pdfRes.data.fileName,
      });
    } catch (err) {
      console.error('Failed to generate/upload PDF:', err);
      // Don't fail the submission - PDF is optional
    }
  };

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true);
    else setSaving(true);
    setError(null);
    try {
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
        // Generate and upload PDF after successful submission
        await generateAndUploadPDF(res.data.id, token);
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

      {/* A. ΣΤΟΙΧΕΙΑ */}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ώρα Άφιξης">
            <Input type="time" value={fd.time_arrival} onChange={e => set("time_arrival", e.target.value)} className="h-11" />
          </Field>
          <Field label="Ώρα Ολοκλήρωσης">
            <Input type="time" value={fd.time_end} onChange={e => set("time_end", e.target.value)} className="h-11" />
          </Field>
        </div>
        <Field label="Όχημα">
          <Input value={fd.vehicle} onChange={e => set("vehicle", e.target.value)} placeholder="Αρ. κυκλοφορίας..." className="h-11" />
        </Field>
      </div>

      {/* B. STOP & ASSESS */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">B. Stop & Assess</h2>
        <ChkCard checked={fd.check_360} onChange={v => set("check_360", v)} label="360° έλεγχος" />
        <Field label="Είδος Κινδύνου">
          <div className="space-y-2">
            <ChkCard checked={fd.danger_electrical} onChange={v => set("danger_electrical", v)} label="⚡ Ηλεκτρολογικός" />
            <ChkCard checked={fd.danger_glass} onChange={v => set("danger_glass", v)} label="🪟 Γυαλί" />
            <ChkCard checked={fd.danger_structural} onChange={v => set("danger_structural", v)} label="🏗️ Δομικός" />
            <ChkCard checked={fd.danger_pv} onChange={v => set("danger_pv", v)} label="☀️ PV / Μπαταρία" />
            <ChkCard checked={fd.danger_other} onChange={v => set("danger_other", v)} label="Άλλο" />
            {fd.danger_other && (
              <Input value={fd.danger_other_text} onChange={e => set("danger_other_text", e.target.value)} placeholder="Περιγράψτε..." className="h-11" />
            )}
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

      {/* C. PPE & ΕΞΟΠΛΙΣΜΟΣ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">C. PPE & Εξοπλισμός</h2>
        <div className="space-y-2">
          {[
            ["ppe_vest", "🦺 Γιλέκο"], ["ppe_helmet", "⛑️ Κράνος"],
            ["ppe_gloves", "🧤 Γάντια"], ["ppe_glasses", "🥽 Γυαλιά"],
            ["ppe_shoes", "👟 Υποδήματα"], ["ppe_mask", "😷 Μάσκα"],
            ["ppe_extinguisher", "🧯 Πυροσβεστήρας"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
          <ChkCard checked={fd.ppe_all} onChange={v => set("ppe_all", v)} label="✓ Όλα τα παραπάνω" />
        </div>
        <div className="space-y-2 mt-3">
          <ChkCard checked={fd.eq_cones} onChange={v => set("eq_cones", v)} label="🔶 Κιτ σήμανσης/αποκλεισμού (Κώνοι/κορδέλες)" />
          <ChkCard checked={fd.eq_loto_kit} onChange={v => set("eq_loto_kit", v)} label="🔒 LOTO kit (Lock/Tag)" />
          <ChkCard checked={fd.eq_all} onChange={v => set("eq_all", v)} label="✓ Όλα τα παραπάνω" />
          <ChkCard checked={fd.eq_other} onChange={v => set("eq_other", v)} label="Άλλο" />
          {fd.eq_other && (
            <Input value={fd.eq_other_text} onChange={e => set("eq_other_text", e.target.value)} placeholder="Περιγράψτε..." className="h-11" />
          )}
        </div>
      </div>

      {/* D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">D. Ασφάλιση Περιοχής</h2>
        <div className="space-y-2">
          <ChkCard checked={fd.tmp1} onChange={v => set("tmp1", v)} label="TMP-1: Ασφάλιση περιμέτρου στάσης (διατήρηση διέλευσης πεζών)" />
          <ChkCard checked={fd.tmp2} onChange={v => set("tmp2", v)} label="TMP-2: Ασφάλιση περιμέτρου στάσης (εκτροπή πεζών)" />
          <ChkCard checked={fd.tmp3} onChange={v => set("tmp3", v)} label="TMP-3: Προσωρινά καλύμματα πάνω από εκσκαφές" />
          <ChkCard checked={fd.tmp4} onChange={v => set("tmp4", v)} label="TMP-4: Προσωρινές ξύλινες διαβάσεις πεζών" />
        </div>
        <div className="space-y-2 mt-3">
          <ChkCard checked={fd.tmr1} onChange={v => set("tmr1", v)} label="TMR-1: Ασφάλιση εσοχής στάσης (bus stop bay)" />
          <ChkCard checked={fd.tmr2} onChange={v => set("tmr2", v)} label="TMR-2: Προσωρινή στάθμευση οχήματος εργασιών" />
          <ChkCard checked={fd.tmr3} onChange={v => set("tmr3", v)} label="TMR-3: Ρύθμιση κυκλοφορίας με πινακίδες Stop/Go" />
        </div>
        <div className="space-y-2 mt-3">
          <ChkCard checked={fd.tmbs1} onChange={v => set("tmbs1", v)} label="TMBS-1: Προσωρινή στάση λεωφορείου" />
          <ChkCard checked={fd.tmbs2} onChange={v => set("tmbs2", v)} label="TMBS-2: Προσωρινά μη εξυπηρετούμενη στάση" />
        </div>
        <div className="space-y-2 mt-3">
          <Label className="text-xs font-semibold">Συντονισμός με:</Label>
          <ChkCard checked={fd.coord_police} onChange={v => set("coord_police", v)} label="👮 Αστυνομία" />
          <ChkCard checked={fd.coord_municipality} onChange={v => set("coord_municipality", v)} label="🏛️ Δήμος" />
          <ChkCard checked={fd.coord_other} onChange={v => set("coord_other", v)} label="Άλλο" />
          {fd.coord_other && (
            <Input value={fd.coord_other_text} onChange={e => set("coord_other_text", e.target.value)} placeholder="Περιγράψτε..." className="h-11" />
          )}
        </div>
      </div>

      {/* E. LOTO */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">E. LOTO</h2>
        <div className="space-y-2">
          <ChkCard checked={fd.loto_ac} onChange={v => set("loto_ac", v)} label="⚡ AC" />
          <ChkCard checked={fd.loto_pv} onChange={v => set("loto_pv", v)} label="☀️ PV DC" />
          <ChkCard checked={fd.loto_battery} onChange={v => set("loto_battery", v)} label="🔋 Μπαταρία" />
          <ChkCard checked={fd.loto_other} onChange={v => set("loto_other", v)} label="Άλλο" />
          {fd.loto_other && (
            <Input value={fd.loto_other_text} onChange={e => set("loto_other_text", e.target.value)} placeholder="Περιγράψτε..." className="h-11" />
          )}
        </div>
        <ChkCard checked={fd.loto_isolation} onChange={v => set("loto_isolation", v)} label="Απομόνωση / απενεργοποίηση" />
        <ChkCard checked={fd.loto_lock_tag} onChange={v => set("loto_lock_tag", v)} label="Lock + Tag" />
        {fd.loto_lock_tag && (
          <Field label="Όνομα/Ώρα">
            <Input value={fd.loto_lock_tag_name} onChange={e => set("loto_lock_tag_name", e.target.value)} placeholder="Όνομα / Ώρα..." className="h-11" />
          </Field>
        )}
        <ChkCard checked={fd.loto_confirm} onChange={v => set("loto_confirm", v)} label="Επιβεβαίωση ασφαλούς κατάστασης" />
        <Field label="Παρατηρήσεις">
          <Textarea value={fd.loto_notes} onChange={e => set("loto_notes", e.target.value)} placeholder="Σχόλια..." rows={2} />
        </Field>
      </div>

      {/* F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">F. Ενέργειες Make-Safe</h2>
        <div className="space-y-2">
          <div className="font-semibold text-xs text-slate-600">F1 Ηλεκτρ.:</div>
          <ChkCard checked={fd.f1_cover} onChange={v => set("f1_cover", v)} label="Κάλυψη/απομόνωση" />
          <ChkCard checked={fd.f1_panel_lock} onChange={v => set("f1_panel_lock", v)} label="Κλείδωμα πίνακα / αποτροπή πρόσβασης" />
        </div>
        <div className="space-y-2 mt-3">
          <div className="font-semibold text-xs text-slate-600">F2 Γυαλί:</div>
          <ChkCard checked={fd.f2_collect} onChange={v => set("f2_collect", v)} label="Συλλογή" />
          <ChkCard checked={fd.f2_stabilize} onChange={v => set("f2_stabilize", v)} label="Σταθεροποίηση/αφαίρεση" />
          <ChkCard checked={fd.f2_cover} onChange={v => set("f2_cover", v)} label="Κάλυψη + αποκλεισμός" />
        </div>
        <div className="space-y-2 mt-3">
          <div className="font-semibold text-xs text-slate-600">F3 Δομικό:</div>
          <ChkCard checked={fd.f3_stabilize} onChange={v => set("f3_stabilize", v)} label="Σταθεροποίηση" />
          <ChkCard checked={fd.f3_remove} onChange={v => set("f3_remove", v)} label="Αφαίρεση χαλαρών μερών" />
        </div>
        <div className="space-y-2 mt-3">
          <div className="font-semibold text-xs text-slate-600">F4 PV/Μπατ.:</div>
          <ChkCard checked={fd.f4_isolate} onChange={v => set("f4_isolate", v)} label="Απομόνωση" />
          <Field label="Θερμικό/οσμές/φούσκωμα;">
            <div className="flex gap-3">
              {["yes", "no"].map(val => (
                <button key={val} type="button" onClick={() => set("f4_thermal", val)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                    fd.f4_thermal === val
                      ? val === "yes" ? "bg-red-600 text-white border-red-600" : "bg-green-600 text-white border-green-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}>
                  {val === "yes" ? "ΝΑΙ" : "ΟΧΙ"}
                </button>
              ))}
            </div>
          </Field>
          {fd.f4_thermal === "yes" && (
            <ChkCard checked={fd.f4_evacuate} onChange={v => set("f4_evacuate", v)} label="Απομάκρυνση κοινού + ενημέρωση Help Desk/Maintenance Supervisor" />
          )}
          <ChkCard checked={fd.f4_full_removal} onChange={v => set("f4_full_removal", v)} label="Ολική αφαίρεση Στάσης" />
        </div>
        <Field label="F5 Άλλο">
          <Textarea value={fd.f5_other} onChange={e => set("f5_other", e.target.value)} placeholder="Περιγράψτε..." rows={2} />
        </Field>
      </div>

      {/* G. ΕΙΔΙΚΟ ΟΧΗΜΑ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">G. Ειδικό Όχημα / Εξοπλισμός</h2>
        <div className="flex gap-3">
          <button type="button" onClick={() => { set("vehicle_none", true); set("vehicle_yes", false); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${
              fd.vehicle_none ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-600 border-slate-200"
            }`}>Όχι</button>
          <button type="button" onClick={() => { set("vehicle_none", false); set("vehicle_yes", true); }}
            className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${
              fd.vehicle_yes ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-600 border-slate-200"
            }`}>Ναι</button>
        </div>
        {fd.vehicle_yes && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Τύπος:</Label>
            <ChkCard checked={fd.veh_cherry} onChange={v => set("veh_cherry", v)} label="Cherry picker" />
            <ChkCard checked={fd.veh_crane} onChange={v => set("veh_crane", v)} label="Crane" />
            <ChkCard checked={fd.veh_other} onChange={v => set("veh_other", v)} label="Άλλο" />
            {fd.veh_other && (
              <Input value={fd.veh_other_text} onChange={e => set("veh_other_text", e.target.value)} placeholder="Περιγράψτε..." className="h-11" />
            )}
            <Field label="Αιτιολόγηση">
              <Textarea value={fd.veh_justification} onChange={e => set("veh_justification", e.target.value)} placeholder="Αιτιολόγηση..." rows={2} />
            </Field>
          </div>
        )}
      </div>

      {/* H. Εκκρεμότητες */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">H. Εκκρεμότητες / Corrective</h2>
        <Field label="Εκκρεμότητες">
          <Textarea value={fd.pending_corrective} onChange={e => set("pending_corrective", e.target.value)} placeholder="Εκκρεμότητες..." rows={3} />
        </Field>
      </div>

      {/* I. ΤΕΚΜΗΡΙΩΣΗ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">I. Τεκμηρίωση & WM</h2>
        <div className="space-y-2">
          <ChkCard checked={fd.doc_photo_before} onChange={v => set("doc_photo_before", v)} label="📷 Φωτο ΠΡΙΝ" />
          <ChkCard checked={fd.doc_photo_after} onChange={v => set("doc_photo_after", v)} label="📷 Φωτο ΜΕΤΑ (με σήμανση)" />
          <ChkCard checked={fd.doc_wm} onChange={v => set("doc_wm", v)} label="💻 Καταχώρηση ενεργειών στο WM" />
        </div>
        <ChkCard checked={fd.doc_materials} onChange={v => set("doc_materials", v)} label="Υλικά προσωρινής ασφάλειας" />
        {fd.doc_materials && (
          <Field label="Υλικά">
            <Input value={fd.doc_materials_text} onChange={e => set("doc_materials_text", e.target.value)} placeholder="Υλικά..." className="h-11" />
          </Field>
        )}
        <ChkCard checked={fd.doc_make_safe_completed} onChange={v => set("doc_make_safe_completed", v)} label="✅ Make Safe WO COMPLETED" />
        <Field label="Ενημέρωση HD/IM Σχόλια">
          <Textarea value={fd.doc_hd_comments} onChange={e => set("doc_hd_comments", e.target.value)} placeholder="Σχόλια..." rows={2} />
        </Field>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Φωτογραφίες</h2>
        <PhotoUpload
          photos={fd.photos || []}
          onChange={urls => set("photos", urls)}
          label="Φωτογραφίες πριν / μετά"
        />
      </div>

      {/* K. ΥΠΟΓΡΑΦΕΣ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">K. Υπογραφές</h2>
        <Field label="Τεχνικός">
          <Input value={fd.sig_tech} onChange={e => set("sig_tech", e.target.value)} placeholder="Ονοματεπώνυμο..." className="h-11" />
        </Field>
        <SignaturePad
          value={fd.signature}
          onChange={val => set("signature", val)}
          label="Υπογραφή Τεχνικού"
        />
        <Field label="HD / Maintenance Supervisor">
          <Input value={fd.sig_hd} onChange={e => set("sig_hd", e.target.value)} placeholder="Ονοματεπώνυμο..." className="h-11" />
        </Field>
        <Field label="Ημερομηνία">
          <Input type="date" value={fd.sig_date} onChange={e => set("sig_date", e.target.value)} className="h-11" />
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