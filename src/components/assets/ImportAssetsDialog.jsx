import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export default function ImportAssetsDialog({ open, onOpenChange, onImport }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const downloadTemplate = () => {
    const headers = ["asset_id", "asset_name", "active_shelter_id", "location_address", "city", "shelter_type", "status", "installation_date", "delivery_date", "delivery_year"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    await onImport(selectedFile);
    setImporting(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Assets from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={downloadTemplate}
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </Button>

          <div className="space-y-2">
            <label className="text-sm font-medium">Upload Excel File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
            {selectedFile && (
              <p className="text-xs text-indigo-600 font-medium">Selected: {selectedFile.name}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleImport}
              disabled={!selectedFile || importing}
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}