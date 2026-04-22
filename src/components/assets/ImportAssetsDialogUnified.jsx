import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Unified asset import dialog.
 * Parses the file client-side and calls the importAssets backend function.
 * The canonical template columns match the unified AssetFormUnified field model.
 */
export default function ImportAssetsDialogUnified({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const reset = () => { setFile(null); setStatus("idle"); setResult(null); setErrorMsg(""); };

  const handleFile = (f) => {
    if (!f || !(f instanceof File)) { setErrorMsg("Invalid file."); setStatus("error"); return; }
    if (f.size === 0) { setErrorMsg("The selected file is empty."); setStatus("error"); return; }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) { setErrorMsg("Unsupported file type. Use .csv, .xlsx, or .xls."); setStatus("error"); return; }
    setFile(f); setStatus("idle"); setErrorMsg("");
  };

  const downloadTemplate = () => {
    const headers = [
      "active_shelter_id",
      "asset_name",
      "status",
      "asset_stage",
      "location_address",
      "city",
      "municipality",
      "latitude",
      "longitude",
      "shelter_type",
      "ordered_shelter_type",
      "installed_shelter_type",
      "existing_condition",
      "has_bay",
      "order_year",
      "installation_date",
      "delivery_date",
      "delivery_year",
      "warranty_base_year",
      "software_warranty_end_date",
      "electronics_warranty_end_date",
      "materials_warranty_end_date",
      "structural_warranty_end_date",
      "preventive_inspection_date",
      "next_inspection_date",
      "notes",
      "description",
    ];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "assets_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseFile = (file) => new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        Papa.parse(e.target.result, {
          header: true, dynamicTyping: false, skipEmptyLines: true,
          complete: (res) => res.data?.length ? resolve(res.data) : reject("No rows found in CSV."),
          error: (err) => reject(`CSV error: ${err.message}`),
        });
      };
      reader.onerror = () => reject("Failed to read file.");
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const TARGET = "Base44_Import";
        const sName = wb.SheetNames.includes(TARGET) ? TARGET : wb.SheetNames[0];
        if (!sName) { reject("No sheets in Excel file."); return; }
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sName], { defval: null });
        rows?.length ? resolve(rows) : reject(`No rows in sheet "${sName}".`);
      };
      reader.onerror = () => reject("Failed to read file.");
      reader.readAsBinaryString(file);
    }
  });

  const handleImport = async () => {
    if (!file) return;
    setStatus("uploading"); setErrorMsg(""); setResult(null);
    let parsedRows;
    try { parsedRows = await parseFile(file); }
    catch (e) { setErrorMsg(typeof e === "string" ? e : e.message || "Failed to parse file."); setStatus("error"); return; }
    if (!parsedRows?.length) { setErrorMsg("No rows found."); setStatus("error"); return; }

    const BATCH = 200;
    let totalCreated = 0, totalUpdated = 0, totalSkipped = 0, allSkipped = [];
    for (let i = 0; i < parsedRows.length; i += BATCH) {
      const batch = parsedRows.slice(i, i + BATCH);
      const response = await base44.functions.invoke("importAssets", { rows: batch });
      const data = response.data;
      if (!data?.success) { setErrorMsg(data?.error || "Import failed."); setStatus("error"); return; }
      totalCreated += data.created || 0;
      totalUpdated += data.updated || 0;
      totalSkipped += data.skipped || 0;
      allSkipped = allSkipped.concat(data.skipped_details || []);
    }
    setResult({ total_rows: parsedRows.length, created: totalCreated, updated: totalUpdated, skipped: totalSkipped, skipped_details: allSkipped });
    setStatus("success");
    onSuccess?.();
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Import Assets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {status !== "success" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Upload a <code className="bg-slate-100 px-1 rounded text-xs">.csv</code>,{" "}
                  <code className="bg-slate-100 px-1 rounded text-xs">.xlsx</code>, or{" "}
                  <code className="bg-slate-100 px-1 rounded text-xs">.xls</code> file.
                  Existing records (matched by <strong>active_shelter_id</strong>) will be updated.
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadTemplate}>
                <Download className="w-4 h-4" /> Download Template
              </Button>

              <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              >
                <Upload className="w-8 h-8 text-slate-400" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Drop your file here</p>
                    <p className="text-xs text-slate-400">or click to browse (.csv, .xlsx, .xls)</p>
                  </div>
                )}
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
              </div>

              {status === "error" && errorMsg && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{errorMsg}
                </div>
              )}
              {status === "uploading" && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />Parsing and importing… this may take a moment for large files.
                </div>
              )}
            </>
          )}

          {status === "success" && result && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-indigo-500" />
              <div>
                <p className="text-lg font-semibold text-slate-800">Import Complete</p>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium text-indigo-700">{result.created}</span> created
                  {result.updated > 0 && <>, <span className="font-medium text-blue-600">{result.updated}</span> updated</>}
                  {result.skipped > 0 && <>, <span className="font-medium text-amber-600">{result.skipped}</span> skipped</>}
                  {" "}out of <span className="font-medium">{result.total_rows}</span> rows.
                </p>
              </div>
              {result.skipped_details?.length > 0 && (
                <details className="text-left w-full">
                  <summary className="text-xs text-slate-400 cursor-pointer">View skipped details</summary>
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-500 bg-slate-50 rounded p-2 space-y-0.5">
                    {result.skipped_details.map((s, i) => (
                      <div key={i}><span className="font-mono">{s.id}</span> — {s.reason}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "success" ? (
            <Button onClick={handleClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={status === "uploading"}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file || status === "uploading"} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                {status === "uploading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4" /> Import</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}