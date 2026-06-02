import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send, WifiOff } from "lucide-react";
import SignaturePad from "./SignaturePad";
import PhotoUpload from "./PhotoUpload";
import { inspectionDefaultData as defaultData } from "@/lib/formSchemas";

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

// A single inspection row: label + text input for "quality check" value
function InspRow({ label, fieldKey, fd, set, placeholder = "Κατάσταση" }) {
  return (
    <div className="flex items-center gap-2 py-1 border-b border-slate-100 last:border-0">
      <span className="flex-1 text-xs text-slate-700">{label}</span>
      <Input
        value={fd[fieldKey] || ""}
        onChange={e => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        className="h-8 text-xs w-28 flex-shrink-0"
      />
    </div>
  );
}

function YesNoRow({ label, yesKey, noKey, fd, set }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <div className="flex gap-3 mt-1">
        <button type="button" onClick={() => { set(yesKey, true); set(noKey, false); }}
          className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${fd[yesKey] ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-700 border-slate-200"}`}>ΝΑΙ</button>
        <button type="button" onClick={() => { set(yesKey, false); set(noKey, true); }}
          className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${fd[noKey] ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-700 border-slate-200"}`}>ΟΧΙ</button>
      </div>
    </div>
  );
}

export default function MobileInspectionForm({ token, incident, asset, existingSubmission, onSubmitted }) {
  const storageKey = `inspection_draft_${token}`;

  const [fd, setFd] = useState(() => {
    const offline = (() => { try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; } })();
    return {
      ...defaultData,
      ...(existingSubmission?.form_data || {}),
      ...(offline || {}),
      aa_stegastrou: existingSubmission?.form_data?.aa_stegastrou || incident?.related_asset_name || asset?.asset_id || "",
      typos_stegastrou: existingSubmission?.form_data?.typos_stegastrou || asset?.installed_shelter_type || asset?.ordered_shelter_type || "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [offlineSaved, setOfflineSaved] = useState(false);

  const set = (key, val) => setFd(prev => ({ ...prev, [key]: val }));

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(fd)); }, [fd]);

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true); else setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${window.location.origin}/functions/submitFieldWorkerForm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          formData: { ...fd, signature_url: fd.signature, photo_urls: fd.photos || [] },
          status,
          workerName: fd.completed_by || fd.epalitheusi_onoma || 'Field Worker',
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

  return (
    <div className="space-y-4 pb-10">
      {offlineSaved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Draft αποθηκεύτηκε τοπικά
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      {/* Στοιχεία Εργασίας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Στοιχεία Εργασίας</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ημερομηνία"><Input type="date" value={fd.date_of_work} onChange={e => set("date_of_work", e.target.value)} className="h-11" /></Field>
          <Field label="Εκτελέστηκε από"><Input value={fd.completed_by} onChange={e => set("completed_by", e.target.value)} className="h-11" /></Field>
        </div>
        <Field label="Α/Α Στεγάστρου"><Input value={fd.aa_stegastrou} onChange={e => set("aa_stegastrou", e.target.value)} className="h-11" /></Field>
        <Field label="Τύπος Στεγάστρου"><Input value={fd.typos_stegastrou} onChange={e => set("typos_stegastrou", e.target.value)} className="h-11" /></Field>
      </div>

      {/* ΕΛΕΓΧΟΙ ΠΟΛΙΤΙΚΩΝ ΕΡΓΩΝ — ΠΕΖΟΔΡΟΜΙΟ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Έλεγχοι Πολιτικών Έργων — Πεζοδρόμιο</h2>
        <p className="text-xs text-slate-500 mb-2">Εισάγετε το αποτέλεσμα ελέγχου για κάθε στοιχείο.</p>
        <InspRow label="Τοποθέτηση πλακών πεζοδρομίου σύμφωνα με απαιτήσεις & ορθές πρακτικές" fieldKey="pez_plakes_pez" fd={fd} set={set} />
        <InspRow label="Τοποθετημένες πλάκες (m²)" fieldKey="pez_topothetes_plakes" fd={fd} set={set} placeholder="Ποσότητα" />
        <InspRow label="Σκυρόδεμα/κρασπέδο (m)" fieldKey="pez_skyrodeema" fd={fd} set={set} placeholder="Ποσότητα" />
        <InspRow label="Κράσπεδο πεζοδρομίου (m)" fieldKey="pez_kraspedo_pez" fd={fd} set={set} placeholder="Ποσότητα" />
        <InspRow label="Πλάκες όδευσης τυφλών σύμφωνα με προδιαγραφές" fieldKey="pez_plakes_tyflon_check" fd={fd} set={set} />
        <InspRow label="Πλάκες όδευσης τυφλών (m²)" fieldKey="pez_plakes_tyflon" fd={fd} set={set} placeholder="Ποσότητα" />
        <InspRow label="Άλλες πλάκες (m²)" fieldKey="pez_alles_plakes" fd={fd} set={set} placeholder="Ποσότητα" />
        <InspRow label="Γείωση (κιβώτιο γείωσης & ράβδος) σωστά εγκατεστημένα" fieldKey="pez_geiosi" fd={fd} set={set} />
        <InspRow label="Αποκατάσταση πεζοδρομίου και καθαριότητα" fieldKey="pez_apokatastasi" fd={fd} set={set} />
      </div>

      {/* Κύρια Κατασκευή */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Έλεγχοι Στεγάστρου — Κύρια Κατασκευή</h2>
        <InspRow label="Το στέγαστρο είναι οριζοντιωμένο & ασφαλώς στερεωμένο" fieldKey="kat_stegaztro_oriz" fd={fd} set={set} />
        <InspRow label="Βίδες/κοχλίες βαμμένοι" fieldKey="kat_vides" fd={fd} set={set} />
        <InspRow label="Κενά μεταξύ πάνελ ≤ 3 mm (±2 mm)" fieldKey="kat_kena" fd={fd} set={set} />
        <InspRow label="Καθαριότητα" fieldKey="kat_kathariothta" fd={fd} set={set} />
      </div>

      {/* Πυλώνας Πόρτας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Πυλώνας Πόρτας</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="pil_domiki" fd={fd} set={set} />
        <InspRow label="Στήριξη υαλοπίνακα" fieldKey="pil_stiriksi" fd={fd} set={set} />
        <InspRow label="Στεγανοποίηση/λάστιχα στήριξης" fieldKey="pil_steganopoi" fd={fd} set={set} />
        <InspRow label="Λειτουργία μεντεσέδων OK" fieldKey="pil_menteseedes" fd={fd} set={set} />
        <InspRow label="Λειτουργία κλειδαριάς OK" fieldKey="pil_kleidaria" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="pil_vafi" fd={fd} set={set} />
      </div>

      {/* Κατασκευή Πόρτας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Κατασκευή Πόρτας</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="porta_domiki" fd={fd} set={set} />
        <InspRow label="Στήριξη υαλοπίνακα" fieldKey="porta_stiriksi" fd={fd} set={set} />
        <InspRow label="Στεγανοποίηση/λάστιχα στήριξης" fieldKey="porta_steganopoi" fd={fd} set={set} />
        <InspRow label="Λειτουργία μεντεσέδων OK" fieldKey="porta_menteseedes" fd={fd} set={set} />
        <InspRow label="Λειτουργία κλειδαριάς OK" fieldKey="porta_kleidaria" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="porta_vafi" fd={fd} set={set} />
      </div>

      {/* Σήμανση Πορτών */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Σήμανση Πορτών</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="siman_domiki" fd={fd} set={set} />
        <InspRow label="Στήριξη υαλοπίνακα" fieldKey="siman_stiriksi" fd={fd} set={set} />
        <InspRow label="Στεγανοποίηση/λάστιχα στήριξης" fieldKey="siman_steganopoi" fd={fd} set={set} />
        <InspRow label="Λειτουργία μεντεσέδων OK" fieldKey="siman_menteseedes" fd={fd} set={set} />
        <InspRow label="Λειτουργία κλειδαριάς OK" fieldKey="siman_kleidaria" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="siman_vafi" fd={fd} set={set} />
      </div>

      {/* Οροφή */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Οροφή</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="orofi_domiki" fd={fd} set={set} />
        <InspRow label="Καλύμματα οροφής τοποθετημένα, χωρίς ζημιές (συμπ. φωτιστικών)" fieldKey="orofi_kalimmata" fd={fd} set={set} />
        <InspRow label="Στεγανοποίηση με σιλικόνη" fieldKey="orofi_steganopoi" fd={fd} set={set} />
        <InspRow label="Φωτοβολταϊκά πάνελ εγκατεστημένα" fieldKey="orofi_pv" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="orofi_vafi" fd={fd} set={set} />
      </div>

      {/* Παγκάκι */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Παγκάκι</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="pagk_domiki" fd={fd} set={set} />
        <InspRow label="Βερνίκι και αποστάσεις/αρμοί εξαρτημάτων OK" fieldKey="pagk_verniki" fd={fd} set={set} />
        <InspRow label="Εγκατάσταση πλευρικού πάνελ" fieldKey="pagk_pleuriko" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="pagk_vafi" fd={fd} set={set} />
      </div>

      {/* Light Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Light Box</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="lb_domiki" fd={fd} set={set} />
        <InspRow label="Ακρυλική πινακίδα στη θέση της" fieldKey="lb_acryliki" fd={fd} set={set} />
        <InspRow label="Λειτουργία κλειδαριάς OK" fieldKey="lb_kleidaria" fd={fd} set={set} />
        <InspRow label="Λειτουργία μεντεσέδων OK" fieldKey="lb_menteseedes" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="lb_vafi" fd={fd} set={set} />
      </div>

      {/* Περιμετρικά Πάνελ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Περιμετρικά Πάνελ</h2>
        <InspRow label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" fieldKey="per_domiki" fd={fd} set={set} />
        <InspRow label="Ποιότητα βαφής" fieldKey="per_vafi" fd={fd} set={set} />
      </div>

      {/* Αυτοκόλλητα & Glazzing */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Αυτοκόλλητα & Glazzing</h2>
        <InspRow label="Τοποθέτηση αυτοκόλλητων OK" fieldKey="auto_topothesi" fd={fd} set={set} />
        <InspRow label="Τοποθέτηση υαλοπίνακα με σιλικόνη Sieland" fieldKey="glazz_topothesi" fd={fd} set={set} />
      </div>

      {/* Κάδος & Βάση Ποδηλάτων */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Κάδος Απορριμμάτων & Βάση Ποδηλάτων</h2>
        <InspRow label="Εγκατάσταση κάδου απορριμμάτων" fieldKey="kados_egkat" fd={fd} set={set} />
        <InspRow label="Εγκατάσταση βάσης ποδηλάτων" fieldKey="vasipod_egkat" fd={fd} set={set} />
      </div>

      {/* Οριζόντια Σήμανση */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Οριζόντια Σήμανση & Λοιπά</h2>
        <InspRow label="Τοποθέτηση οριζόντιας σήμανσης" fieldKey="oriz_topothesi" fd={fd} set={set} />
        <InspRow label="Τύπος οριζόντιας σήμανσης" fieldKey="oriz_typos" fd={fd} set={set} placeholder="Δείγμα" />
      </div>

      {/* Κατάσταση Περιστατικού */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Κατάσταση Περιστατικού</h2>

        <YesNoRow label="ΑΝΟΙΓΕΙ INCIDENT" yesKey="anoigei_incident_nai" noKey="anoigei_incident_ochi" fd={fd} set={set} />

        <div>
          <YesNoRow label="Δυνατή άμεση αποκατάσταση;" yesKey="amesi_apokatastasi_nai" noKey="amesi_apokatastasi_ochi" fd={fd} set={set} />
          <p className="text-xs text-slate-500 mt-2 mb-1">Εάν εκκρεμεί χρειάζεται:</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => set("ekkremes_civil", !fd.ekkremes_civil)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.ekkremes_civil ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>Civil</button>
            <button type="button" onClick={() => set("ekkremes_hlektrologos", !fd.ekkremes_hlektrologos)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.ekkremes_hlektrologos ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>Ηλεκτρολόγο</button>
          </div>
        </div>

        <div>
          <YesNoRow label="Μπορεί να κλείσει το περιστατικό;" yesKey="kleisimo_nai" noKey="kleisimo_ochi" fd={fd} set={set} />
          <p className="text-xs text-slate-500 mt-2 mb-1">Φωτογραφίες από επιθεώρηση:</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => set("photo_prin", !fd.photo_prin)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.photo_prin ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>Πριν</button>
            <button type="button" onClick={() => set("photo_meta", !fd.photo_meta)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.photo_meta ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>Μετά</button>
          </div>
        </div>

        <YesNoRow label="ΕΓΓΥΗΣΗ" yesKey="eggyhsh_nai" noKey="eggyhsh_ochi" fd={fd} set={set} />
      </div>

      {/* Σχόλια */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Σχόλια</h2>
        <Field label="Σχόλια"><Textarea value={fd.sxolia} onChange={e => set("sxolia", e.target.value)} rows={3} placeholder="Σχόλια..." /></Field>
        <Field label="Εάν κλείσει κατά την αξιολόγηση, αναφέρετε τις εργασίες που εκτελέστηκαν">
          <Textarea value={fd.ergazies_pou_ektelesan} onChange={e => set("ergazies_pou_ektelesan", e.target.value)} rows={3} placeholder="Περιγραφή εργασιών..." />
        </Field>
      </div>

      {/* Φωτογραφίες */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Φωτογραφίες</h2>
        <PhotoUpload photos={fd.photos || []} onChange={urls => set("photos", urls)} label="Φωτογραφίες επιθεώρησης" />
      </div>

      {/* Επαλήθευση */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Επαλήθευση</h2>
        <Field label="Ονοματεπώνυμο"><Input value={fd.epalitheusi_onoma} onChange={e => set("epalitheusi_onoma", e.target.value)} className="h-11" /></Field>
        <Field label="Ημερομηνία"><Input type="date" value={fd.epalitheusi_imerominia} onChange={e => set("epalitheusi_imerominia", e.target.value)} className="h-11" /></Field>
        <SignaturePad value={fd.signature} onChange={val => set("signature", val)} label="Υπογραφή" />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-12 gap-2" onClick={() => submit('Draft')} disabled={saving || submitting}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Αποθήκευση
        </Button>
        <Button className="flex-1 h-12 gap-2 bg-blue-700 hover:bg-blue-800" onClick={() => submit('Submitted')} disabled={saving || submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Υποβολή
        </Button>
      </div>
    </div>
  );
}