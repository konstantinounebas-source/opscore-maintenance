import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

export default function FileUploader({ onUpload, label = "Upload File" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onUpload({ file_url, file_name: file.name, file_size: `${(file.size / 1024).toFixed(1)} KB`, file_type: file.type.startsWith("image/") ? "Photo" : "Document" });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFile = (e) => {
    handleFiles(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
        dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}
    >
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} multiple />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 font-medium">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
        </div>
      ) : dragOver ? (
        <p className="text-xs text-indigo-600 font-medium">Drop files here...</p>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Upload className="w-4 h-4 text-slate-400" />
          <span>{label} — drag & drop or click</span>
        </div>
      )}
    </div>
  );
}