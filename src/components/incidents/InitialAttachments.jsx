import React, { useState } from "react";
import { Download, Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InitialAttachments({ attachments = [] }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const isImage = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  };

  const handleDownload = async (attachment) => {
    setDownloading(attachment.id);
    try {
      const response = await fetch(attachment.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(null);
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-5 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-700 mb-3">Initial Attachments ({attachments.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {attachments.map((attachment) => {
          const image = isImage(attachment.file_name);
          return (
            <div key={attachment.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{attachment.file_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{attachment.file_type || "File"}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {image && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setPreviewUrl(attachment.file_url)}
                    title="View"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={downloading === attachment.id}
                  onClick={() => handleDownload(attachment)}
                  title="Download"
                >
                  {downloading === attachment.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                  ) : (
                    <Download className="w-4 h-4 text-slate-600" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-lg p-2 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}