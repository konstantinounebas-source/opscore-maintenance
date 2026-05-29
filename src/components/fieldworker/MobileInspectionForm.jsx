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

function YesNoRow({ label, yesKey, noKey, fd, set }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      <div className="flex gap-3 mt-1">
        <button type="button" onClick={() => { set(yesKey, true); set(noKey, false); }}
          className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${fd[yesKey] ? "bg-green-600 text-white border-green-600" : "bg-white text-slate-700 border-slate-200"}`}>
          ΝΑΙ
        </button>
        <button type="button" onClick={() => { set(yesKey, false); set(noKey, true); }}
          className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors ${fd[noKey] ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-700 border-slate-200"}`}>
          ΟΧΙ
        </button>
      </div>
    </div>
  );
}

// A row with a label, a check toggle, and an optional text input for status
function CheckRow({ label, checkKey, statusKey, fd, set }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => set(checkKey, !fd[checkKey])}
        className={`flex-shrink-0 w-8 h-8 rounded border-2 flex items-center justify-center text-sm font-bold transition-all ${
          fd[checkKey] ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-400"
        }`}
      >
        {fd[checkKey] ? "✓" : ""}
      </button>
      <span className="text-xs text-slate-700 flex-1">{label}</span>
      {statusKey && (
        <Input
          value={fd[statusKey] || ""}
          onChange={e => set(statusKey, e.target.value)}
          placeholder="Κατάσταση"
          className="h-8 text-xs w-28 flex-shrink-0"
        />
      )}
    </div>
  );
}

const defaultData = {
  date_of_work: "", completed_by: "", workorder_no: "", aa_stegastrou: "", typos_stegastrou: "",

  // Πεζοδρόμιο
  pez_plakes_pez: "", pez_topothetes_plakes: "", pez_skyrodeema: "", pez_kraspedo_pez: "",
  pez_plakes_tyflon: "", pez_plakes_tyflon_check: "", pez_alles_plakes: "", pez_geiosi: "",
  pez_apokatastasi: "",

  // Κύρια Κατασκευή
  kat_stegaztro_oriz: "", kat_vides: "", kat_kena: "", kat_kathariothta: "",

  // Πυλώνας Πόρτας
  pil_domiki: "", pil_stiriksi: "", pil_steganopoi: "", pil_menteseedes: "", pil_kleidaria: "", pil_vafi: "",

  // Κατασκευή Πόρτας
  porta_domiki: "", porta_stiriksi: "", porta_steganopoi: "", porta_menteseedes: "", porta_kleidaria: "", porta_vafi: "",

  // Σήμανση Πορτών
  siman_domiki: "", siman_stiriksi: "", siman_steganopoi: "", siman_menteseedes: "", siman_kleidaria: "", siman_vafi: "",

  // Οροφή
  orofi_domiki: "", orofi_kalimmata: "", orofi_steganopoi: "", orofi_pv: "", orofi_vafi: "",

  // Παγκάκι
  pagk_domiki: "", pagk_verniki: "", pagk_pleuriko: "", pagk_vafi: "",

  // Light Box
  lb_domiki: "", lb_acryliki: "", lb_kleidaria: "", lb_menteseedes: "", lb_vafi: "",

  // Περιμετρικά Πάνελ
  per_domiki: "", per_vafi: "",

  // Λοιπά
  auto_topothesi: "", glazz_topothesi: "",
  kados_egkat: "", vasipod_egkat: "",
  oriz_topothesi: "", oriz_typos: "",

  // Κατάσταση
  anoigei_incident_nai: false, anoigei_incident_ochi: false,
  amesi_apokatastasi_nai: false, amesi_apokatastasi_ochi: false,
  ekkremes_civil: false, ekkremes_hlektrologos: false,
  kleisimo_nai: false, kleisimo_ochi: false,
  photo_prin: false, photo_meta: false,
  eggyhsh_nai: false, eggyhsh_ochi: false,

  sxolia: "",
  ergazies_pou_ektelesan: "",
  epalitheusi_onoma: "", epalitheusi_imerominia: "",

  photos: [],
  signature: "",
};

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

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(fd));
  }, [fd]);

  const submit = async (status) => {
    if (status === 'Submitted') setSubmitting(true);
    else setSaving(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('submitFieldWorkerForm', {
        token,
        formData: { ...fd, signature_url: fd.signature, photo_urls: fd.photos || [] },
        status,
        workerName: fd.completed_by || fd.epalitheusi_onoma || 'Field Worker',
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

      {/* Πεζοδρόμιο */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Έλεγχοι Πολιτικών Έργων — Πεζοδρόμιο</h2>
        <Field label="Τοποθέτηση πλακών πεζοδρομίου"><Input value={fd.pez_plakes_pez} onChange={e => set("pez_plakes_pez", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Τοποθετημένες πλάκες (m²)"><Input value={fd.pez_topothetes_plakes} onChange={e => set("pez_topothetes_plakes", e.target.value)} placeholder="Ποσότητα" className="h-11" /></Field>
        <Field label="Σκυρόδεμα/κρασπέδο (m)"><Input value={fd.pez_skyrodeema} onChange={e => set("pez_skyrodeema", e.target.value)} placeholder="Ποσότητα" className="h-11" /></Field>
        <Field label="Κράσπεδο πεζοδρομίου (m)"><Input value={fd.pez_kraspedo_pez} onChange={e => set("pez_kraspedo_pez", e.target.value)} placeholder="Ποσότητα" className="h-11" /></Field>
        <Field label="Πλάκες όδευσης τυφλών (m²)"><Input value={fd.pez_plakes_tyflon} onChange={e => set("pez_plakes_tyflon", e.target.value)} placeholder="Ποσότητα" className="h-11" /></Field>
        <Field label="Πλάκες όδευσης τυφλών σύμφωνα με προδιαγραφές"><Input value={fd.pez_plakes_tyflon_check} onChange={e => set("pez_plakes_tyflon_check", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Άλλες πλάκες (m²)"><Input value={fd.pez_alles_plakes} onChange={e => set("pez_alles_plakes", e.target.value)} placeholder="Ποσότητα" className="h-11" /></Field>
        <Field label="Γείωση (κιβώτιο γείωσης & ράβδος) σωστά εγκατεστημένα"><Input value={fd.pez_geiosi} onChange={e => set("pez_geiosi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Αποκατάσταση πεζοδρομίου και καθαριότητα"><Input value={fd.pez_apokatastasi} onChange={e => set("pez_apokatastasi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Κύρια Κατασκευή */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Έλεγχοι Στεγάστρου — Κύρια Κατασκευή</h2>
        <Field label="Το στέγαστρο είναι οριζοντιωμένο & ασφαλώς στερεωμένο"><Input value={fd.kat_stegaztro_oriz} onChange={e => set("kat_stegaztro_oriz", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Βίδες/κοχλίες βαμμένοι"><Input value={fd.kat_vides} onChange={e => set("kat_vides", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Κενά μεταξύ πάνελ ≤ 3 mm (±2 mm)"><Input value={fd.kat_kena} onChange={e => set("kat_kena", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Καθαριότητα"><Input value={fd.kat_kathariothta} onChange={e => set("kat_kathariothta", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Πυλώνας Πόρτας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Πυλώνας Πόρτας</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.pil_domiki} onChange={e => set("pil_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στήριξη υαλοπίνακα"><Input value={fd.pil_stiriksi} onChange={e => set("pil_stiriksi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στεγανοποίηση/λάστιχα στήριξης"><Input value={fd.pil_steganopoi} onChange={e => set("pil_steganopoi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία μεντεσέδων OK"><Input value={fd.pil_menteseedes} onChange={e => set("pil_menteseedes", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία κλειδαριάς OK"><Input value={fd.pil_kleidaria} onChange={e => set("pil_kleidaria", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.pil_vafi} onChange={e => set("pil_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Κατασκευή Πόρτας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Κατασκευή Πόρτας</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.porta_domiki} onChange={e => set("porta_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στήριξη υαλοπίνακα"><Input value={fd.porta_stiriksi} onChange={e => set("porta_stiriksi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στεγανοποίηση/λάστιχα στήριξης"><Input value={fd.porta_steganopoi} onChange={e => set("porta_steganopoi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία μεντεσέδων OK"><Input value={fd.porta_menteseedes} onChange={e => set("porta_menteseedes", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία κλειδαριάς OK"><Input value={fd.porta_kleidaria} onChange={e => set("porta_kleidaria", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.porta_vafi} onChange={e => set("porta_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Σήμανση Πορτών */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Σήμανση Πορτών</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.siman_domiki} onChange={e => set("siman_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στήριξη υαλοπίνακα"><Input value={fd.siman_stiriksi} onChange={e => set("siman_stiriksi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στεγανοποίηση/λάστιχα στήριξης"><Input value={fd.siman_steganopoi} onChange={e => set("siman_steganopoi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία μεντεσέδων OK"><Input value={fd.siman_menteseedes} onChange={e => set("siman_menteseedes", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία κλειδαριάς OK"><Input value={fd.siman_kleidaria} onChange={e => set("siman_kleidaria", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.siman_vafi} onChange={e => set("siman_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Οροφή */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Οροφή</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.orofi_domiki} onChange={e => set("orofi_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Καλύμματα οροφής τοποθετημένα, χωρίς ζημιές (συμπ. φωτιστικών)"><Input value={fd.orofi_kalimmata} onChange={e => set("orofi_kalimmata", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Στεγανοποίηση με σιλικόνη"><Input value={fd.orofi_steganopoi} onChange={e => set("orofi_steganopoi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Φωτοβολταϊκά πάνελ εγκατεστημένα"><Input value={fd.orofi_pv} onChange={e => set("orofi_pv", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.orofi_vafi} onChange={e => set("orofi_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Παγκάκι */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Παγκάκι</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.pagk_domiki} onChange={e => set("pagk_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Βερνίκι και αποστάσεις/αρμοί εξαρτημάτων OK"><Input value={fd.pagk_verniki} onChange={e => set("pagk_verniki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Εγκατάσταση πλευρικού πάνελ"><Input value={fd.pagk_pleuriko} onChange={e => set("pagk_pleuriko", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.pagk_vafi} onChange={e => set("pagk_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Light Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Light Box</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.lb_domiki} onChange={e => set("lb_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ακρυλική πινακίδα στη θέση της"><Input value={fd.lb_acryliki} onChange={e => set("lb_acryliki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία κλειδαριάς OK"><Input value={fd.lb_kleidaria} onChange={e => set("lb_kleidaria", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Λειτουργία μεντεσέδων OK"><Input value={fd.lb_menteseedes} onChange={e => set("lb_menteseedes", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.lb_vafi} onChange={e => set("lb_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Περιμετρικά Πάνελ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Περιμετρικά Πάνελ</h2>
        <Field label="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς"><Input value={fd.per_domiki} onChange={e => set("per_domiki", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Ποιότητα βαφής"><Input value={fd.per_vafi} onChange={e => set("per_vafi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Αυτοκόλλητα & Glazzing */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Αυτοκόλλητα & Glazzing</h2>
        <Field label="Τοποθέτηση αυτοκόλλητων OK"><Input value={fd.auto_topothesi} onChange={e => set("auto_topothesi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Τοποθέτηση υαλοπίνακα με σιλικόνη Sieland"><Input value={fd.glazz_topothesi} onChange={e => set("glazz_topothesi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Κάδος & Βάση Ποδηλάτων */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Κάδος Απορριμμάτων & Βάση Ποδηλάτων</h2>
        <Field label="Εγκατάσταση κάδου απορριμμάτων"><Input value={fd.kados_egkat} onChange={e => set("kados_egkat", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Εγκατάσταση βάσης ποδηλάτων"><Input value={fd.vasipod_egkat} onChange={e => set("vasipod_egkat", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
      </div>

      {/* Οριζόντια Σήμανση */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Οριζόντια Σήμανση</h2>
        <Field label="Τοποθέτηση οριζόντιας σήμανσης"><Input value={fd.oriz_topothesi} onChange={e => set("oriz_topothesi", e.target.value)} placeholder="Κατάσταση" className="h-11" /></Field>
        <Field label="Τύπος οριζόντιας σήμανσης"><Input value={fd.oriz_typos} onChange={e => set("oriz_typos", e.target.value)} placeholder="Τύπος" className="h-11" /></Field>
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
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.ekkremes_civil ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>
              Civil
            </button>
            <button type="button" onClick={() => set("ekkremes_hlektrologos", !fd.ekkremes_hlektrologos)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.ekkremes_hlektrologos ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>
              Ηλεκτρολόγο
            </button>
          </div>
        </div>

        <div>
          <YesNoRow label="Μπορεί να κλείσει το περιστατικό;" yesKey="kleisimo_nai" noKey="kleisimo_ochi" fd={fd} set={set} />
          <p className="text-xs text-slate-500 mt-2 mb-1">Φωτογραφίες από επιθεώρηση:</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => set("photo_prin", !fd.photo_prin)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.photo_prin ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>
              Πριν
            </button>
            <button type="button" onClick={() => set("photo_meta", !fd.photo_meta)}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${fd.photo_meta ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200"}`}>
              Μετά
            </button>
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