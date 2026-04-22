import React, { useState } from "react";
import { format } from "date-fns";
import { FileText, Image as ImageIcon, Download, X, ChevronRight, Paperclip, Film, FileSpreadsheet, FileCode } from "lucide-react";

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;
const VIDEO_EXTS = /\.(mp4|mov|avi|webm)$/i;
const SHEET_EXTS = /\.(xlsx|xls|csv)$/i;
const CODE_EXTS  = /\.(pdf|xml|json|html)$/i;

function getFileIcon(name = "") {
  if (IMAGE_EXTS.test(name)) return <ImageIcon className="h-4 w-4 text-indigo-500" />;
  if (VIDEO_EXTS.test(name)) return <Film className="h-4 w-4 text-purple-500" />;
  if (SHEET_EXTS.test(name)) return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
  if (CODE_EXTS.test(name)) return <FileCode className="h-4 w-4 text-amber-500" />;
  return <FileText className="h-4 w-4 text-slate-400" />;
}

function ImageLightbox({ url, name, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white hover:text-slate-300 bg-black/40 rounded-full p-1.5"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={url}
        alt={name}
        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
      <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm">{name}</p>
    </div>
  );
}

function ImageThumb({ doc, onClick }) {
  const [errored, setErrored] = useState(false);
  return (
    <button
      onClick={() => onClick(doc)}
      className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square w-full hover:border-indigo-400 transition-all"
      title={doc.name}
    >
      {errored ? (
        <div className="flex flex-col items-center justify-center h-full gap-1 text-slate-400 p-2">
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px] truncate w-full text-center">{doc.name}</span>
        </div>
      ) : (
        <img
          src={doc.url}
          alt={doc.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </button>
  );
}

function DocCard({ doc }) {
  const displayName = doc.name || doc.url?.split("/").pop() || "Attachment";
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="h-8 w-8 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
        {getFileIcon(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate block"
          title={displayName}
        >
          {displayName}
        </a>
        {doc.date && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            {format(new Date(doc.date), "dd/MM/yyyy HH:mm")}
            {doc.uploadedBy && ` · ${doc.uploadedBy}`}
          </p>
        )}
      </div>
      <a
        href={doc.url}
        download={doc.name}
        className="p-1.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
        title="Download"
        onClick={e => e.stopPropagation()}
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

const IMAGE_PREVIEW_LIMIT = 6;
const DOC_PREVIEW_LIMIT = 5;

export default function IncidentAttachmentsPreview({ attachments = [], auditTrail = [] }) {
  const [lightbox, setLightbox] = useState(null);
  const [showAllImages, setShowAllImages] = useState(false);
  const [showAllDocs, setShowAllDocs] = useState(false);

  // Collect all unique files (same logic as IncidentDocuments)
  const seen = new Set();
  const allDocs = [];

  attachments.forEach(a => {
    if (!seen.has(a.file_url)) {
      seen.add(a.file_url);
      allDocs.push({ url: a.file_url, name: a.file_name, uploadedBy: a.uploaded_by, date: a.created_date });
    }
  });

  auditTrail.forEach(entry => {
    (entry.attachment_metadata || []).forEach(meta => {
      if (!seen.has(meta.url)) {
        seen.add(meta.url);
        allDocs.push({ url: meta.url, name: meta.name, uploadedBy: meta.author_name || meta.author, date: meta.created_at });
      }
    });
    (entry.attachments || []).forEach((url, i) => {
      if (!seen.has(url)) {
        seen.add(url);
        allDocs.push({ url, name: entry.attachment_names?.[i], uploadedBy: entry.user, date: entry.created_date });
      }
    });
  });

  // Sort newest first
  allDocs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const images = allDocs.filter(d => IMAGE_EXTS.test(d.name || d.url || ""));
  const docs   = allDocs.filter(d => !IMAGE_EXTS.test(d.name || d.url || ""));

  const visibleImages = showAllImages ? images : images.slice(0, IMAGE_PREVIEW_LIMIT);
  const visibleDocs   = showAllDocs   ? docs   : docs.slice(0, DOC_PREVIEW_LIMIT);

  if (allDocs.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Incident Evidence</p>
        <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
          <Paperclip className="w-4 h-4" />
          <span>No attachments available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
          Incident Evidence
          <span className="ml-2 text-indigo-500 font-bold">{allDocs.length}</span>
        </p>
      </div>

      {/* Images grid */}
      {images.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Images ({images.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {visibleImages.map((doc, i) => (
              <ImageThumb key={i} doc={doc} onClick={setLightbox} />
            ))}
          </div>
          {images.length > IMAGE_PREVIEW_LIMIT && (
            <button
              onClick={() => setShowAllImages(v => !v)}
              className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              {showAllImages ? "Show less" : `View all ${images.length} images`}
            </button>
          )}
        </div>
      )}

      {/* Documents list */}
      {docs.length > 0 && (
        <div>
          {images.length > 0 && (
            <p className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Documents ({docs.length})
            </p>
          )}
          <div className="space-y-1.5">
            {visibleDocs.map((doc, i) => (
              <DocCard key={i} doc={doc} />
            ))}
          </div>
          {docs.length > DOC_PREVIEW_LIMIT && (
            <button
              onClick={() => setShowAllDocs(v => !v)}
              className="mt-2 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              {showAllDocs ? "Show less" : `View all ${docs.length} documents`}
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}