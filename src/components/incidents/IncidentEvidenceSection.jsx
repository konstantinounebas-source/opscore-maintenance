import React, { useState } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, FileText, Paperclip, Film, FileSpreadsheet, FileCode, Download, X, ChevronRight, Calendar, User } from "lucide-react";
import { base44 } from "@/api/base44Client";

const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;
const VIDEO_EXTS = /\.(mp4|mov|avi|webm)$/i;
const SHEET_EXTS = /\.(xlsx|xls|csv)$/i;
const CODE_EXTS = /\.(pdf|xml|json|html)$/i;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt={name}
        className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
      {name && (
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <span className="inline-block px-4 py-2 bg-black/60 text-white/90 text-sm rounded-lg backdrop-blur-sm">
            {name}
          </span>
        </div>
      )}
    </div>
  );
}

function PhotoCard({ doc, onClick }) {
  const [errored, setErrored] = useState(false);
  
  return (
    <button
      onClick={() => onClick(doc)}
      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 aspect-square w-full"
      title={doc.name}
    >
      {errored ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 p-3 bg-slate-50">
          <ImageIcon className="w-8 h-8" />
          <span className="text-[10px] text-center line-clamp-2">{doc.name}</span>
        </div>
      ) : (
        <>
          <img
            src={doc.url}
            alt={doc.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setErrored(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-[10px] text-white/90 line-clamp-2 font-medium">{doc.name}</p>
          </div>
        </>
      )}
    </button>
  );
}

function DocRow({ doc }) {
  const displayName = doc.name || doc.url?.split("/").pop() || "Attachment";
  const [loading, setLoading] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      if (!doc.url.startsWith("http")) {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.url });
        const a = document.createElement("a");
        a.href = signed_url;
        a.download = displayName;
        a.target = "_blank";
        a.click();
      } else {
        const a = document.createElement("a");
        a.href = doc.url;
        a.download = displayName;
        a.target = "_blank";
        a.click();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200 transition-all duration-200 group">
      <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
        {getFileIcon(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.date && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {format(new Date(doc.date), "dd/MM/yyyy HH:mm")}
            </span>
          )}
          {doc.uploadedBy && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-2.5 h-2.5" />
              {doc.uploadedBy}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="p-2 rounded-lg hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors shrink-0 disabled:opacity-50"
        title="Download"
      >
        {loading ? <span className="w-4 h-4 block border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
    </div>
  );
}

const PHOTO_GRID_LIMIT = 8;
const DOC_LIST_LIMIT = 6;

export default function IncidentEvidenceSection({ attachments = [], auditTrail = [], evidenceFiles = [], formSubmissions = [] }) {
  const [lightbox, setLightbox] = useState(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllDocs, setShowAllDocs] = useState(false);

  // Collect all unique files
  const seen = new Set();
  const allFiles = [];

  // Include evidence_files from incident creation
  evidenceFiles.forEach(url => {
    if (url && !url.startsWith('data:') && !seen.has(url)) {
      seen.add(url);
      const name = url.split("/").pop() || "attachment";
      allFiles.push({ url, name, date: null, uploadedBy: null });
    }
  });

  // Direct attachments
  attachments.forEach(a => {
    if (a.file_url && !a.file_url.startsWith('data:') && !seen.has(a.file_url)) {
      seen.add(a.file_url);
      allFiles.push({ url: a.file_url, name: a.file_name, uploadedBy: a.uploaded_by, date: a.created_date });
    }
  });

  // Audit trail metadata
  auditTrail.forEach(entry => {
    (entry.attachment_metadata || []).forEach(meta => {
      if (meta.url && !meta.url.startsWith('data:') && !seen.has(meta.url)) {
        seen.add(meta.url);
        allFiles.push({ url: meta.url, name: meta.name, uploadedBy: meta.author_name || meta.author, date: meta.created_at });
      }
    });
    (entry.attachments || []).forEach((url, i) => {
      if (url && !url.startsWith('data:') && !seen.has(url)) {
        seen.add(url);
        allFiles.push({ url, name: entry.attachment_names?.[i], uploadedBy: entry.user, date: entry.created_date });
      }
    });
  });

  // Photos from submitted forms
  formSubmissions.forEach(sub => {
    if (sub.status === "Submitted" || sub.status === "Approved") {
      const photos = sub.form_data?.photo_urls || sub.form_data?.photos || [];
      photos.forEach((url, i) => {
        if (!seen.has(url)) {
          seen.add(url);
          allFiles.push({ 
            url, 
            name: `${sub.form_name || sub.form_type} - Photo ${i + 1}`, 
            uploadedBy: sub.submitted_by, 
            date: sub.submitted_at || sub.created_date 
          });
        }
      });
    }
  });

  // Sort newest first
  allFiles.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Separate by type
  const photos = allFiles.filter(d => IMAGE_EXTS.test(d.name || d.url || ""));
  const videos = allFiles.filter(d => VIDEO_EXTS.test(d.name || d.url || ""));
  const documents = allFiles.filter(d => !IMAGE_EXTS.test(d.name || d.url || "") && !VIDEO_EXTS.test(d.name || d.url || ""));

  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_GRID_LIMIT);
  const visibleDocs = showAllDocs ? documents : documents.slice(0, DOC_LIST_LIMIT);

  const totalItems = photos.length + videos.length + documents.length;

  if (totalItems === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="w-4 h-4 text-slate-400" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Incident Evidence</p>
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">0</span>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <div className="text-center">
            <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No attachments available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      {/* Header with counts */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-indigo-500" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Incident Evidence</p>
          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">{totalItems}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          {photos.length > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> {photos.length}
            </span>
          )}
          {videos.length > 0 && (
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3" /> {videos.length}
            </span>
          )}
          {documents.length > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> {documents.length}
            </span>
          )}
        </div>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <div className="p-1 rounded bg-indigo-50">
                <ImageIcon className="w-3 h-3 text-indigo-600" />
              </div>
              Photos ({photos.length})
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {visiblePhotos.map((doc, i) => (
              <PhotoCard key={i} doc={doc} onClick={setLightbox} />
            ))}
          </div>
          {photos.length > PHOTO_GRID_LIMIT && (
            <button
              onClick={() => setShowAllPhotos(v => !v)}
              className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllPhotos ? 'rotate-90' : ''}`} />
              {showAllPhotos ? "Show less" : `View all ${photos.length} photos`}
            </button>
          )}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <div className="p-1 rounded bg-purple-50">
                <Film className="w-3 h-3 text-purple-600" />
              </div>
              Videos ({videos.length})
            </p>
          </div>
          <div className="space-y-2">
            {videos.map((doc, i) => (
              <DocRow key={i} doc={doc} />
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
              <div className="p-1 rounded bg-emerald-50">
                <FileText className="w-3 h-3 text-emerald-600" />
              </div>
              Documents ({documents.length})
            </p>
          </div>
          <div className="space-y-2">
            {visibleDocs.map((doc, i) => (
              <DocRow key={i} doc={doc} />
            ))}
          </div>
          {documents.length > DOC_LIST_LIMIT && (
            <button
              onClick={() => setShowAllDocs(v => !v)}
              className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllDocs ? 'rotate-90' : ''}`} />
              {showAllDocs ? "Show less" : `View all ${documents.length} documents`}
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