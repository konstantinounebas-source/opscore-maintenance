import React from "react";
import { format } from "date-fns";
import { FileText, ImageIcon, Eye, Download, Paperclip } from "lucide-react";

function DocItem({ url, name, uploadedBy, date }) {
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name || url);
  const displayName = name || url?.split("/").pop() || "Attachment";
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
        {isImage
          ? <ImageIcon className="h-4 w-4 text-indigo-500" />
          : <FileText className="h-4 w-4 text-indigo-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
        <p className="text-xs text-slate-400">
          {uploadedBy && <span>{uploadedBy}</span>}
          {date && <span> · {format(new Date(date), "MMM d, yyyy HH:mm")}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer" title="View"
          className="p-1.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Eye className="h-4 w-4" />
        </a>
        <a href={url} download={name} title="Download"
          className="p-1.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors">
          <Download className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function IncidentDocuments({ attachments = [], auditTrail = [] }) {
  // Collect all docs: from IncidentAttachments (initial uploads only) + from audit trail attachment_metadata + legacy attachments
  const allDocs = [];

  // Direct attachments (all)
  attachments.forEach(a => {
    allDocs.push({ url: a.file_url, name: a.file_name, uploadedBy: a.uploaded_by, date: a.created_date, source: "Attachment" });
  });

  // Audit trail attachment_metadata
  auditTrail.forEach(entry => {
    (entry.attachment_metadata || []).forEach(meta => {
      allDocs.push({ url: meta.url, name: meta.name, uploadedBy: meta.author_name || meta.author, date: meta.created_at, source: entry.action });
    });
    // Legacy audit attachments
    (entry.attachments || []).forEach((url, i) => {
      const name = entry.attachment_names?.[i];
      // Avoid duplicates (if already in metadata)
      const alreadyAdded = allDocs.some(d => d.url === url);
      if (!alreadyAdded) {
        allDocs.push({ url, name, uploadedBy: entry.user, date: entry.created_date, source: entry.action });
      }
    });
  });

  // Sort newest first
  allDocs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (allDocs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents attached yet.</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
      {allDocs.map((doc, i) => (
        <DocItem key={i} url={doc.url} name={doc.name} uploadedBy={doc.uploadedBy} date={doc.date} />
      ))}
    </div>
  );
}