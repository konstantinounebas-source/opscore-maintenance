import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, Printer, Save, Send } from "lucide-react";
import { generateWorkOrderId } from "@/lib/workOrderIdGenerator";
import { getAthensTimestamp } from "@/lib/timeSync";

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDateGR(iso) {
  if (!iso) return "";
  try { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; } catch { return iso; }
}

// ── PDF-style primitives ──────────────────────────────────────────────────────

function PdfSection({ title, blue, children }) {
  return (
    <div className="border border-black">
      <div className={`px-2 py-1 font-bold text-xs uppercase tracking-wide border-b border-black ${blue ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-900"}`}>
        {title}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function ChkBox({ checked, onChange, label, className }) {
  return (
    <label className={`flex items-center gap-1 cursor-pointer ${className || ""}`}>
      <span
        onClick={() => onChange(!checked)}
        className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0 cursor-pointer text-xs font-bold select-none
          ${checked ? "bg-gray-800 border-gray-800 text-white" : "bg-white border-gray-500"}`}
      >
        {checked ? "✓" : ""}
      </span>
      {label && <span className="text-xs text-gray-800 leading-tight">{label}</span>}
    </label>
  );
}

function EditableField({ value, onChange, placeholder, type = "text", className }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border-b border-gray-400 bg-transparent text-xs text-gray-900 outline-none focus:border-blue-500 px-1 ${className || "w-full"}`}
    />
  );
}

function EditableTextarea({ value, onChange, placeholder, rows = 2, className }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`border border-gray-300 bg-white text-xs text-gray-900 outline-none focus:border-blue-500 px-1 w-full resize-none ${className || ""}`}
    />
  );
}

function TwoColRow({ leftLabel, leftKey, leftType, rightLabel, rightKey, rightType, form, set }) {
  return (
    <tr className="border-b border-gray-200">
      <td className="border-r border-gray-200 px-1 py-0.5 text-xs text-gray-800 w-[30%]">{leftLabel}</td>
      <td className="border-r border-gray-200 px-1 py-0.5 text-xs text-gray-500 w-[8%] text-center">{leftType}</td>
      <td className="border-r border-gray-200 px-1 py-0.5 w-[14%]">
        {leftKey ? <input className="w-full text-xs border-0 bg-transparent outline-none focus:bg-blue-50 px-0.5" value={form[leftKey] || ""} onChange={e => set(leftKey, e.target.value)} /> : null}
      </td>
      <td className="border-r border-gray-200 px-1 py-0.5 text-xs text-gray-800 w-[30%]">{rightLabel || ""}</td>
      <td className="border-r border-gray-200 px-1 py-0.5 text-xs text-gray-500 w-[8%] text-center">{rightType || ""}</td>
      <td className="px-1 py-0.5 w-[10%]">
        {rightKey ? <input className="w-full text-xs border-0 bg-transparent outline-none focus:bg-blue-50 px-0.5" value={form[rightKey] || ""} onChange={e => set(rightKey, e.target.value)} /> : null}
      </td>
    </tr>
  );
}

function TwoColHeader({ leftTitle, rightTitle }) {
  return (
    <tr className="bg-blue-50">
      <th className="border border-gray-300 px-1 py-0.5 text-xs font-bold text-left text-blue-900 w-[30%]">{leftTitle}</th>
      <th className="border border-gray-300 px-1 py-0.5 text-xs font-bold text-center text-blue-900 w-[8%]">Τύπος</th>
      <th className="border border-gray-300 px-1 py-0.5 text-xs font-bold text-center text-blue-900 w-[14%]">Έλεγχοι Ποιότητας</th>
      <th className="border border-gray-300 px-1 py-0.5 text-xs font-bold text-left text-blue-900 w-[30%]">{rightTitle}</th>
      <th className="border border-gray-300 px-1 py-0.5 text-xs font-bold text-center text-blue-900 w-[8%]">Τύπος</th>
      <th className="border border-gray-300 px-1 py-0.5 text-xs font-bold text-center text-blue-900 w-[10%]">Έλεγχοι Ποιότητας</th>
    </tr>
  );
}

// ── Default state ─────────────────────────────────────────────────────────────
const defaultData = {
  date_of_work: "", completed_by: "", workorder_no: "", aa_stegastrou: "", typos_stegastrou: "",
  pez_plakes_pez: "", pez_topothetes_plakes: "", pez_skyrodeema: "", pez_kraspedo_pez: "",
  pez_plakes_tyflon: "", pez_plakes_tyflon_check: "", pez_alles_plakes: "", pez_geiosi: "",
  pez_apokatastasi: "",
  kat_stegaztro_oriz: "", kat_vides: "", kat_kena: "", kat_kathariothta: "",
  pil_domiki: "", pil_stiriksi: "", pil_steganopoi: "", pil_menteseedes: "", pil_kleidaria: "", pil_vafi: "",
  porta_domiki: "", porta_stiriksi: "", porta_steganopoi: "", porta_menteseedes: "", porta_kleidaria: "", porta_vafi: "",
  siman_domiki: "", siman_stiriksi: "", siman_steganopoi: "", siman_menteseedes: "", siman_kleidaria: "", siman_vafi: "",
  orofi_domiki: "", orofi_kalimmata: "", orofi_steganopoi: "", orofi_pv: "", orofi_vafi: "",
  pagk_domiki: "", pagk_verniki: "", pagk_pleuriko: "", pagk_vafi: "",
  lb_domiki: "", lb_acryliki: "", lb_kleidaria: "", lb_menteseedes: "", lb_vafi: "",
  per_domiki: "", per_vafi: "",
  auto_topothesi: "",
  glazz_topothesi: "",
  kados_egkat: "",
  vasipod_egkat: "",
  oriz_topothesi: "", oriz_typos: "",
  anoigei_incident_nai: false, anoigei_incident_ochi: false,
  amesi_apokatastasi_nai: false, amesi_apokatastasi_ochi: false,
  ekkremes_civil: false, ekkremes_hlektrologos: false,
  kleisimo_nai: false, kleisimo_ochi: false,
  photo_prin: false, photo_meta: false,
  eggyhsh_nai: false, eggyhsh_ochi: false,
  sxolia: "",
  ergazies_pou_ektelesan: "",
  epalitheusi_onoma: "", epalitheusi_imerominia: "",
};

// ── PDF HTML builder (landscape) ──────────────────────────────────────────────
function buildPrintHTML(form, inspId, incident, asset) {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const chk = v => v ? "☑" : "☐";
  const val = (v, fallback = "—") => v ? esc(v) : `<span style="color:#aaa">${fallback}</span>`;

  const tableStyle = `width:100%;border-collapse:collapse;font-size:9.5px;margin-top:2px;`;
  const thStyle = `background:#dbeafe;border:1px solid #93c5fd;padding:3px 5px;font-weight:700;font-size:9px;text-align:left;`;
  const thCStyle = `background:#dbeafe;border:1px solid #93c5fd;padding:3px 5px;font-weight:700;font-size:9px;text-align:center;`;
  const tdStyle = `border:1px solid #e5e7eb;padding:2px 5px;vertical-align:middle;`;
  const tdTypeStyle = `border:1px solid #e5e7eb;padding:2px 4px;text-align:center;color:#6b7280;vertical-align:middle;`;
  const tdCheckStyle = `border:1px solid #e5e7eb;padding:2px 4px;text-align:center;vertical-align:middle;`;
  const secHeader = (title, blue) => `<div style="background:${blue ? "#1d4ed8" : "#374151"};color:white;font-weight:700;font-size:10px;text-transform:uppercase;padding:4px 8px;margin-top:6px;letter-spacing:0.5px;">${esc(title)}</div>`;
  const subSecHeader = (left, right) => `
    <tr>
      <th style="${thStyle}width:30%">${esc(left)}</th>
      <th style="${thCStyle}width:8%">Τύπος</th>
      <th style="${thCStyle}width:12%">Έλεγχοι Ποιότητας</th>
      <th style="${thStyle}width:30%">${esc(right)}</th>
      <th style="${thCStyle}width:8%">Τύπος</th>
      <th style="${thCStyle}width:12%">Έλεγχοι Ποιότητας</th>
    </tr>`;
  const row = (ll, lk, lt, rl, rk, rt) => `
    <tr>
      <td style="${tdStyle}">${esc(ll)}</td>
      <td style="${tdTypeStyle}">${esc(lt)}</td>
      <td style="${tdCheckStyle}">${val(form[lk])}</td>
      <td style="${tdStyle}">${esc(rl)}</td>
      <td style="${tdTypeStyle}">${esc(rt)}</td>
      <td style="${tdCheckStyle}">${val(form[rk])}</td>
    </tr>`;

  const shelterType = form.typos_stegastrou || asset?.shelter_type || asset?.installed_shelter_type || asset?.ordered_shelter_type || "—";
  const assetName = form.aa_stegastrou || incident?.related_asset_name || asset?.asset_id || "—";

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>PM Checklist – ${esc(assetName)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; color: #111; margin: 0; padding: 0; }
  .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-radius: 4px; }
  .header h1 { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; }
  .header .meta { font-size: 9px; opacity: 0.85; margin-top: 2px; }
  .header-right { text-align: right; font-size: 9px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; border: 1px solid #374151; margin-bottom: 6px; }
  .info-cell { padding: 3px 6px; border-right: 1px solid #d1d5db; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-weight: 700; font-size: 8.5px; color: #6b7280; text-transform: uppercase; }
  .info-value { font-size: 10px; font-weight: 600; margin-top: 1px; }
  table { ${tableStyle} }
  .section { margin-bottom: 4px; }
  .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px; }
  .status-row { display: flex; align-items: center; gap: 8px; padding: 2px 6px; border: 1px solid #e5e7eb; border-radius: 3px; font-size: 9.5px; }
  .status-label { font-weight: 700; min-width: 160px; }
  .sign-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .sign-table th, .sign-table td { border: 1px solid #e5e7eb; padding: 4px 6px; font-size: 9px; }
  .sign-table th { background: #f3f4f6; font-weight: 700; }
  .sign-table .sig-space { height: 24px; }
  .notes-box { border: 1px solid #e5e7eb; padding: 4px 6px; min-height: 24px; font-size: 9px; margin-top: 2px; }
  .print-footer { margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 4px; display: flex; justify-content: space-between; font-size: 8px; color: #9ca3af; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>PREVENTIVE MAINTENANCE – CHECKLIST</h1>
    <div class="meta">Smart Bus Shelters – Inspection Work Order</div>
  </div>
  <div class="header-right">
    <div style="font-size:10px;font-weight:700;">${esc(inspId || form.workorder_no || "—")}</div>
    <div>${fmtDateGR(form.date_of_work)}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-cell"><div class="info-label">WORKORDER NO.</div><div class="info-value">${esc(inspId || form.workorder_no || "—")}</div></div>
  <div class="info-cell"><div class="info-label">Ημερομηνία</div><div class="info-value">${esc(fmtDateGR(form.date_of_work))}</div></div>
  <div class="info-cell"><div class="info-label">Α/Α Στεγάστρου</div><div class="info-value">${esc(assetName)}</div></div>
  <div class="info-cell"><div class="info-label">Τύπος Στεγάστρου</div><div class="info-value">${esc(shelterType)}</div></div>
</div>

${secHeader("ΕΛΕΓΧΟΙ ΠΟΛΙΤΙΚΩΝ ΕΡΓΩΝ", true)}
<div class="section">
  <table>
    <thead>${subSecHeader("ΠΕΖΟΔΡΟΜΙΟ", "ΠΕΖΟΔΡΟΜΙΟ")}</thead>
    <tbody>
      ${row("Τοποθέτηση πλακών πεζοδρομίου σύμφωνα με απαιτήσεις & ορθές πρακτικές","pez_plakes_pez","Οπτικός","Πλάκες όδευσης τυφλών σύμφωνα με προδιαγραφές","pez_plakes_tyflon_check","Οπτικός")}
      ${row("Τοποθετημένες πλάκες (m²)","pez_topothetes_plakes","Ποσότητα","Πλάκες όδευσης τυφλών (m²)","pez_plakes_tyflon","Οπτικός")}
      ${row("Σκυρόδεμα/κρασπέδο (m)","pez_skyrodeema","Ποσότητα","Άλλες πλάκες (m²)","pez_alles_plakes","Ποσότητα")}
      ${row("Κράσπεδο πεζοδρομίου (m)","pez_kraspedo_pez","Ποσότητα","Γείωση (κιβώτιο γείωσης & ράβδος) σωστά εγκατεστημένα","pez_geiosi","Οπτικός")}
      ${row("","","","Αποκατάσταση πεζοδρομίου και καθαριότητα","pez_apokatastasi","Οπτικός")}
    </tbody>
  </table>
</div>

${secHeader("ΕΛΕΓΧΟΙ ΣΤΕΓΑΣΤΡΟΥ", true)}

<div class="section">
  <table>
    <thead>${subSecHeader("Κύρια Κατασκευή", "ΠΥΛΩΝΑΣ ΠΟΡΤΑΣ")}</thead>
    <tbody>
      ${row("Το στέγαστρο είναι οριζοντιωμένο & ασφαλώς στερεωμένο","kat_stegaztro_oriz","Οπτικός","Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","pil_domiki","Οπτικός")}
      ${row("Βίδες/κοχλίες βαμμένοι","kat_vides","Οπτικός","Στήριξη υαλοπίνακα","pil_stiriksi","Οπτικός")}
      ${row("Κενά μεταξύ πάνελ ≤ 3 mm (±2 mm)","kat_kena","Οπτικός","Στεγανοποίηση/λάστιχα στήριξης","pil_steganopoi","Οπτικός")}
      ${row("Καθαριότητα","kat_kathariothta","Οπτικός","Λειτουργία μεντεσέδων OK","pil_menteseedes","Οπτικός")}
      ${row("","","","Λειτουργία κλειδαριάς OK","pil_kleidaria","Ενέργεια")}
      ${row("","","","Ποιότητα βαφής","pil_vafi","Οπτικός")}
    </tbody>
  </table>

  <table style="margin-top:3px;">
    <thead>${subSecHeader("ΚΑΤΑΣΚΕΥΗ ΠΟΡΤΑΣ", "ΣΗΜΑΝΣΗ ΠΟΡΤΩΝ")}</thead>
    <tbody>
      ${row("Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","porta_domiki","Οπτικός","Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","siman_domiki","Οπτικός")}
      ${row("Στήριξη υαλοπίνακα","porta_stiriksi","Οπτικός","Στήριξη υαλοπίνακα","siman_stiriksi","Οπτικός")}
      ${row("Στεγανοποίηση/λάστιχα στήριξης","porta_steganopoi","Οπτικός","Στεγανοποίηση/λάστιχα στήριξης","siman_steganopoi","Οπτικός")}
      ${row("Λειτουργία μεντεσέδων OK","porta_menteseedes","Οπτικός","Λειτουργία μεντεσέδων OK","siman_menteseedes","Οπτικός")}
      ${row("Λειτουργία κλειδαριάς OK","porta_kleidaria","Ενέργεια","Λειτουργία κλειδαριάς OK","siman_kleidaria","Ενέργεια")}
      ${row("Ποιότητα βαφής","porta_vafi","Οπτικός","Ποιότητα βαφής","siman_vafi","Οπτικός")}
    </tbody>
  </table>

  <table style="margin-top:3px;">
    <thead>${subSecHeader("ΟΡΟΦΗ", "ΠΑΓΚΑΚΙ")}</thead>
    <tbody>
      ${row("Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","orofi_domiki","Οπτικός","Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","pagk_domiki","Οπτικός")}
      ${row("Καλύμματα οροφής τοποθετημένα, χωρίς ζημιές (συμπ. φωτιστικών)","orofi_kalimmata","Οπτικός","Βερνίκι και αποστάσεις/αρμοί εξαρτημάτων OK","pagk_verniki","Οπτικός")}
      ${row("Στεγανοποίηση με σιλικόνη","orofi_steganopoi","Οπτικός","Εγκατάσταση πλευρικού πάνελ","pagk_pleuriko","Οπτικός")}
      ${row("Φωτοβολταϊκά πάνελ εγκατεστημένα","orofi_pv","Οπτικός","Ποιότητα βαφής","pagk_vafi","Οπτικός")}
      ${row("Ποιότητα βαφής","orofi_vafi","Οπτικός","",""," ")}
    </tbody>
  </table>

  <table style="margin-top:3px;">
    <thead>${subSecHeader("LIGHT BOX", "ΠΕΡΙΜΕΤΡΙΚΑ ΠΑΝΕΛ")}</thead>
    <tbody>
      ${row("Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","lb_domiki","Οπτικός","Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς","per_domiki","Οπτικός")}
      ${row("Ακρυλική πινακίδα στη θέση της","lb_acryliki","Οπτικός","Ποιότητα βαφής","per_vafi","Οπτικός")}
      ${row("Λειτουργία κλειδαριάς OK","lb_kleidaria","Οπτικός","",""," ")}
      ${row("Λειτουργία μεντεσέδων OK","lb_menteseedes","Οπτικός","",""," ")}
      ${row("Ποιότητα βαφής","lb_vafi","Οπτικός","",""," ")}
    </tbody>
  </table>

  <table style="margin-top:3px;">
    <thead>${subSecHeader("ΑΥΤΟΚΟΛΛΗΤΑ", "GLAZZING")}</thead>
    <tbody>
      ${row("Τοποθέτηση αυτοκόλλητων OK","auto_topothesi","Οπτικός","Τοποθέτηση υαλοπίνακα με σιλικόνη Sieland","glazz_topothesi","Οπτικός")}
    </tbody>
  </table>

  <table style="margin-top:3px;">
    <thead>${subSecHeader("ΚΑΔΟΣ ΑΠΟΡΡΙΜΜΑΤΩΝ", "ΒΑΣΗ ΠΟΔΗΛΑΤΩΝ")}</thead>
    <tbody>
      ${row("Εγκατάσταση κάδου απορριμμάτων","kados_egkat","Οπτικός","Εγκατάσταση βάσης ποδηλάτων","vasipod_egkat","Οπτικός")}
    </tbody>
  </table>

  <table style="margin-top:3px;">
    <thead>${subSecHeader("ΟΡΙΖΟΝΤΙΑ ΣΗΜΑΝΣΗ", "ΛΟΙΠΑ")}</thead>
    <tbody>
      ${row("Τοποθέτηση οριζόντιας σήμανσης","oriz_topothesi","Οπτικός","",""," ")}
      ${row("Τύπος οριζόντιας σήμανσης","oriz_typos","Δείγμα","",""," ")}
    </tbody>
  </table>
</div>

${secHeader("ΚΑΤΑΣΤΑΣΗ ΠΕΡΙΣΤΑΤΙΚΟΥ", false)}
<div class="status-grid">
  <div>
    <div class="status-row"><span class="status-label">ΑΝΟΙΓΕΙ INCIDENT</span> ${chk(form.anoigei_incident_nai)} Ναι &nbsp; ${chk(form.anoigei_incident_ochi)} Όχι</div>
    <div class="status-row" style="margin-top:2px;"><span class="status-label">Δυνατή άμεση αποκατάσταση;</span> ${chk(form.amesi_apokatastasi_nai)} Ναι &nbsp; ${chk(form.amesi_apokatastasi_ochi)} Όχι &nbsp;&nbsp; Εάν εκκρεμεί: ${chk(form.ekkremes_civil)} Civil &nbsp; ${chk(form.ekkremes_hlektrologos)} Ηλεκτρολόγο</div>
    <div class="status-row" style="margin-top:2px;"><span class="status-label">Μπορεί να κλείσει;</span> ${chk(form.kleisimo_nai)} Ναι &nbsp; ${chk(form.kleisimo_ochi)} Όχι &nbsp;&nbsp; Φωτο: ${chk(form.photo_prin)} Πριν &nbsp; ${chk(form.photo_meta)} Μετά</div>
    <div class="status-row" style="margin-top:2px;"><span class="status-label">ΕΓΓΥΗΣΗ</span> ${chk(form.eggyhsh_nai)} Ναι &nbsp; ${chk(form.eggyhsh_ochi)} Όχι</div>
  </div>
  <div>
    <div style="font-size:9px;font-weight:700;color:#374151;margin-bottom:2px;">Σχόλια:</div>
    <div class="notes-box">${esc(form.sxolia)}</div>
    <div style="font-size:9px;font-weight:700;color:#374151;margin-top:4px;margin-bottom:2px;">→ Εργασίες που εκτελέστηκαν:</div>
    <div class="notes-box">${esc(form.ergazies_pou_ektelesan)}</div>
  </div>
</div>

<div style="margin-top:6px;font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;padding:3px 6px;background:#f3f4f6;border:1px solid #e5e7eb;">ΕΠΑΛΗΘΕΥΣΗ</div>
<table class="sign-table">
  <thead><tr><th>Εκτελέστηκε από</th><th>Ονοματεπώνυμο</th><th>Ημερομηνία</th><th>Υπογραφή</th></tr></thead>
  <tbody>
    <tr>
      <td>Τεχνικός / Ομάδα</td>
      <td>${esc(form.epalitheusi_onoma)}</td>
      <td>${esc(fmtDateGR(form.epalitheusi_imerominia))}</td>
      <td class="sig-space">&nbsp;</td>
    </tr>
  </tbody>
</table>

<div class="print-footer">
  <span>PREVENTIVE MAINTENANCE - CHECKLIST | ${esc(assetName)} | ${esc(shelterType)}</span>
  <span>Εκτυπώθηκε: ${new Date().toLocaleString("el-GR")}</span>
</div>

</body>
</html>`;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function InspectionWOChecklistForm({ submission, incident, incidentId, workOrders, onClose }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [asset, setAsset] = useState(null);

  const existingData = submission?.form_data || {};
  const [form, setForm] = useState({ ...defaultData, ...existingData });
  const [inspId, setInspId] = useState(existingData.insp_id || "");

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Auto-generate WO ID
  useEffect(() => {
    if (!existingData.insp_id) {
      generateWorkOrderId("inspection").then(id => setInspId(id));
    }
  }, []);

  // Auto-fill date (today) if not already set
  useEffect(() => {
    if (!existingData.date_of_work) {
      set("date_of_work", todayISO());
    }
  }, []);

  // Load asset to auto-fill shelter type
  useEffect(() => {
    const assetId = incident?.related_asset_id;
    if (!assetId) return;
    base44.entities.Assets.filter({ id: assetId }).then(results => {
      if (results[0]) {
        const a = results[0];
        setAsset(a);
        // Auto-fill shelter type and asset name if not already in existing data
        if (!existingData.typos_stegastrou) {
          const shelterType = a.shelter_type || a.installed_shelter_type || a.ordered_shelter_type || "";
          if (shelterType) set("typos_stegastrou", shelterType);
        }
        if (!existingData.aa_stegastrou) {
          const name = incident?.related_asset_name || a.asset_id || "";
          if (name) set("aa_stegastrou", name);
        }
      }
    }).catch(() => {});
  }, [incident?.related_asset_id]);

  const buildPayload = (status) => ({
    form_type: "inspection_wo_checklist",
    form_name: "Preventive Maintenance - Inspection WO Checklist",
    incident_id: incidentId,
    asset_id: incident?.related_asset_id || "",
    status,
    form_data: { ...form, insp_id: inspId },
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
    const payload = { ...buildPayload("Submitted"), submitted_at: getAthensTimestamp() };
    submission?.id
      ? await base44.entities.FormSubmissions.update(submission.id, payload)
      : await base44.entities.FormSubmissions.create(payload);

    const user = await base44.auth.me();
    await base44.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: "Inspection WO Checklist Submitted",
      details: `Inspection WO Checklist submitted${form.epalitheusi_onoma ? ` — Εκτελέστηκε από: ${form.epalitheusi_onoma}` : ""}`,
      user: user?.email,
    });

    setSubmitting(false);
    toast({ title: "Form submitted successfully" });
    onClose();
  };

  const handlePrint = () => {
    const html = buildPrintHTML(form, inspId, incident, asset);
    const win = window.open("", "_blank");
    if (!win) { toast({ title: "Popup blocked — allow popups and retry", variant: "destructive" }); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const woRef = inspId || form.workorder_no || "";

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shadow-sm sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-blue-900 uppercase">Preventive Maintenance – Inspection WO Checklist</h2>
            {inspId && (
              <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {inspId}
              </span>
            )}
          </div>
          {incident && (
            <p className="text-xs text-gray-500 mt-0.5">Incident: {incident.incident_id} — {incident.title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 text-xs h-7">
            <Printer className="w-3 h-3" /> PDF / Εκτύπωση
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1 text-xs h-7">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Draft
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1 text-xs h-7 bg-blue-700 hover:bg-blue-800">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Υποβολή
          </Button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Form body ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto bg-white border border-gray-300 shadow p-3 font-sans space-y-1">

          {/* Title */}
          <div className="text-center mb-3">
            <h2 className="text-sm font-bold underline text-blue-900 uppercase tracking-wide">PREVENTIVE MAINTENANCE - CHECKLIST</h2>
          </div>

          {/* Header fields */}
          <div className="border border-gray-400 p-2 mb-1">
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">WORKORDER ΝΟ.:</td>
                  <td className="pr-4 py-0.5 w-40"><EditableField value={woRef} onChange={v => set("workorder_no", v)} /></td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Ημερομηνία:</td>
                  <td className="pr-4 py-0.5"><EditableField type="date" value={form.date_of_work} onChange={v => set("date_of_work", v)} /></td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">Α/Α ΣΤΕΓΑΣΤΡΟΥ:</td>
                  <td className="pr-4 py-0.5"><EditableField value={form.aa_stegastrou} onChange={v => set("aa_stegastrou", v)} /></td>
                  <td className="pr-2 py-0.5 font-bold whitespace-nowrap">ΤΥΠΟΣ ΣΤΕΓΑΣΤΡΟΥ:</td>
                  <td className="pr-4 py-0.5"><EditableField value={form.typos_stegastrou} onChange={v => set("typos_stegastrou", v)} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── ΕΛΕΓΧΟΙ ΠΟΛΙΤΙΚΩΝ ΕΡΓΩΝ ── */}
          <PdfSection title="ΕΛΕΓΧΟΙ ΠΟΛΙΤΙΚΩΝ ΕΡΓΩΝ" blue>
            <table className="w-full border-collapse">
              <thead>
                <TwoColHeader leftTitle="ΠΕΖΟΔΡΟΜΙΟ" rightTitle="ΠΕΖΟΔΡΟΜΙΟ" />
              </thead>
              <tbody>
                <TwoColRow leftLabel="Τοποθέτηση πλακών πεζοδρομίου σύμφωνα με απαιτήσεις & ορθές πρακτικές" leftKey="pez_plakes_pez" leftType="Οπτικός" rightLabel="Πλάκες όδευσης τυφλών σύμφωνα με προδιαγραφές" rightKey="pez_plakes_tyflon_check" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Τοποθετημένες πλάκες (m²)" leftKey="pez_topothetes_plakes" leftType="Ποσότητα" rightLabel="Πλάκες όδευσης τυφλών (m²)" rightKey="pez_plakes_tyflon" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Σκυρόδεμα/κρασπέδο (m)" leftKey="pez_skyrodeema" leftType="Ποσότητα" rightLabel="Άλλες πλάκες (m²)" rightKey="pez_alles_plakes" rightType="Ποσότητα" form={form} set={set} />
                <TwoColRow leftLabel="Κράσπεδο πεζοδρομίου (m)" leftKey="pez_kraspedo_pez" leftType="Ποσότητα" rightLabel="Γείωση (κιβώτιο γείωσης & ράβδος) σωστά εγκατεστημένα" rightKey="pez_geiosi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="" leftKey="" leftType="" rightLabel="Αποκατάσταση πεζοδρομίου και καθαριότητα" rightKey="pez_apokatastasi" rightType="Οπτικός" form={form} set={set} />
              </tbody>
            </table>
          </PdfSection>

          {/* ── ΕΛΕΓΧΟΙ ΣΤΕΓΑΣΤΡΟΥ ── */}
          <PdfSection title="ΕΛΕΓΧΟΙ ΣΤΕΓΑΣΤΡΟΥ" blue>

            <table className="w-full border-collapse mb-1">
              <thead><TwoColHeader leftTitle="Κύρια Κατασκευή" rightTitle="ΠΥΛΩΝΑΣ ΠΟΡΤΑΣ" /></thead>
              <tbody>
                <TwoColRow leftLabel="Το στέγαστρο είναι οριζοντιωμένο & ασφαλώς στερεωμένο" leftKey="kat_stegaztro_oriz" leftType="Οπτικός" rightLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" rightKey="pil_domiki" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Βίδες/κοχλίες βαμμένοι" leftKey="kat_vides" leftType="Οπτικός" rightLabel="Στήριξη υαλοπίνακα" rightKey="pil_stiriksi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Κενά μεταξύ πάνελ ≤ 3 mm (±2 mm)" leftKey="kat_kena" leftType="Οπτικός" rightLabel="Στεγανοποίηση/λάστιχα στήριξης" rightKey="pil_steganopoi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Καθαριότητα" leftKey="kat_kathariothta" leftType="Οπτικός" rightLabel="Λειτουργία μεντεσέδων OK" rightKey="pil_menteseedes" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="" leftKey="" leftType="" rightLabel="Λειτουργία κλειδαριάς OK" rightKey="pil_kleidaria" rightType="Ενέργεια" form={form} set={set} />
                <TwoColRow leftLabel="" leftKey="" leftType="" rightLabel="Ποιότητα βαφής" rightKey="pil_vafi" rightType="Οπτικός" form={form} set={set} />
              </tbody>
            </table>

            <table className="w-full border-collapse mb-1">
              <thead><TwoColHeader leftTitle="ΚΑΤΑΣΚΕΥΗ ΠΟΡΤΑΣ" rightTitle="ΣΗΜΑΝΣΗ ΠΟΡΤΩΝ" /></thead>
              <tbody>
                <TwoColRow leftLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" leftKey="porta_domiki" leftType="Οπτικός" rightLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" rightKey="siman_domiki" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Στήριξη υαλοπίνακα" leftKey="porta_stiriksi" leftType="Οπτικός" rightLabel="Στήριξη υαλοπίνακα" rightKey="siman_stiriksi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Στεγανοποίηση/λάστιχα στήριξης" leftKey="porta_steganopoi" leftType="Οπτικός" rightLabel="Στεγανοποίηση/λάστιχα στήριξης" rightKey="siman_steganopoi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Λειτουργία μεντεσέδων OK" leftKey="porta_menteseedes" leftType="Οπτικός" rightLabel="Λειτουργία μεντεσέδων OK" rightKey="siman_menteseedes" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Λειτουργία κλειδαριάς OK" leftKey="porta_kleidaria" leftType="Ενέργεια" rightLabel="Λειτουργία κλειδαριάς OK" rightKey="siman_kleidaria" rightType="Ενέργεια" form={form} set={set} />
                <TwoColRow leftLabel="Ποιότητα βαφής" leftKey="porta_vafi" leftType="Οπτικός" rightLabel="Ποιότητα βαφής" rightKey="siman_vafi" rightType="Οπτικός" form={form} set={set} />
              </tbody>
            </table>

            <table className="w-full border-collapse mb-1">
              <thead><TwoColHeader leftTitle="ΟΡΟΦΗ" rightTitle="ΠΑΓΚΑΚΙ" /></thead>
              <tbody>
                <TwoColRow leftLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" leftKey="orofi_domiki" leftType="Οπτικός" rightLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" rightKey="pagk_domiki" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Καλύμματα οροφής τοποθετημένα, χωρίς ζημιές (συμπ. φωτιστικών)" leftKey="orofi_kalimmata" leftType="Οπτικός" rightLabel="Βερνίκι και αποστάσεις/αρμοί εξαρτημάτων OK" rightKey="pagk_verniki" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Στεγανοποίηση με σιλικόνη" leftKey="orofi_steganopoi" leftType="Οπτικός" rightLabel="Εγκατάσταση πλευρικού πάνελ" rightKey="pagk_pleuriko" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Φωτοβολταϊκά πάνελ εγκατεστημένα" leftKey="orofi_pv" leftType="Οπτικός" rightLabel="Ποιότητα βαφής" rightKey="pagk_vafi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Ποιότητα βαφής" leftKey="orofi_vafi" leftType="Οπτικός" rightLabel="" leftKey2="" rightType="" form={form} set={set} />
              </tbody>
            </table>

            <table className="w-full border-collapse mb-1">
              <thead><TwoColHeader leftTitle="LIGHT BOX" rightTitle="ΠΕΡΙΜΕΤΡΙΚΑ ΠΑΝΕΛ" /></thead>
              <tbody>
                <TwoColRow leftLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" leftKey="lb_domiki" leftType="Οπτικός" rightLabel="Δομική αρτιότητα, χωρίς ενδείξεις ζημιάς" rightKey="per_domiki" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Ακρυλική πινακίδα στη θέση της" leftKey="lb_acryliki" leftType="Οπτικός" rightLabel="Ποιότητα βαφής" rightKey="per_vafi" rightType="Οπτικός" form={form} set={set} />
                <TwoColRow leftLabel="Λειτουργία κλειδαριάς OK" leftKey="lb_kleidaria" leftType="Οπτικός" rightLabel="" rightKey="" rightType="" form={form} set={set} />
                <TwoColRow leftLabel="Λειτουργία μεντεσέδων OK" leftKey="lb_menteseedes" leftType="Οπτικός" rightLabel="" rightKey="" rightType="" form={form} set={set} />
                <TwoColRow leftLabel="Ποιότητα βαφής" leftKey="lb_vafi" leftType="Οπτικός" rightLabel="" rightKey="" rightType="" form={form} set={set} />
              </tbody>
            </table>

            <table className="w-full border-collapse mb-1">
              <thead><TwoColHeader leftTitle="ΑΥΤΟΚΟΛΛΗΤΑ" rightTitle="GLAZZING" /></thead>
              <tbody>
                <TwoColRow leftLabel="Τοποθέτηση αυτοκόλλητων OK" leftKey="auto_topothesi" leftType="Οπτικός" rightLabel="Τοποθέτηση υαλοπίνακα με σιλικόνη Sieland" rightKey="glazz_topothesi" rightType="Οπτικός" form={form} set={set} />
              </tbody>
            </table>

            <table className="w-full border-collapse mb-1">
              <thead><TwoColHeader leftTitle="ΚΑΔΟΣ ΑΠΟΡΡΙΜΜΑΤΩΝ" rightTitle="ΒΑΣΗ ΠΟΔΗΛΑΤΩΝ" /></thead>
              <tbody>
                <TwoColRow leftLabel="Εγκατάσταση κάδου απορριμμάτων" leftKey="kados_egkat" leftType="Οπτικός" rightLabel="Εγκατάσταση βάσης ποδηλάτων" rightKey="vasipod_egkat" rightType="Οπτικός" form={form} set={set} />
              </tbody>
            </table>

            <table className="w-full border-collapse">
              <thead><TwoColHeader leftTitle="ΟΡΙΖΟΝΤΙΑ ΣΗΜΑΝΣΗ" rightTitle="ΛΟΙΠΑ" /></thead>
              <tbody>
                <TwoColRow leftLabel="Τοποθέτηση οριζόντιας σήμανσης" leftKey="oriz_topothesi" leftType="Οπτικός" rightLabel="" rightKey="" rightType="" form={form} set={set} />
                <TwoColRow leftLabel="Τύπος οριζόντιας σήμανσης" leftKey="oriz_typos" leftType="Δείγμα" rightLabel="" rightKey="" rightType="" form={form} set={set} />
              </tbody>
            </table>

          </PdfSection>

          {/* ── ΚΑΤΑΣΤΑΣΗ ΠΕΡΙΣΤΑΤΙΚΟΥ ── */}
          <PdfSection title="ΚΑΤΑΣΤΑΣΗ ΠΕΡΙΣΤΑΤΙΚΟΥ">
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-4 flex-wrap border-b border-gray-100 pb-1.5">
                <span className="font-bold text-gray-800 w-48">ΑΝΟΙΓΕΙ INCIDENT</span>
                <ChkBox checked={!!form.anoigei_incident_nai} onChange={v => set("anoigei_incident_nai", v)} label="Ναι" />
                <ChkBox checked={!!form.anoigei_incident_ochi} onChange={v => set("anoigei_incident_ochi", v)} label="Όχι" />
              </div>
              <div className="flex items-center gap-4 flex-wrap border-b border-gray-100 pb-1.5">
                <span className="font-bold text-gray-800 w-48">Δυνατή άμεση αποκατάσταση;</span>
                <ChkBox checked={!!form.amesi_apokatastasi_nai} onChange={v => set("amesi_apokatastasi_nai", v)} label="Ναι" />
                <ChkBox checked={!!form.amesi_apokatastasi_ochi} onChange={v => set("amesi_apokatastasi_ochi", v)} label="Όχι" />
                <span className="text-gray-600 ml-2">Εάν εκκρεμεί χρειάζεται:</span>
                <ChkBox checked={!!form.ekkremes_civil} onChange={v => set("ekkremes_civil", v)} label="Civil" />
                <ChkBox checked={!!form.ekkremes_hlektrologos} onChange={v => set("ekkremes_hlektrologos", v)} label="Ηλεκτρολόγο" />
              </div>
              <div className="flex items-center gap-4 flex-wrap border-b border-gray-100 pb-1.5">
                <span className="font-bold text-gray-800 w-48">Μπορεί να κλείσει το περιστατικό;</span>
                <ChkBox checked={!!form.kleisimo_nai} onChange={v => set("kleisimo_nai", v)} label="Ναι" />
                <ChkBox checked={!!form.kleisimo_ochi} onChange={v => set("kleisimo_ochi", v)} label="Όχι" />
                <span className="text-gray-600 ml-2">Φωτογραφίες από επιθεώρηση:</span>
                <ChkBox checked={!!form.photo_prin} onChange={v => set("photo_prin", v)} label="Πριν" />
                <ChkBox checked={!!form.photo_meta} onChange={v => set("photo_meta", v)} label="Μετά" />
              </div>
              <div className="flex items-center gap-4 flex-wrap border-b border-gray-100 pb-1.5">
                <span className="font-bold text-gray-800 w-48">ΕΓΓΥΗΣΗ</span>
                <ChkBox checked={!!form.eggyhsh_nai} onChange={v => set("eggyhsh_nai", v)} label="Ναι" />
                <ChkBox checked={!!form.eggyhsh_ochi} onChange={v => set("eggyhsh_ochi", v)} label="Όχι" />
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-0.5">Σχόλια:</p>
                <EditableTextarea value={form.sxolia} onChange={v => set("sxolia", v)} placeholder="Σχόλια..." rows={2} />
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-0.5">→ Εάν κλείσει κατά την αξιολόγηση, να αναφερθούν οι εργασίες που εκτελέστηκαν:</p>
                <EditableTextarea value={form.ergazies_pou_ektelesan} onChange={v => set("ergazies_pou_ektelesan", v)} placeholder="Περιγραφή εργασιών..." rows={3} />
              </div>
            </div>
          </PdfSection>

          {/* ── ΕΠΑΛΗΘΕΥΣΗ ── */}
          <PdfSection title="ΕΠΑΛΗΘΕΥΣΗ">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold">Εκτελέστηκε από</th>
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold">Ονοματεπώνυμο</th>
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold">Ημερομηνία</th>
                  <th className="border border-gray-300 px-2 py-1 text-left font-bold">Υπογραφή</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-500 italic">Τεχνικός / Ομάδα</td>
                  <td className="border border-gray-300 px-1 py-1">
                    <EditableField value={form.epalitheusi_onoma} onChange={v => set("epalitheusi_onoma", v)} placeholder="Ονοματεπώνυμο..." />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <EditableField type="date" value={form.epalitheusi_imerominia} onChange={v => set("epalitheusi_imerominia", v)} />
                  </td>
                  <td className="border border-gray-300 px-2 py-4 text-xs text-gray-300 italic">— υπογραφή —</td>
                </tr>
              </tbody>
            </table>
          </PdfSection>

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pt-3 pb-2">
            <Button variant="outline" onClick={onClose} className="text-xs h-8">Άκυρο</Button>
            <Button variant="outline" onClick={handlePrint} className="gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" /> PDF / Εκτύπωση
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs h-8">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Αποθήκευση Draft
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5 text-xs h-8 bg-blue-700 hover:bg-blue-800">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Υποβολή Φόρμας
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}