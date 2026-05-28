import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, X, Loader2 } from "lucide-react";

export default function PhotoUpload({ photos = [], onChange, label = "Φωτογραφίες", maxPhotos = 5 }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = React.useState(false);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const urls = [...photos];
    for (const file of Array.from(files)) {
      if (urls.length >= maxPhotos) break;
      const res = await base44.integrations.Core.UploadFile({ file });
      if (res?.file_url) urls.push(res.file_url);
    }
    onChange(urls);
    setUploading(false);
  };

  const remove = (idx) => {
    const updated = photos.filter((_, i) => i !== idx);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-slate-700">{label}</span>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
              <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {photos.length < maxPhotos && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm text-slate-500 bg-white active:bg-slate-50 transition-all"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Μεταφόρτωση...</>
          ) : (
            <><Camera className="w-4 h-4" /> Τράβηξε φωτογραφία ή επέλεξε αρχείο</>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}