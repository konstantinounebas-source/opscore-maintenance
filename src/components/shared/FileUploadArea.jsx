import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Upload, X, Paperclip, CheckCircle2, AlertTriangle, Loader2, Eye, Download } from "lucide-react";

/**
 * Shared FileUploadArea component.
 * - Accepts multiple files at once (parallel upload)
 * - Shows local preview BEFORE upload completes
 * - Shows upload progress per file
 * - Displays uploaded files with view/download actions
 *
 * Props:
 *   label        - string
 *   files        - array of { name, url } (already uploaded)
 *   onChange     - callback(newFiles: [{name, url}][])
 *   required     - boolean
 *   accept       - string (e.g. "image/*")
 */
export default function FileUploadArea({ label, files = [], onChange, required, accept }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  // pending: array of { name, localUrl, file, status: 'uploading'|'done'|'error', uploadedUrl? }
  const [pending, setPending] = useState([]);

  const isImage = (name, url) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name || "") ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url || "");

  const handleFiles = async (fileList) => {
    const arr = Array.from(fileList);
    if (!arr.length) return;

    // Create pending entries with local object URLs for instant preview
    const entries = arr.map(file => ({
      name: file.name,
      localUrl: URL.createObjectURL(file),
      file,
      status: "uploading",
      uploadedUrl: null,
    }));
    setPending(prev => [...prev, ...entries]);

    // Upload all in parallel
    const results = await Promise.all(
      entries.map(async (entry) => {
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: entry.file });
          return { ...entry, status: "done", uploadedUrl: file_url };
        } catch {
          return { ...entry, status: "error" };
        }
      })
    );

    // Move successfully uploaded files into the confirmed list
    const succeeded = results.filter(r => r.status === "done");
    if (succeeded.length > 0) {
      onChange([...files, ...succeeded.map(r => ({ name: r.name, url: r.uploadedUrl }))]);
    }

    // Remove done entries from pending; keep errors so user sees them
    setPending(prev => {
      const names = new Set(entries.map(e => e.name + e.localUrl));
      const remaining = prev.filter(p => !names.has(p.name + p.localUrl));
      const errors = results.filter(r => r.status === "error");
      return [...remaining, ...errors];
    });

    // Revoke local URLs for done files to free memory
    results.filter(r => r.status === "done").forEach(r => URL.revokeObjectURL(r.localUrl));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const removeUploaded = (idx) => {
    const copy = [...files];
    copy.splice(idx, 1);
    onChange(copy);
  };

  const removePending = (entry) => {
    URL.revokeObjectURL(entry.localUrl);
    setPending(prev => prev.filter(p => p !== entry));
  };

  const handleDownload = async (url, name) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const isUploading = pending.some(p => p.status === "uploading");
  const totalCount = files.length + pending.filter(p => p.status === "uploading").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</Label>
        {required && files.length === 0 && !isUploading && (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <AlertTriangle className="w-3 h-3" /> Required
          </span>
        )}
        {totalCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            {files.length} file{files.length !== 1 ? "s" : ""}
            {isUploading && ` (uploading...)`}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors select-none ${
          dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 mx-auto mb-1 text-indigo-500 animate-spin" />
        ) : (
          <Upload className={`w-5 h-5 mx-auto mb-1 ${dragging ? "text-indigo-500" : "text-slate-400"}`} />
        )}
        <p className="text-xs text-slate-500">
          {isUploading
            ? "Uploading files..."
            : dragging
            ? "Drop files here..."
            : "Drag & drop or click — multiple files supported"}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Pending (uploading + errors) — instant preview */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map((entry, i) => (
            <div key={i} className="relative group">
              {isImage(entry.name, entry.localUrl) ? (
                <div className="relative w-20 h-20">
                  <img
                    src={entry.localUrl}
                    alt={entry.name}
                    className={`w-20 h-20 object-cover rounded-lg border ${
                      entry.status === "error" ? "border-red-300 opacity-60" : "border-slate-200"
                    }`}
                  />
                  {entry.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {entry.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs max-w-[160px] ${
                  entry.status === "error"
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                }`}>
                  {entry.status === "uploading" ? (
                    <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                  ) : entry.status === "error" ? (
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-3 h-3 flex-shrink-0" />
                  )}
                  <span className="truncate">{entry.name}</span>
                </div>
              )}
              {entry.status !== "uploading" && (
                <button
                  type="button"
                  onClick={() => removePending(entry)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              {isImage(f.name, f.url) ? (
                <div className="relative w-20 h-20">
                  <img
                    src={f.url}
                    alt={f.name}
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                  />
                  {/* hover overlay with actions */}
                  <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                      title="View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDownload(f.url, f.name); }}
                      className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 max-w-[180px]">
                  <Paperclip className="w-3 h-3 flex-shrink-0 text-slate-400" />
                  <span className="truncate flex-1">{f.name}</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-0.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600"
                      title="View"
                    >
                      <Eye className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDownload(f.url, f.name); }}
                      className="p-0.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeUploaded(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}