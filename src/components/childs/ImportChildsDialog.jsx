import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ImportChildsDialog({ open, onOpenChange, onImport }) {
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const headers = ["child_id", "parent_asset_id", "category", "serial_number", "installation_date", "child_type"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "childs_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Child Assets from Excel</DialogTitle>
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
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}