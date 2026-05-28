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
  date_of_work: "", completed_by: "", workorder_no: "", aa_stegastrou: "", typos_stegastrou: "",
  
  // Πεζοδρόμιο
  pez_plakes_pez: "", pez_topothetes_plakes: "", pez_skyrodeema: "", pez_kraspedo_pez: "",
  pez_plakes_tyflon: "", pez_plakes_tyflon_check: "", pez_alles_plakes: "", pez_geiosi: "",
  pez_apokatastasi: "",
  
  // Κύρια Κατασκευή
  kat_stegaztro_oriz: false, kat_vides: false, kat_kena: false, kat_kathariothta: false,
  
  // Πυλώνας Πόρτας
  pil_domiki: false, pil_stiriksi: false, pil_steganopoi: false, pil_menteseedes: false, pil_kleidaria: false, pil_vafi: false,
  
  // Κατασκευή Πόρτας
  porta_domiki: false, porta_stiriksi: false, porta_steganopoi: false, porta_menteseedes: false, porta_kleidaria: false, porta_vafi: false,
  
  // Σήμανση Πορτών
  siman_domiki: false, siman_stiriksi: false, siman_steganopoi: false, siman_menteseedes: false, siman_kleidaria: false, siman_vafi: false,
  
  // Οροφή
  orofi_domiki: false, orofi_kalimmata: false, orofi_steganopoi: false, orofi_pv: false, orofi_vafi: false,
  
  // Παγκάκι
  pagk_domiki: false, pagk_verniki: false, pagk_pleuriko: false, pagk_vafi: false,
  
  // Light Box
  lb_domiki: false, lb_acryliki: false, lb_kleidaria: false, lb_menteseedes: false, lb_vafi: false,
  
  // Περιμετρικά Πάνελ
  per_domiki: false, per_vafi: false,
  
  // Λοιπά
  auto_topothesi: false, glazz_topothesi: false, kados_egkat: false, vasipod_egkat: false,
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
      const formDataWithFiles = {
        ...fd,
        signature_url: fd.signature,
        photo_urls: fd.photos || [],
      };
      const res = await base44.functions.invoke('submitFieldWorkerForm', {
        token,
        formData: formDataWithFiles,
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

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Στοιχεία Εργασίας</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ημερομηνία"><Input type="date" value={fd.date_of_work} onChange={e => set("date_of_work", e.target.value)} className="h-11" /></Field>
          <Field label="Εκτελέστηκε από"><Input value={fd.completed_by} onChange={e => set("completed_by", e.target.value)} className="h-11" /></Field>
        </div>
        <Field label="Α/Α Στεγάστρου"><Input value={fd.aa_stegastrou || asset?.asset_id || ''} onChange={e => set("aa_stegastrou", e.target.value)} className="h-11" /></Field>
        <Field label="Τύπος Στεγάστρου"><Input value={fd.typos_stegastrou || asset?.shelter_type || ''} onChange={e => set("typos_stegastrou", e.target.value)} className="h-11" /></Field>
      </div>

      {/* Πεζοδρόμιο */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Πεζοδρόμιο</h2>
        <Field label="Τοποθέτηση πλακών πεζοδρομίου"><Input value={fd.pez_plakes_pez} onChange={e => set("pez_plakes_pez", e.target.value)} className="h-11" /></Field>
        <Field label="Τοποθετημένες πλάκες (m²)"><Input value={fd.pez_topothetes_plakes} onChange={e => set("pez_topothetes_plakes", e.target.value)} className="h-11" /></Field>
        <Field label="Σκυρόδεμα/κρασπέδο (m)"><Input value={fd.pez_skyrodeema} onChange={e => set("pez_skyrodeema", e.target.value)} className="h-11" /></Field>
        <Field label="Κράσπεδο πεζοδρομίου (m)"><Input value={fd.pez_kraspedo_pez} onChange={e => set("pez_kraspedo_pez", e.target.value)} className="h-11" /></Field>
        <Field label="Πλάκες όδευσης τυφλών (m²)"><Input value={fd.pez_plakes_tyflon} onChange={e => set("pez_plakes_tyflon", e.target.value)} className="h-11" /></Field>
        <ChkCard checked={fd.pez_plakes_tyflon_check} onChange={v => set("pez_plakes_tyflon_check", v)} label="Πλάκες όδευσης τυφλών σύμφωνα με προδιαγραφές" />
        <Field label="Άλλες πλάκες (m²)"><Input value={fd.pez_alles_plakes} onChange={e => set("pez_alles_plakes", e.target.value)} className="h-11" /></Field>
        <ChkCard checked={fd.pez_geiosi} onChange={v => set("pez_geiosi", v)} label="Γείωση σωστά εγκατεστημένα" />
        <ChkCard checked={fd.pez_apokatastasi} onChange={v => set("pez_apokatastasi", v)} label="Αποκατάσταση πεζοδρομίου και καθαριότητα" />
      </div>

      {/* Κύρια Κατασκευή through Λοιπά - following same pattern */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Κύρια Κατασκευή</h2>
        <ChkCard checked={fd.kat_stegaztro_oriz} onChange={v => set("kat_stegaztro_oriz", v)} label="Το στέγαστρο είναι οριζοντιωμένο & ασφαλώς στερεωμένο" />
        <ChkCard checked={fd.kat_vides} onChange={v => set("kat_vides", v)} label="Βίδες/κοχλίες βαμμένοι" />
        <ChkCard checked={fd.kat_kena} onChange={v => set("kat_kena", v)} label="Κενά μεταξύ πάνελ ≤ 3 mm" />
        <ChkCard checked={fd.kat_kathariothta} onChange={v => set("kat_kathariothta", v)} label="Καθαριότητα" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Πυλώνας Πόρτας</h2>
        <ChkCard checked={fd.pil_domiki} onChange={v => set("pil_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.pil_stiriksi} onChange={v => set("pil_stiriksi", v)} label="Στήριξη υαλοπίνακα" />
        <ChkCard checked={fd.pil_steganopoi} onChange={v => set("pil_steganopoi", v)} label="Στεγανοποίηση/λάστιχα" />
        <ChkCard checked={fd.pil_menteseedes} onChange={v => set("pil_menteseedes", v)} label="Λειτουργία μεντεσέδων OK" />
        <ChkCard checked={fd.pil_kleidaria} onChange={v => set("pil_kleidaria", v)} label="Λειτουργία κλειδαριάς OK" />
        <ChkCard checked={fd.pil_vafi} onChange={v => set("pil_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Κατασκευή Πόρτας</h2>
        <ChkCard checked={fd.porta_domiki} onChange={v => set("porta_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.porta_stiriksi} onChange={v => set("porta_stiriksi", v)} label="Στήριξη υαλοπίνακα" />
        <ChkCard checked={fd.porta_steganopoi} onChange={v => set("porta_steganopoi", v)} label="Στεγανοποίηση" />
        <ChkCard checked={fd.porta_menteseedes} onChange={v => set("porta_menteseedes", v)} label="Λειτουργία μεντεσέδων OK" />
        <ChkCard checked={fd.porta_kleidaria} onChange={v => set("porta_kleidaria", v)} label="Λειτουργία κλειδαριάς OK" />
        <ChkCard checked={fd.porta_vafi} onChange={v => set("porta_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Σήμανση Πορτών</h2>
        <ChkCard checked={fd.siman_domiki} onChange={v => set("siman_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.siman_stiriksi} onChange={v => set("siman_stiriksi", v)} label="Στήριξη υαλοπίνακα" />
        <ChkCard checked={fd.siman_steganopoi} onChange={v => set("siman_steganopoi", v)} label="Στεγανοποίηση" />
        <ChkCard checked={fd.siman_menteseedes} onChange={v => set("siman_menteseedes", v)} label="Λειτουργία μεντεσέδων OK" />
        <ChkCard checked={fd.siman_kleidaria} onChange={v => set("siman_kleidaria", v)} label="Λειτουργία κλειδαριάς OK" />
        <ChkCard checked={fd.siman_vafi} onChange={v => set("siman_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Οροφή</h2>
        <ChkCard checked={fd.orofi_domiki} onChange={v => set("orofi_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.orofi_kalimmata} onChange={v => set("orofi_kalimmata", v)} label="Καλύμματα οροφής" />
        <ChkCard checked={fd.orofi_steganopoi} onChange={v => set("orofi_steganopoi", v)} label="Στεγανοποίηση με σιλικόνη" />
        <ChkCard checked={fd.orofi_pv} onChange={v => set("orofi_pv", v)} label="Φωτοβολταϊκά πάνελ" />
        <ChkCard checked={fd.orofi_vafi} onChange={v => set("orofi_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Παγκάκι</h2>
        <ChkCard checked={fd.pagk_domiki} onChange={v => set("pagk_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.pagk_verniki} onChange={v => set("pagk_verniki", v)} label="Βερνίκι και αποστάσεις/αρμοί" />
        <ChkCard checked={fd.pagk_pleuriko} onChange={v => set("pagk_pleuriko", v)} label="Εγκατάσταση πλευρικού πάνελ" />
        <ChkCard checked={fd.pagk_vafi} onChange={v => set("pagk_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Light Box</h2>
        <ChkCard checked={fd.lb_domiki} onChange={v => set("lb_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.lb_acryliki} onChange={v => set("lb_acryliki", v)} label="Ακρυλική πινακίδα" />
        <ChkCard checked={fd.lb_kleidaria} onChange={v => set("lb_kleidaria", v)} label="Λειτουργία κλειδαριάς OK" />
        <ChkCard checked={fd.lb_menteseedes} onChange={v => set("lb_menteseedes", v)} label="Λειτουργία μεντεσέδων OK" />
        <ChkCard checked={fd.lb_vafi} onChange={v => set("lb_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Περιμετρικά Πάνελ</h2>
        <ChkCard checked={fd.per_domiki} onChange={v => set("per_domiki", v)} label="Δομική αρτιότητα" />
        <ChkCard checked={fd.per_vafi} onChange={v => set("per_vafi", v)} label="Ποιότητα βαφής" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Λοιπά</h2>
        <ChkCard checked={fd.auto_topothesi} onChange={v => set("auto_topothesi", v)} label="Αυτοκόλλητα - Τοποθέτηση OK" />
        <ChkCard checked={fd.glazz_topothesi} onChange={v => set("glazz_topothesi", v)} label="Glazzing - Τοποθέτηση υαλοπίνακα" />
        <ChkCard checked={fd.kados_egkat} onChange={v => set("kados_egkat", v)} label="Κάδος απορριμμάτων - Εγκατάσταση" />
        <ChkCard checked={fd.vasipod_egkat} onChange={v => set("vasipod_egkat", v)} label="Βάση ποδηλάτων - Εγκατάσταση" />
        <Field label="Οριζόντια Σήμανση - Τοποθέτηση"><Input value={fd.oriz_topothesi} onChange={e => set("oriz_topothesi", e.target.value)} /></Field>
        <Field label="Τύπος Οριζόντιας Σήμανσης"><Input value={fd.oriz_typos} onChange={e => set("oriz_typos", e.target.value)} /></Field>
      </div>

      {/* Κατάσταση */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Κατάσταση Περιστατικού</h2>
        <div>
          <Label className="text-xs font-semibold">ΑΝΟΙΓΕΙ INCIDENT</Label>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => { set("anoigei_incident_nai", true); set("anoigei_incident_ochi", false); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.anoigei_incident_nai ? "bg-red-600 text-white" : "bg-white"}`}>ΝΑΙ</button>
            <button type="button" onClick={() => { set("anoigei_incident_nai", false); set("anoigei_incident_ochi", true); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.anoigei_incident_ochi ? "bg-green-600 text-white" : "bg-white"}`}>ΟΧΙ</button>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold">Δυνατή άμεση αποκατάσταση;</Label>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => { set("amesi_apokatastasi_nai", true); set("amesi_apokatastasi_ochi", false); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.amesi_apokatastasi_nai ? "bg-green-600 text-white" : "bg-white"}`}>ΝΑΙ</button>
            <button type="button" onClick={() => { set("amesi_apokatastasi_nai", false); set("amesi_apokatastasi_ochi", true); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.amesi_apokatastasi_ochi ? "bg-red-600 text-white" : "bg-white"}`}>ΟΧΙ</button>
          </div>
          {(fd.ekkremes_civil || fd.ekkremes_hlektrologos) && (
            <div className="flex gap-3 mt-2">
              <ChkCard checked={fd.ekkremes_civil} onChange={v => set("ekkremes_civil", v)} label="Civil" />
              <ChkCard checked={fd.ekkremes_hlektrologos} onChange={v => set("ekkremes_hlektrologos", v)} label="Ηλεκτρολόγο" />
            </div>
          )}
        </div>
        <div>
          <Label className="text-xs font-semibold">Μπορεί να κλείσει;</Label>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => { set("kleisimo_nai", true); set("kleisimo_ochi", false); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.kleisimo_nai ? "bg-green-600 text-white" : "bg-white"}`}>ΝΑΙ</button>
            <button type="button" onClick={() => { set("kleisimo_nai", false); set("kleisimo_ochi", true); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.kleisimo_ochi ? "bg-red-600 text-white" : "bg-white"}`}>ΟΧΙ</button>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold">ΕΓΓΥΗΣΗ</Label>
          <div className="flex gap-3 mt-1">
            <button type="button" onClick={() => { set("eggyhsh_nai", true); set("eggyhsh_ochi", false); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.eggyhsh_nai ? "bg-green-600 text-white" : "bg-white"}`}>ΝΑΙ</button>
            <button type="button" onClick={() => { set("eggyhsh_nai", false); set("eggyhsh_ochi", true); }}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold ${fd.eggyhsh_ochi ? "bg-red-600 text-white" : "bg-white"}`}>ΟΧΙ</button>
          </div>
        </div>
      </div>

      {/* Σχόλια */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Σχόλια</h2>
        <Field label="Σχόλια"><Textarea value={fd.sxolia} onChange={e => set("sxolia", e.target.value)} rows={3} /></Field>
        <Field label="Εργασίες που εκτελέστηκαν"><Textarea value={fd.ergazies_pou_ektelesan} onChange={e => set("ergazies_pou_ektelesan", e.target.value)} rows={3} /></Field>
      </div>

      {/* Φωτογραφίες */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Φωτογραφίες</h2>
        <ChkCard checked={fd.photo_prin} onChange={v => set("photo_prin", v)} label="Φωτο Πριν" />
        <ChkCard checked={fd.photo_meta} onChange={v => set("photo_meta", v)} label="Φωτο Μετά" />
        <PhotoUpload photos={fd.photos || []} onChange={urls => set("photos", urls)} label="Φωτογραφίες επιθεώρησης" />
      </div>

      {/* Επαλήθευση */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase">Επαλήθευση</h2>
        <Field label="Ονοματεπώνυμο"><Input value={fd.epalitheusi_onoma} onChange={e => set("epalitheusi_onoma", e.target.value)} className="h-11" /></Field>
        <Field label="Ημερομηνία"><Input type="date" value={fd.epalitheusi_imerominia} onChange={e => set("epalitheusi_imerominia", e.target.value)} className="h-11" /></Field>
        <SignaturePad value={fd.signature} onChange={val => set("signature", val)} label="Υπογραφή" />
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