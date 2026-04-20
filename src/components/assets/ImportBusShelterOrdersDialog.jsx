import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export default function ImportBusShelterOrdersDialog({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  const handleFile = (f) => {
    if (!f || !(f instanceof File)) {
      setErrorMsg("Invalid file object. Please select a file.");
      setStatus("error");
      return;
    }
    if (f.size === 0) {
      setErrorMsg("The selected file is empty.");
      setStatus("error");
      return;
    }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setErrorMsg("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const parseFile = (file) => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split(".").pop().toLowerCase();

      if (ext === "csv") {
        const reader = new FileReader();
        reader.onload = (e) => {
          Papa.parse(e.target.result, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (!results.data || results.data.length === 0) {
                reject("No rows found in the CSV file.");
              } else {
                resolve(results.data);
              }
            },
            error: (err) => reject(`CSV parsing error: ${err.message}`),
          });
        };
        reader.onerror = () => reject("Failed to read file.");
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const workbook = XLSX.read(e.target.result, { type: "binary" });
          const TARGET_SHEET = "Base44_Import_Lean";
          const sheetName = workbook.SheetNames.includes(TARGET_SHEET)
            ? TARGET_SHEET
            : workbook.SheetNames[0];

          if (!sheetName) {
            reject("No sheets found in the Excel file.");
            return;
          }

          if (!workbook.SheetNames.includes(TARGET_SHEET) && workbook.SheetNames.length > 0) {
            // using first sheet as fallback — that's fine, no error needed
          }

          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
          if (!rows || rows.length === 0) {
            reject(`No rows found in sheet "${sheetName}".`);
          } else {
            resolve(rows);
          }
        };
        reader.onerror = () => reject("Failed to read file.");
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    setResult(null);

    let parsedRows;
    try {
      parsedRows = await parseFile(file);
    } catch (e) {
      setErrorMsg(typeof e === "string" ? e : e.message || "Failed to parse file.");
      setStatus("error");
      return;
    }

    if (!parsedRows || parsedRows.length === 0) {
      setErrorMsg("No rows found in the file.");
      setStatus("error");
      return;
    }

    // Send in batches of 200 rows
    const BATCH_SIZE = 200;
    let totalCreated = 0;
    let totalSkipped = 0;
    let allSkippedDetails = [];

    for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + BATCH_SIZE);
      const response = await base44.functions.invoke("importBusShelterOrders", { rows: batch });
      const data = response.data;

      if (!data?.success) {
        setErrorMsg(data?.error || "Import failed. Please try again.");
        setStatus("error");
        return;
      }

      totalCreated += data.created || 0;
      totalSkipped += data.skipped || 0;
      allSkippedDetails = allSkippedDetails.concat(data.skipped_details || []);
    }

    setResult({
      success: true,
      total_rows: parsedRows.length,
      created: totalCreated,
      skipped: totalSkipped,
      skipped_details: allSkippedDetails,
    });
    setStatus("success");
    onSuccess?.();
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Import Bus Shelter Orders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {status !== "success" && (
            <>
              <p className="text-sm text-slate-500">
                Upload a <code className="bg-slate-100 px-1 rounded text-xs">.csv</code>,{" "}
                <code className="bg-slate-100 px-1 rounded text-xs">.xlsx</code>, or{" "}
                <code className="bg-slate-100 px-1 rounded text-xs">.xls</code> file. For Excel files,
                the <code className="bg-slate-100 px-1 rounded text-xs">Base44_Import_Lean</code> sheet
                will be used if present. Duplicate asset codes are skipped automatically.
              </p>

              <div
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
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
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {status === "error" && errorMsg && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {status === "uploading" && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing and importing data… this may take a moment for large files.
                </div>
              )}
            </>
          )}

          {status === "success" && result && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <div>
                <p className="text-lg font-semibold text-slate-800">Import Complete</p>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-medium text-emerald-700">{result.created}</span> records imported
                  {result.skipped > 0 && (
                    <>, <span className="font-medium text-amber-600">{result.skipped}</span> skipped (duplicates)</>
                  )}
                  {" "}out of <span className="font-medium">{result.total_rows}</span> total rows.
                </p>
              </div>
              {result.skipped_details?.length > 0 && (
                <details className="text-left w-full">
                  <summary className="text-xs text-slate-400 cursor-pointer">View skipped codes</summary>
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-500 bg-slate-50 rounded p-2 space-y-0.5">
                    {result.skipped_details.map((s, i) => (
                      <div key={i}><span className="font-mono">{s.code}</span> — {s.reason}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "success" ? (
            <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={status === "uploading"}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || status === "uploading"}
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              >
                {status === "uploading" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Import</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}