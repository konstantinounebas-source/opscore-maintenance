import React from "react";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";

export default function Stage2AttachmentPreview({ attachment, onClose }) {
  const isImage = attachment.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.file_name || "");
  const isPDF = attachment.mime_type === "application/pdf" || /\.pdf$/i.test(attachment.file_name || "");

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{attachment.file_name}</p>
          <div className="flex gap-2 shrink-0">
            <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </Button>
            </a>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100">
          {isImage && (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="max-w-full max-h-full object-contain rounded-lg shadow"
            />
          )}
          {isPDF && (
            <iframe
              src={attachment.file_url}
              title={attachment.file_name}
              className="w-full h-[70vh] rounded-lg border border-slate-200"
            />
          )}
          {!isImage && !isPDF && (
            <div className="text-center">
              <p className="text-slate-500 mb-3">Preview not available for this file type.</p>
              <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1">
                  <ExternalLink className="h-4 w-4" /> Open in new tab
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}