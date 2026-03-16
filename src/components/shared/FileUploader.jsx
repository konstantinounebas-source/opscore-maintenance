import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

export default function FileUploader({ onUpload, label = "Upload File" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpload({ file_url, file_name: file.name, file_size: `${(file.size / 1024).toFixed(1)} KB`, file_type: file.type.startsWith("image/") ? "Photo" : "Document" });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        {label}
      </Button>
    </div>
  );
}