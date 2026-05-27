/**
 * FMPIReadOnlyViewer — Read-only, printable view of a FMPI & Pricing Order submission.
 * Used by the CA Approval Modal so the CA can review before making a decision.
 */
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, X, Euro, AlertTriangle, CheckCircle2, FileCheck } from "lucide-react";
import { format } from "date-fns";

function fmtDate(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; }
}
function fmtNum(n) {
  if (n == null || n === "" || isNaN(Number(n))) return "—";
  return Number(n).toFixed(2);
}

function FieldRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-800 font-medium border-b border-slate-100 pb-1 min-h-[22px]">
        {value || <span className="text-slate-300 italic">—</span>}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="bg-slate-700 text-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-t">
        {title}
      </div>
      <div className="border border-slate-200 rounded-b bg-white px-4 py-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function FMPIReadOnlyViewer({ submission, onClose }) {
  const fd = submission?.form_data || {};
  const rows = fd.rows || [];

  const { data: childCatalog = [] } = useQuery({
    queryKey: ["childCatalog"],
    queryFn: () => base44.entities.ChildCatalog.list(),
  });
  const catalogMap = useMemo(() => Object.fromEntries(childCatalog.map(c => [c.id, c])), [childCatalog]);

  const totalCost = rows.reduce((s, r) => s + (parseFloat(r.unit_price) || 0) * (parseFloat(r.qty) || 0), 0);
  const owrRaw = submission?.ektos_eggyhshs;
  const caRaw = submission?.apaiteitai_eggkrisi_ca;
  const owrDisplay = owrRaw === "Yes" ? "ΝΑΙ — Εκτός Εγγύησης" : owrRaw === "No" ? "ΟΧΙ — Εντός Εγγύησης" : owrRaw || "—";
  const caDisplay = caRaw === "Yes" ? "ΝΑΙ — Απαιτείται Έγκριση" : caRaw === "No" ? "ΟΧΙ" : caRaw || "—";

  const handlePrint = () => {
    const rowsHtml = rows.map((row, i) => {
      const cat = catalogMap[row.catalog_id];
      const name = cat ? (cat.display_name || cat.child_name) : (row.catalog_name || row.catalog_id || "—");
      const category = cat?.child_category || "";
      const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
        <tr style="background:${bg}">
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:9pt">
            ${name}${category ? `<br><small style="color:#94a3b8;font-size:7.5pt">${category}</small>` : ""}
          </td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:9pt">${row.qty || ""}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:9pt">${fmtNum(row.unit_price)}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;color:#1e3a8a;font-size:9pt">${fmtNum(amount)}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:center;font-size:10pt">${row.confirmed ? "✓" : ""}</td>
          <td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:9pt;color:#475569">${row.comments || ""}</td>
        </tr>`;
    }).join("");

    const sigImgHtml = fd.sig_upload?.url
      ? `<img src="${fd.sig_upload.url}" style="max-height:64px;object-fit:contain;border:1px solid #e2e8f0;padding:4px;border-radius:4px"/>`
      : `<div style="border-bottom:2px solid #94a3b8;min-height:64px;"></div>`;

    const owrBg = owrRaw === "Yes" ? "#fef3c7" : "#d1fae5";
    const owrColor = owrRaw === "Yes" ? "#92400e" : "#065f46";
    const owrBorder = owrRaw === "Yes" ? "#fcd34d" : "#34d399";
    const caBg = caRaw === "Yes" ? "#fee2e2" : "#d1fae5";
    const caColor = caRaw === "Yes" ? "#991b1b" : "#065f46";
    const caBorder = caRaw === "Yes" ? "#fca5a5" : "#34d399";

    const commentsBlock = fd.comments ? `
      <div class="section-title">Σχόλια / Παρατηρήσεις</div>
      <div class="section-body">
        <p style="font-size:10pt;color:#1e293b;white-space:pre-wrap">${fd.comments}</p>
      </div>` : "";

    const win = window.open("", "_blank", "width=900,height=750");
    win.document.write(`<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8"/>
  <title>FMPI &amp; Pricing Order</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #1e293b;
      background: #fff;
      padding: 18mm 15mm 18mm 15mm;
    }
    /* ── Header ── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .doc-title { font-size: 16pt; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
    .doc-subtitle { font-size: 9pt; color: #64748b; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 8.5pt; color: #64748b; line-height: 1.6; }
    .status-pill {
      display: inline-block; padding: 2px 10px;
      border-radius: 20px; font-size: 8pt; font-weight: 700;
      background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;
    }
    /* ── Sections ── */
    .section-title {
      background: #334155; color: #fff;
      padding: 5px 10px;
      font-size: 8.5pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.06em;
      border-radius: 3px 3px 0 0;
      margin-top: 10px;
    }
    .section-body {
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 3px 3px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #fff;
    }
    /* ── Grid ── */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 16px; }
    .field-label {
      font-size: 7.5pt; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .field-value {
      font-size: 10pt; font-weight: 500; color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px; min-height: 18px;
    }
    /* ── Badge ── */
    .badge {
      display: inline-block; padding: 2px 9px;
      border-radius: 20px; font-size: 8pt; font-weight: 700;
      border: 1px solid;
    }
    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 4px; }
    th {
      background: #1e3a8a; color: #fff;
      border: 1px solid #1e3a8a;
      padding: 6px 8px; text-align: left;
      font-weight: 700; font-size: 8pt;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: middle; }
    .total-row td {
      background: #1e3a8a; color: #fff;
      font-weight: 700; font-size: 10.5pt;
      border: 1px solid #1e3a8a;
    }
    /* ── Signature block ── */
    .sig-label {
      font-size: 7.5pt; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .sig-line {
      border-bottom: 1.5px solid #334155;
      min-height: 22px; padding-top: 4px;
      font-size: 10pt; font-weight: 500; color: #0f172a;
    }
    .sig-empty-box {
      border: 1px dashed #cbd5e1;
      min-height: 68px; border-radius: 4px;
      background: #f8fafc;
    }
    .ca-box {
      border: 1px dashed #94a3b8;
      min-height: 68px;
      border-radius: 4px;
      background: #f8fafc;
    }
    /* ── Footer ── */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 14px; padding-top: 6px;
      font-size: 7.5pt; color: #94a3b8;
      display: flex; justify-content: space-between;
    }
    @media print {
      body { padding: 12mm 12mm; }
      @page { size: A4 portrait; margin: 12mm; }
    }
  </style>
</head>
<body>

  <!-- Document Header -->
  <div class="doc-header">
    <div>
      <div class="doc-title">FMPI &amp; Pricing Order</div>
      <div class="doc-subtitle">Full Management Plan &amp; Invoice Submission</div>
    </div>
    <div class="doc-meta">
      <span class="status-pill">${submission?.status || ""}</span><br/>
      Submitted: ${fmtDate(submission?.submitted_at)}<br/>
      By: ${submission?.submitted_by || "—"}
    </div>
  </div>

  <!-- Section 1: General Info -->
  <div class="section-title">1. Γενικά Στοιχεία / General</div>
  <div class="section-body">
    <div class="grid-2">
      <div>
        <div class="field-label">Form Name</div>
        <div class="field-value">${submission?.form_name || "—"}</div>
      </div>
      <div>
        <div class="field-label">Ημερομηνία Outline Management Plan</div>
        <div class="field-value">${fmtDate(submission?.fmp_outline_date)}</div>
      </div>
      <div>
        <div class="field-label">Submitted At</div>
        <div class="field-value">${fmtDate(submission?.submitted_at)}</div>
      </div>
      <div>
        <div class="field-label">Submitted By</div>
        <div class="field-value">${submission?.submitted_by || "—"}</div>
      </div>
    </div>
  </div>

  <!-- Section 2: Decision Logic -->
  <div class="section-title">2. Λογική Απόφασης / Decision Logic</div>
  <div class="section-body">
    <div class="grid-2">
      <div>
        <div class="field-label">Εκτός Εγγύησης (OWR)</div>
        <div style="margin-top:4px">
          <span class="badge" style="background:${owrBg};color:${owrColor};border-color:${owrBorder}">${owrDisplay}</span>
        </div>
      </div>
      <div>
        <div class="field-label">Απαιτείται Έγκριση CA</div>
        <div style="margin-top:4px">
          <span class="badge" style="background:${caBg};color:${caColor};border-color:${caBorder}">${caDisplay}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Section 3: Work Items -->
  <div class="section-title">3. Περιγραφή Εργασιών βάσει Συμβολαίου (Work Items)</div>
  <div class="section-body">
    <table>
      <thead>
        <tr>
          <th style="min-width:170px">Περιγραφή / Child</th>
          <th style="width:70px;text-align:center">Ποσότητα</th>
          <th style="width:110px;text-align:center">Τιμή Μονάδας (€)</th>
          <th style="width:110px;text-align:center">Ποσό (€)</th>
          <th style="width:65px;text-align:center">Επιβεβ.</th>
          <th>Σχόλια</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:#94a3b8;font-style:italic;padding:12px">Δεν υπάρχουν εγγραφές</td></tr>` : rowsHtml}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3" style="text-align:right;padding:8px 10px;font-size:9pt;letter-spacing:0.04em">ΚΟΣΤΟΣ ΕΡΓΑΣΙΩΝ — ΣΥΝΟΛΟ:</td>
          <td style="text-align:center;font-size:13pt;padding:8px 10px">€ ${totalCost.toFixed(2)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${commentsBlock}

  <!-- Section: Signatures -->
  <div class="section-title">Παραλαβή / Υπογραφή — Εκπρόσωπος Αναθέτουσας Αρχής</div>
  <div class="section-body">
    <div class="grid-2" style="gap:16px 30px;margin-bottom:14px">
      <div>
        <div class="sig-label">Ονοματεπώνυμο</div>
        <div class="sig-line">${fd.sig_name || ""}</div>
      </div>
      <div>
        <div class="sig-label">Υπηρεσία / Θέση</div>
        <div class="sig-line">${fd.sig_service || ""}</div>
      </div>
      <div>
        <div class="sig-label">Ημερομηνία Παραλαβής</div>
        <div class="sig-line">${fd.sig_date ? fmtDate(fd.sig_date) : ""}</div>
      </div>
      <div>
        <div class="sig-label">Υπογραφή Εκπροσώπου</div>
        <div style="margin-top:4px">${sigImgHtml}</div>
      </div>
    </div>

    <!-- CA Decision Block -->
    <div style="border-top:1.5px solid #e2e8f0;margin-top:14px;padding-top:12px">
      <div style="font-size:8.5pt;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">
        Απόφαση CA — Contracting Authority
      </div>
      <div class="grid-3" style="gap:12px">
        <div>
          <div class="sig-label">Απόφαση (Approved / Rejected)</div>
          <div class="ca-box"></div>
        </div>
        <div>
          <div class="sig-label">Ονοματεπώνυμο CA</div>
          <div class="ca-box"></div>
        </div>
        <div>
          <div class="sig-label">Υπογραφή CA</div>
          <div class="ca-box"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <span>FMPI &amp; Pricing Order — Confidential</span>
    <span>Printed: ${fmtDate(new Date().toISOString())}</span>
  </div>

</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      {/* Sticky header toolbar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <FileCheck className="w-4 h-4 text-indigo-600" />
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">
              {submission?.form_name || "FMPI & Pricing Order"}
            </p>
            <p className="text-xs text-slate-400">
              <span className={`font-semibold ${submission?.status === "Submitted" ? "text-blue-700" : "text-green-700"}`}>
                {submission?.status}
              </span>
              {submission?.submitted_at && <> · {fmtDate(submission.submitted_at)}</>}
              {submission?.submitted_by && <> · {submission.submitted_by}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6" style={{ minHeight: 0 }}>
        <div className="max-w-3xl mx-auto space-y-0">

          {/* Section 1 */}
          <Section title="1. Γενικά Στοιχεία / General">
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="Form Name" value={submission?.form_name} />
              <FieldRow label="Ημερομηνία Outline plan" value={fmtDate(submission?.fmp_outline_date)} />
              <FieldRow label="Submitted At" value={fmtDate(submission?.submitted_at)} />
              <FieldRow label="Submitted By" value={submission?.submitted_by} />
            </div>
          </Section>

          {/* Section 2 */}
          <Section title="2. Λογική Απόφασης / Decision Logic">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Εκτός Εγγύησης (OWR)</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  owrRaw === "Yes" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }`}>
                  {owrRaw === "Yes" ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {owrDisplay}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Απαιτείται Έγκριση CA</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  caRaw === "Yes" ? "bg-red-100 text-red-800 border-red-300" : "bg-emerald-100 text-emerald-800 border-emerald-300"
                }`}>
                  {caDisplay}
                </span>
              </div>
            </div>
          </Section>

          {/* Section 3: Work Items */}
          <Section title="3. Περιγραφή Εργασιών (Work Items)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="px-3 py-2 text-left font-semibold border border-slate-600" style={{ minWidth: 160 }}>Περιγραφή / Child</th>
                    <th className="px-3 py-2 text-center font-semibold border border-slate-600" style={{ width: 72 }}>Ποσότητα</th>
                    <th className="px-3 py-2 text-center font-semibold border border-slate-600" style={{ width: 100 }}>Τιμή Μον. (€)</th>
                    <th className="px-3 py-2 text-center font-semibold border border-slate-600" style={{ width: 100 }}>Ποσό (€)</th>
                    <th className="px-3 py-2 text-center font-semibold border border-slate-600" style={{ width: 64 }}>Επιβεβ.</th>
                    <th className="px-3 py-2 text-left font-semibold border border-slate-600">Σχόλια</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-400 italic py-6 border border-slate-200">Δεν υπάρχουν εγγραφές</td></tr>
                  )}
                  {rows.map((row, i) => {
                    const cat = catalogMap[row.catalog_id];
                    const name = cat ? (cat.display_name || cat.child_name) : (row.catalog_name || row.catalog_id || "—");
                    const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 border border-slate-200 text-slate-800">
                          {name}
                          {cat?.child_category && <p className="text-[10px] text-slate-400">{cat.child_category}</p>}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 text-center">{row.qty}</td>
                        <td className="px-3 py-2 border border-slate-200 text-center">{fmtNum(row.unit_price)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-center font-semibold text-indigo-800">{fmtNum(amount)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-center text-green-700 font-bold">{row.confirmed ? "✓" : ""}</td>
                        <td className="px-3 py-2 border border-slate-200 text-slate-600">{row.comments || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-700 text-white">
                    <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-xs uppercase tracking-wide border border-indigo-600">
                      ΚΟΣΤΟΣ ΕΡΓΑΣΙΩΝ — ΣΥΝΟΛΟ:
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-sm border border-indigo-600">
                      <span className="flex items-center justify-center gap-1">
                        <Euro className="w-3.5 h-3.5" /> {totalCost.toFixed(2)}
                      </span>
                    </td>
                    <td colSpan={2} className="border border-indigo-600"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          {/* Comments */}
          {fd.comments && (
            <Section title="Σχόλια / Παρατηρήσεις">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{fd.comments}</p>
            </Section>
          )}

          {/* Signature section */}
          <Section title="Παραλαβή / Υπογραφή — Εκπρόσωπος Αναθέτουσας Αρχής">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ονοματεπώνυμο</p>
                <p className="text-sm font-medium text-slate-800 border-b border-slate-300 pb-1 min-h-[24px]">
                  {fd.sig_name || <span className="text-slate-300 italic">——————————————</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Υπηρεσία / Θέση</p>
                <p className="text-sm font-medium text-slate-800 border-b border-slate-300 pb-1 min-h-[24px]">
                  {fd.sig_service || <span className="text-slate-300 italic">——————————————</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ημερομηνία Παραλαβής</p>
                <p className="text-sm font-medium text-slate-800 border-b border-slate-300 pb-1 min-h-[24px]">
                  {fd.sig_date ? fmtDate(fd.sig_date) : <span className="text-slate-300 italic">——————————</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Υπογραφή</p>
                {fd.sig_upload?.url ? (
                  <img src={fd.sig_upload.url} alt="Υπογραφή" className="h-16 border border-slate-200 rounded object-contain bg-white px-2" />
                ) : (
                  <div className="border-2 border-dashed border-slate-300 min-h-[64px] rounded bg-slate-50 flex items-center justify-center">
                    <span className="text-[10px] text-slate-300 italic">Δεν έχει ανεβεί υπογραφή</span>
                  </div>
                )}
              </div>
            </div>

            {/* CA Decision block */}
            <div className="mt-5 pt-4 border-t-2 border-dashed border-slate-300">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Απόφαση CA — Contracting Authority
              </p>
              <div className="grid grid-cols-3 gap-4">
                {["Απόφαση (Approved / Rejected)", "Ονοματεπώνυμο CA", "Υπογραφή CA"].map(label => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                    <div className="border border-dashed border-slate-300 min-h-[64px] rounded bg-slate-50"></div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}