import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

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
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      setErrorMsg("Please upload an .xlsx or .xls file.");
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

  const handleImport = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const response = await base44.functions.invoke("importBusShelterOrders", { file_url });
    const data = response.data;

    if (data?.success) {
      setResult(data);
      setStatus("success");
      onSuccess?.();
    } else {
      setErrorMsg(data?.error || "Import failed. Please try again.");
      setStatus("error");
    }
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
                Upload your Excel file (<code className="bg-slate-100 px-1 rounded text-xs">Base44_Import_Lean</code> sheet will be used).
                Duplicate asset codes will be skipped automatically.
              </p>

              {/* Drop zone */}
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
                    <p className="text-sm text-slate-600">Drop your Excel file here</p>
                    <p className="text-xs text-slate-400">or click to browse</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
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
                  Uploading and importing data… this may take a moment for large files.
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