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
  pez_plakes_pez: "", pez_topothetes_plakes: "", pez_skyrodeema: "", pez_kraspedo_pez: "",
  pez_plakes_tyflon: "", pez_plakes_tyflon_check: "", pez_alles_plakes: "", pez_geiosi: "",
  pez_apokatastasi: "",
  kat_stegaztro_oriz: false, kat_vides: false, kat_kena: false, kat_kathariothta: false,
  pil_domiki: false, pil_stiriksi: false, pil_steganopoi: false, pil_menteseedes: false, pil_kleidaria: false, pil_vafi: false,
  porta_domiki: false, porta_stiriksi: false, porta_steganopoi: false, porta_menteseedes: false, porta_kleidaria: false, porta_vafi: false,
  siman_domiki: false, siman_stiriksi: false, siman_steganopoi: false, siman_menteseedes: false, siman_kleidaria: false, siman_vafi: false,
  orofi_domiki: false, orofi_kalimmata: false, orofi_steganopoi: false, orofi_pv: false, orofi_vafi: false,
  pagk_domiki: false, pagk_verniki: false, pagk_pleuriko: false, pagk_vafi: false,
  lb_domiki: false, lb_acryliki: false, lb_kleidaria: false, lb_menteseedes: false, lb_vafi: false,
  per_domiki: false, per_vafi: false,
  auto_topothesi: false,
  glazz_topothesi: false,
  kados_egkat: false,
  vasipod_egkat: false,
  oriz_topothesi: false, oriz_typos: "",
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

  // Auto-save to localStorage every time form changes
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
            <Input type="date" value={fd.date_of_work} onChange={e => set("date_of_work", e.target.value)} className="h-11" />
          </Field>
          <Field label="Εκτελέστηκε από">
            <Input value={fd.completed_by} onChange={e => set("completed_by", e.target.value)} placeholder="Όνομα..." className="h-11" />
          </Field>
        </div>
        <Field label="Α/Α Στεγάστρου">
          <Input value={fd.aa_stegastrou || asset?.asset_id || ''} onChange={e => set("aa_stegastrou", e.target.value)} placeholder="Α/Α..." className="h-11" />
        </Field>
        <Field label="Τύπος Στεγάστρου">
          <Input value={fd.typos_stegastrou || asset?.shelter_type || ''} onChange={e => set("typos_stegastrou", e.target.value)} placeholder="Τύπος..." className="h-11" />
        </Field>
      </div>

      {/* Πεζοδρόμιο */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Πεζοδρόμιο</h2>
        {[
          ["pez_plakes_pez", "Τοποθέτηση πλακών πεζοδρομίου"],
          ["pez_topothetes_plakes", "Τοποθετημένες πλάκες (m²)"],
          ["pez_skyrodeema", "Σκυρόδεμα/κρασπέδο (m)"],
          ["pez_kraspedo_pez", "Κράσπεδο πεζοδρομίου (m)"],
          ["pez_plakes_tyflon", "Πλάκες όδευσης τυφλών (m²)"],
          ["pez_plakes_tyflon_check", "Πλάκες όδευσης τυφλών σύμφωνα με προδιαγραφές"],
          ["pez_alles_plakes", "Άλλες πλάκες (m²)"],
          ["pez_geiosi", "Γείωση σωστά εγκατεστημένα"],
          ["pez_apokatastasi", "Αποκατάσταση πεζοδρομίου και καθαριότητα"],
        ].map(([key, label]) => (
          <Field key={key} label={label}>
            <Input value={fd[key] || ''} onChange={e => set(key, e.target.value)} placeholder="Κατάσταση/Ποσότητα..." className="h-11" />
          </Field>
        ))}
      </div>

      {/* Κύρια Κατασκευή */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Κύρια Κατασκευή</h2>
        <div className="space-y-2">
          {[
            ["kat_stegaztro_oriz", "Το στέγαστρο είναι οριζοντιωμένο & ασφαλώς στερεωμένο"],
            ["kat_vides", "Βίδες/κοχλίες βαμμένοι"],
            ["kat_kena", "Κενά μεταξύ πάνελ ≤ 3 mm"],
            ["kat_kathariothta", "Καθαριότητα"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Πυλώνας Πόρτας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Πυλώνας Πόρτας</h2>
        <div className="space-y-2">
          {[
            ["pil_domiki", "Δομική αρτιότητα"],
            ["pil_stiriksi", "Στήριξη υαλοπίνακα"],
            ["pil_steganopoi", "Στεγανοποίηση/λάστιχα στήριξης"],
            ["pil_menteseedes", "Λειτουργία μεντεσέδων OK"],
            ["pil_kleidaria", "Λειτουργία κλειδαριάς OK"],
            ["pil_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Κατασκευή Πόρτας */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Κατασκευή Πόρτας</h2>
        <div className="space-y-2">
          {[
            ["porta_domiki", "Δομική αρτιότητα"],
            ["porta_stiriksi", "Στήριξη υαλοπίνακα"],
            ["porta_steganopoi", "Στεγανοποίηση/λάστιχα στήριξης"],
            ["porta_menteseedes", "Λειτουργία μεντεσέδων OK"],
            ["porta_kleidaria", "Λειτουργία κλειδαριάς OK"],
            ["porta_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Σήμανση Πορτών */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Σήμανση Πορτών</h2>
        <div className="space-y-2">
          {[
            ["siman_domiki", "Δομική αρτιότητα"],
            ["siman_stiriksi", "Στήριξη υαλοπίνακα"],
            ["siman_steganopoi", "Στεγανοποίηση/λάστιχα στήριξης"],
            ["siman_menteseedes", "Λειτουργία μεντεσέδων OK"],
            ["siman_kleidaria", "Λειτουργία κλειδαριάς OK"],
            ["siman_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Οροφή */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Οροφή</h2>
        <div className="space-y-2">
          {[
            ["orofi_domiki", "Δομική αρτιότητα"],
            ["orofi_kalimmata", "Καλύμματα οροφής τοποθετημένα"],
            ["orofi_steganopoi", "Στεγανοποίηση με σιλικόνη"],
            ["orofi_pv", "Φωτοβολταϊκά πάνελ εγκατεστημένα"],
            ["orofi_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Παγκάκι */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Παγκάκι</h2>
        <div className="space-y-2">
          {[
            ["pagk_domiki", "Δομική αρτιότητα"],
            ["pagk_verniki", "Βερνίκι και αποστάσεις/αρμοί εξαρτημάτων OK"],
            ["pagk_pleuriko", "Εγκατάσταση πλευρικού πάνελ"],
            ["pagk_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Light Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Light Box</h2>
        <div className="space-y-2">
          {[
            ["lb_domiki", "Δομική αρτιότητα"],
            ["lb_acryliki", "Ακρυλική πινακίδα στη θέση της"],
            ["lb_kleidaria", "Λειτουργία κλειδαριάς OK"],
            ["lb_menteseedes", "Λειτουργία μεντεσέδων OK"],
            ["lb_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Περιμετρικά Πάνελ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Περιμετρικά Πάνελ</h2>
        <div className="space-y-2">
          {[
            ["per_domiki", "Δομική αρτιότητα"],
            ["per_vafi", "Ποιότητα βαφής"],
          ].map(([key, label]) => (
            <ChkCard key={key} checked={!!fd[key]} onChange={v => set(key, v)} label={label} />
          ))}
        </div>
      </div>

      {/* Λοιπά */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Λοιπά</h2>
        <div className="space-y-2">
          <ChkCard checked={!!fd.auto_topothesi} onChange={v => set("auto_topothesi", v)} label="Αυτοκόλλητα - Τοποθέτηση OK" />
          <ChkCard checked={!!fd.glazz_topothesi} onChange={v => set("glazz_topothesi", v)} label="Glazzing - Τοποθέτηση υαλοπίνακα" />
          <ChkCard checked={!!fd.kados_egkat} onChange={v => set("kados_egkat", v)} label="Κάδος απορριμμάτων - Εγκατάσταση" />
          <ChkCard checked={!!fd.vasipod_egkat} onChange={v => set("vasipod_egkat", v)} label="Βάση ποδηλάτων - Εγκατάσταση" />
          <Field label="Οριζόντια Σήμανση - Τοποθέτηση">
            <Input value={fd.oriz_topothesi || ''} onChange={e => set("oriz_topothesi", e.target.value)} className="h-11" />
          </Field>
          <Field label="Τύπος Οριζόντιας Σήμανσης">
            <Input value={fd.oriz_typos || ''} onChange={e => set("oriz_typos", e.target.value)} className="h-11" />
          </Field>
        </div>
      </div>

      {/* Κατάσταση Περιστατικού */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Κατάσταση Περιστατικού</h2>
        <div className="space-y-3">
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
                <ChkCard checked={!!fd.ekkremes_civil} onChange={v => set("ekkremes_civil", v)} label="Civil" />
                <ChkCard checked={!!fd.ekkremes_hlektrologos} onChange={v => set("ekkremes_hlektrologos", v)} label="Ηλεκτρολόγο" />
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
      </div>

      {/* Σχόλια */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Σχόλια</h2>
        <Field label="Σχόλια">
          <Textarea value={fd.sxolia} onChange={e => set("sxolia", e.target.value)} placeholder="Σχόλια..." rows={3} />
        </Field>
        <Field label="Εργασίες που εκτελέστηκαν">
          <Textarea value={fd.ergazies_pou_ektelesan} onChange={e => set("ergazies_pou_ektelesan", e.target.value)} placeholder="Περιγραφή..." rows={3} />
        </Field>
      </div>

      {/* Φωτογραφίες */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Φωτογραφίες</h2>
        <PhotoUpload
          photos={fd.photos || []}
          onChange={urls => set("photos", urls)}
          label="Φωτογραφίες επιθεώρησης"
        />
      </div>

      {/* Επαλήθευση */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Επαλήθευση</h2>
        <Field label="Ονοματεπώνυμο">
          <Input value={fd.epalitheusi_onoma} onChange={e => set("epalitheusi_onoma", e.target.value)} placeholder="Ονοματεπώνυμο..." className="h-11" />
        </Field>
        <Field label="Ημερομηνία">
          <Input type="date" value={fd.epalitheusi_imerominia} onChange={e => set("epalitheusi_imerominia", e.target.value)} className="h-11" />
        </Field>
        <SignaturePad
          value={fd.signature}
          onChange={val => set("signature", val)}
          label="Υπογραφή"
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