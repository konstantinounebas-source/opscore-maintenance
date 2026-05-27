/**
 * FMPIReadOnlyViewer — Read-only, printable view of a FMPI & Pricing Order submission.
 * Used by the CA Approval Modal so the CA can review the form before making their decision.
 * Includes signature/name section at the bottom for printing.
 */
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, X, Euro, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

function fmtDate(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; }
}
function fmtNum(n) {
  if (n == null || n === "" || isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

function RO({ label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 font-medium min-h-[22px]">{value || <span className="text-slate-300 italic">—</span>}</p>
    </div>
  );
}

function SectionBlock({ title, children }) {
  return (
    <div className="mb-5">
      <div className="bg-slate-100 px-3 py-1.5 rounded-t-md border border-slate-200 border-b-0">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</p>
      </div>
      <div className="border border-slate-200 rounded-b-md p-4 space-y-4 bg-white">
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
  const owrDisplay = owrRaw === "Yes" ? "ΝΑΙ (Εκτός Εγγύησης)" : owrRaw === "No" ? "ΟΧΙ (Εντός Εγγύησης)" : owrRaw || "—";
  const caRaw = submission?.apaiteitai_eggkrisi_ca;
  const caDisplay = caRaw === "Yes" ? "ΝΑΙ (Απαιτείται Έγκριση)" : caRaw === "No" ? "ΟΧΙ" : caRaw || "—";

  const handlePrint = () => {
    const printContents = document.getElementById("fmpi-ro-printable")?.innerHTML;
    if (!printContents) return;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FMPI & Pricing Order — ${submission?.form_name || "Review"}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; padding: 20px; }
            h1 { font-size: 15pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
            h2 { font-size: 10pt; text-align: center; color: #64748b; margin-bottom: 16px; }
            .section-title { background: #f1f5f9; border: 1px solid #e2e8f0; border-bottom: none; padding: 6px 10px; font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; border-radius: 4px 4px 0 0; }
            .section-body { border: 1px solid #e2e8f0; border-radius: 0 0 4px 4px; padding: 12px; margin-bottom: 14px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
            .field-label { font-size: 8pt; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
            .field-value { font-size: 10.5pt; font-weight: 500; color: #0f172a; min-height: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 6px; }
            th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 8pt; }
            td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: middle; }
            tr:nth-child(even) td { background: #f8fafc; }
            .total-row td { font-weight: bold; background: #1e3a8a; color: white; font-size: 11pt; }
            .sig-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-top: 10px; }
            .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; align-items: start; }
            .sig-img { max-height: 60px; object-fit: contain; border: 1px solid #e2e8f0; padding: 4px; border-radius: 4px; }
            .sig-line { border-bottom: 1px solid #334155; min-height: 50px; margin-top: 4px; }
            .status-pill { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 8pt; font-weight: 600; }
            .owr-yes { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
            .owr-no  { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
            .ca-yes  { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
            .ca-no   { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div>
          <p className="text-sm font-bold text-slate-800">{submission?.form_name || "FMPI & Pricing Order"}</p>
          <p className="text-xs text-slate-500">
            Status: <span className={`font-semibold ${submission?.status === "Submitted" ? "text-blue-700" : "text-green-700"}`}>{submission?.status}</span>
            {submission?.submitted_at && <> · Submitted: {fmtDate(submission.submitted_at)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </Button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        {/* Printable zone */}
        <div id="fmpi-ro-printable">
          {/* Print-only header */}
          <h1 className="hidden print:block text-center text-lg font-bold mb-1">FMPI &amp; Pricing Order</h1>

          <SectionBlock title="1. Γενικά Στοιχεία / Incident">
            <div className="grid grid-cols-2 gap-4">
              <RO label="Form Name" value={submission?.form_name} />
              <RO label="Status" value={submission?.status} />
              <RO label="Submitted At" value={fmtDate(submission?.submitted_at)} />
              <RO label="Submitted By" value={submission?.submitted_by} />
              <RO label="Ημερομηνία Outline plan" value={fmtDate(submission?.fmp_outline_date)} />
            </div>
          </SectionBlock>

          <SectionBlock title="2. Λογική Απόφασης">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Εκτός Εγγύησης (OWR)</p>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  owrRaw === "Yes" ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"
                }`}>
                  {owrRaw === "Yes" ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {owrDisplay}
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Απαιτείται Έγκριση CA</p>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  caRaw === "Yes" ? "bg-red-100 text-red-700 border-red-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"
                }`}>
                  {caDisplay}
                </span>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="3. Περιγραφή Εργασιών (Work Items)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase">
                    <th className="px-3 py-2 text-left border border-slate-200" style={{ minWidth: 180 }}>Περιγραφή / Child</th>
                    <th className="px-3 py-2 text-center border border-slate-200" style={{ width: 80 }}>Ποσότητα</th>
                    <th className="px-3 py-2 text-center border border-slate-200" style={{ width: 120 }}>Τιμή Μονάδας (€)</th>
                    <th className="px-3 py-2 text-center border border-slate-200" style={{ width: 120 }}>Ποσό (€)</th>
                    <th className="px-3 py-2 text-center border border-slate-200" style={{ width: 80 }}>Επιβεβ.</th>
                    <th className="px-3 py-2 text-left border border-slate-200">Σχόλια</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-400 italic py-4 border border-slate-200">Δεν υπάρχουν εγγραφές</td></tr>
                  )}
                  {rows.map((row, i) => {
                    const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
                    return (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 border border-slate-200 text-slate-800">
                          {(() => {
                            const cat = catalogMap[row.catalog_id];
                            return cat ? (
                              <>
                                <span>{cat.display_name || cat.child_name}</span>
                                {cat.child_category && <p className="text-[10px] text-slate-400">{cat.child_category}</p>}
                              </>
                            ) : (row.catalog_name || row.catalog_id || <span className="text-slate-400 italic">—</span>);
                          })()}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 text-center">{row.qty}</td>
                        <td className="px-3 py-2 border border-slate-200 text-center">{fmtNum(row.unit_price)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-center font-semibold text-blue-800">{fmtNum(amount)}</td>
                        <td className="px-3 py-2 border border-slate-200 text-center">{row.confirmed ? "✓" : ""}</td>
                        <td className="px-3 py-2 border border-slate-200 text-slate-600">{row.comments || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-700 text-white">
                    <td colSpan={3} className="px-3 py-2.5 font-bold text-right border border-indigo-600 uppercase tracking-wide text-xs">
                      ΚΟΣΤΟΣ ΕΡΓΑΣΙΩΝ (ΣΥΝΟΛΟ):
                    </td>
                    <td className="px-3 py-2.5 font-bold text-center border border-indigo-600 text-base">
                      <span className="flex items-center justify-center gap-1"><Euro className="w-4 h-4" /> {totalCost.toFixed(2)}</span>
                    </td>
                    <td colSpan={2} className="border border-indigo-600"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionBlock>

          {fd.comments && (
            <SectionBlock title="Σχόλια / Παρατηρήσεις">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{fd.comments}</p>
            </SectionBlock>
          )}

          {/* Signature Section — always shown for printing */}
          <SectionBlock title="Παραλαβή / Υπογραφή — Εκπρόσωπος Αναθέτουσας Αρχής">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</p>
                  <p className="text-sm font-medium text-slate-800 border-b border-slate-300 pb-1 min-h-[24px]">
                    {fd.sig_name || <span className="text-slate-300 italic">——————————————</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">ΥΠΗΡΕΣΙΑ / ΘΕΣΗ</p>
                  <p className="text-sm font-medium text-slate-800 border-b border-slate-300 pb-1 min-h-[24px]">
                    {fd.sig_service || <span className="text-slate-300 italic">——————————————</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">ΗΜΕΡ. ΠΑΡΑΛΑΒΗΣ</p>
                  <p className="text-sm font-medium text-slate-800 border-b border-slate-300 pb-1 min-h-[24px]">
                    {fd.sig_date ? fmtDate(fd.sig_date) : <span className="text-slate-300 italic">——————————</span>}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">ΥΠΟΓΡΑΦΗ</p>
                {fd.sig_upload?.url ? (
                  <img src={fd.sig_upload.url} alt="Υπογραφή" className="h-20 border border-slate-200 rounded-lg object-contain bg-white px-2" />
                ) : (
                  <div className="border-b-2 border-slate-400 min-h-[80px] rounded-sm bg-slate-50 flex items-end justify-center pb-1">
                    <span className="text-[10px] text-slate-300 italic">Υπογραφή</span>
                  </div>
                )}
              </div>
            </div>

            {/* CA Decision section (for printing after decision) */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">ΑΠΟΦΑΣΗ CA (Contracting Authority)</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Απόφαση</p>
                  <div className="border-b border-slate-300 min-h-[60px] bg-slate-50 rounded-sm"></div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Ονοματεπώνυμο CA</p>
                  <div className="border-b border-slate-300 min-h-[60px] bg-slate-50 rounded-sm"></div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Υπογραφή CA</p>
                  <div className="border-b border-slate-300 min-h-[60px] bg-slate-50 rounded-sm"></div>
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>
      </div>
    </div>
  );
}