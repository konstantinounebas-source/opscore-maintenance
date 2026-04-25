import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Image, Eye, Download, Trash2, Plus, Search, X, Paperclip
} from "lucide-react";

const CATEGORIES = [
  "Authority Order", "Authority Instruction", "Location Photo", "Site Photo",
  "Map / Coordinates", "Approval Evidence", "PDF Document", "Other"
];

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType, fileName) {
  if (mimeType && mimeType.startsWith("image/")) return true;
  const ext = (fileName || "").split(".").pop().toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

function isPDF(mimeType, fileName) {
  if (mimeType === "application/pdf") return true;
  return (fileName || "").toLowerCase().endsWith(".pdf");
}

async function logActivity(stationLogId, action, description, stage = 1) {
  await base44.entities.StationLogActivityLog.create({
    station_log_id: stationLogId,
    action_type: action,
    description,
    action_date: new Date().toISOString(),
    related_stage: stage,
  });
}

// ─── Attachment Card ───────────────────────────────────────────────────────────
function AttachmentCard({ att, onRemove, onNoteEdit }) {
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(att.notes || "");
  const [savingNote, setSavingNote] = useState(false);

  const image = isImage(att.mime_type, att.file_name);
  const pdf = isPDF(att.mime_type, att.file_name);

  const handleSaveNote = async () => {
    setSavingNote(true);
    await base44.entities.StationLogOrderAttachments.update(att.id, { notes: note });
    setSavingNote(false);
    setEditingNote(false);
    onNoteEdit();
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
      {/* Preview */}
      <div className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden relative">
        {image ? (
          <img src={att.file_url} alt={att.file_name}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = "none"; }} />
        ) : pdf ? (
          <div className="flex flex-col items-center gap-1 text-red-500">
            <FileText className="h-10 w-10" />
            <span className="text-xs font-semibold">PDF</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <FileText className="h-10 w-10" />
            <span className="text-xs">Document</span>
          </div>
        )}
        {/* Category badge */}
        <div className="absolute top-1.5 left-1.5">
          <span className="text-[10px] bg-white/90 border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-600 shadow-sm">
            {att.attachment_category || "Other"}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-slate-800 truncate" title={att.file_name}>{att.file_name}</p>
        <p className="text-[10px] text-slate-400">{att.file_size || "—"} · {att.uploaded_by || "—"}</p>
        <p className="text-[10px] text-slate-400">{att.uploaded_date ? new Date(att.uploaded_date).toLocaleDateString() : "—"}</p>

        {/* Notes */}
        {editingNote ? (
          <div className="mt-1 space-y-1">
            <textarea
              className="w-full border border-slate-200 rounded px-2 py-1 text-xs h-12 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note..."
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-5 text-[10px] px-2" disabled={savingNote} onClick={handleSaveNote}>
                {savingNote ? "…" : "Save"}
              </Button>
              <Button size="sm" variant="outline" className="h-5 text-[10px] px-2" onClick={() => setEditingNote(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-0.5">
            {att.notes ? (
              <p className="text-[10px] text-slate-500 italic line-clamp-2">{att.notes}</p>
            ) : (
              <button onClick={() => setEditingNote(true)} className="text-[10px] text-blue-400 hover:text-blue-600">
                + Add note
              </button>
            )}
            {att.notes && (
              <button onClick={() => setEditingNote(true)} className="text-[10px] text-slate-400 hover:text-blue-500 ml-1">
                (edit)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-2.5 pb-2.5 flex gap-1.5">
        <a href={att.file_url} target="_blank" rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1 text-[11px] border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 text-slate-600">
          <Eye className="h-3 w-3" /> View
        </a>
        <a href={att.file_url} download={att.file_name}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 text-slate-600">
          <Download className="h-3 w-3" /> Download
        </a>
        <button onClick={() => onRemove(att)}
          className="flex items-center justify-center gap-1 text-[11px] border border-red-200 rounded px-2 py-1 hover:bg-red-50 text-red-500">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Upload Row ─────────────────────────────────────────────────────────────────
function UploadRow({ pendingFile, onCategoryChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
      {isImage(pendingFile.file.type, pendingFile.file.name) ? (
        <Image className="h-4 w-4 text-blue-500 flex-shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
      )}
      <span className="flex-1 truncate font-medium text-slate-700">{pendingFile.file.name}</span>
      <span className="text-slate-400">{formatFileSize(pendingFile.file.size)}</span>
      <select
        className="border border-slate-200 rounded px-1.5 py-1 text-xs bg-white"
        value={pendingFile.category}
        onChange={e => onCategoryChange(e.target.value)}
      >
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <button onClick={onRemove} className="text-slate-400 hover:text-red-500">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────
export default function OrderAttachmentsPanel({ log, activeVersionId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // { file, category }
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");

  const { data: attachments = [] } = useQuery({
    queryKey: ["orderAttachments", log.id],
    queryFn: () => base44.entities.StationLogOrderAttachments.filter({ station_log_id: log.id }),
    select: d => d.filter(a => a.is_active !== false),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["orderAttachments", log.id] });

  // ── Drag & Drop ──
  const onDragOver = useCallback(e => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const addFiles = (files) => {
    const newPending = files.map(f => ({
      file: f,
      category: guessCategory(f),
      id: Math.random().toString(36).slice(2),
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
  };

  const guessCategory = (file) => {
    if (file.type.startsWith("image/")) return "Site Photo";
    if (file.type === "application/pdf") return "PDF Document";
    return "Other";
  };

  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    const me = await base44.auth.me().catch(() => null);
    for (const pf of pendingFiles) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pf.file });
      const fileType = pf.file.type.startsWith("image/") ? "Photo"
        : pf.file.type === "application/pdf" ? "PDF"
        : "Document";
      await base44.entities.StationLogOrderAttachments.create({
        station_log_id: log.id,
        asset_id: log.asset_id,
        version_id: activeVersionId || null,
        related_stage: 1,
        attachment_category: pf.category,
        file_name: pf.file.name,
        file_url,
        file_type: fileType,
        file_size: formatFileSize(pf.file.size),
        mime_type: pf.file.type,
        uploaded_by: me?.email || "",
        uploaded_date: new Date().toISOString(),
        is_active: true,
      });
      await logActivity(log.id, "attachment_uploaded", `Order attachment uploaded: ${pf.file.name}`);
    }
    setPendingFiles([]);
    setUploading(false);
    refresh();
  };

  const handleRemove = async (att) => {
    if (!window.confirm(`Remove "${att.file_name}"? It will be deactivated.`)) return;
    await base44.entities.StationLogOrderAttachments.update(att.id, { is_active: false });
    await logActivity(log.id, "attachment_removed", `Order attachment removed: ${att.file_name}`);
    refresh();
  };

  // ── Filter/search ──
  const filtered = attachments.filter(a => {
    const catMatch = categoryFilter === "All" || a.attachment_category === categoryFilter;
    const searchMatch = !search || a.file_name?.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

  // ── Group by category ──
  const grouped = {};
  filtered.forEach(a => {
    const cat = a.attachment_category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  const usedCategories = [...new Set(attachments.map(a => a.attachment_category || "Other"))];

  return (
    <div className="space-y-4 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-slate-500" />
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Order Attachments / Photos</p>
          {attachments.length > 0 && (
            <Badge className="bg-slate-100 text-slate-600 text-[10px]">{attachments.length}</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
          onClick={() => fileInputRef.current?.click()}>
          <Plus className="h-3 w-3" /> Add Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ""; }}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !pendingFiles.length && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-4 py-5 text-center transition-colors cursor-pointer ${
          dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <Upload className={`h-6 w-6 mx-auto mb-1.5 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
        <p className="text-xs text-slate-500">
          {dragging ? "Drop files here" : "Drag & drop photos or PDFs, or click to browse"}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">Supports images, PDFs, and documents</p>
      </div>

      {/* Pending queue */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">Ready to upload ({pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}):</p>
          {pendingFiles.map(pf => (
            <UploadRow
              key={pf.id}
              pendingFile={pf}
              onCategoryChange={v => setPendingFiles(prev =>
                prev.map(p => p.id === pf.id ? { ...p, category: v } : p)
              )}
              onRemove={() => setPendingFiles(prev => prev.filter(p => p.id !== pf.id))}
            />
          ))}
          <div className="flex gap-2">
            <Button size="sm" disabled={uploading} onClick={handleUploadAll}
              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs">
              <Upload className="h-3 w-3" />
              {uploading ? "Uploading..." : `Upload ${pendingFiles.length} File${pendingFiles.length > 1 ? "s" : ""}`}
            </Button>
            <Button size="sm" variant="outline" className="text-xs"
              onClick={() => setPendingFiles([])}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-32">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input
              className="w-full border border-slate-200 rounded pl-6 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="Search file name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setCategoryFilter("All")}
              className={`text-[11px] px-2 py-1 rounded border ${categoryFilter === "All" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
            >
              All
            </button>
            {usedCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-[11px] px-2 py-1 rounded border ${categoryFilter === cat ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grouped grid */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                {cat}
                <span className="font-normal text-slate-400">({items.length})</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map(att => (
                  <AttachmentCard
                    key={att.id}
                    att={att}
                    onRemove={handleRemove}
                    onNoteEdit={refresh}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : attachments.length === 0 && !pendingFiles.length ? (
        <p className="text-xs text-slate-400 text-center py-3">No attachments yet. Upload photos or documents above.</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No attachments match your filter.</p>
      ) : null}
    </div>
  );
}