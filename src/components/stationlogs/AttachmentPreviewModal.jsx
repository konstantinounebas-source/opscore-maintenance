import React, { useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttachmentPreviewModal({ attachment, onClose }) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const isImage = attachment.file_type === "photo" || attachment.file_name?.match(/\.(jpg|jpeg|png|gif)$/i);
  const isPDF = attachment.file_name?.match(/\.pdf$/i);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="font-semibold text-slate-800 truncate text-sm">{attachment.file_name}</p>
          <div className="flex items-center gap-2">
            {(isImage || isPDF) && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomOut}
                  className="h-8 w-8 p-0"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-slate-500 font-medium w-10 text-center">{zoom}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleZoomIn}
                  className="h-8 w-8 p-0"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {isImage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRotate}
                    className="h-8 w-8 p-0"
                    title="Rotate"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            <a
              href={attachment.file_url}
              download
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-100">
          {isImage ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              style={{
                width: `${zoom}%`,
                height: "auto",
                transform: `rotate(${rotation}deg)`,
                transition: "transform 0.2s ease",
              }}
              className="object-contain"
            />
          ) : isPDF ? (
            <iframe
              src={`${attachment.file_url}#zoom=${zoom}`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              title={attachment.file_name}
            />
          ) : (
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="h-16 w-16 rounded-lg bg-slate-200 flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Click to open</p>
                <p className="text-xs text-slate-500 mt-1">{attachment.file_name}</p>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}