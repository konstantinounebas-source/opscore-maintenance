import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ExportAssetsDialog({ open, onOpenChange, assets }) {
  const handleExportTable = () => {
    const headers = ["asset_id", "asset_name", "status", "ordered_shelter_type", "location_address", "city", "municipality", "latitude", "longitude", "installation_date", "delivery_date", "notes"];
    const rows = assets.map(a => [
      a.asset_id || "",
      a.asset_name || "", a.status || "",
      a.ordered_shelter_type || "",
      a.location_address || "", a.city || "", a.municipality || "",
      a.latitude || "", a.longitude || "",
      a.installation_date || "", a.delivery_date || "", a.notes || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    downloadCSV(csv, "assets_export.csv");
    onOpenChange(false);
  };

  const handleExportFull = () => {
    const rows = assets.map(a => {
      const obj = { ...a };
      delete obj.id;
      delete obj.created_date;
      delete obj.updated_date;
      delete obj.created_by;
      return obj;
    });
    const csv = convertToCSV(rows);
    downloadCSV(csv, "assets_full_export.csv");
    onOpenChange(false);
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(h => {
      const val = obj[h];
      if (val === null || val === undefined) return "";
      if (Array.isArray(val)) return `"${val.join("; ")}"`;
      if (typeof val === "object") return `"${JSON.stringify(val)}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(","));
    return [headers.join(","), ...rows].join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Assets</DialogTitle>
          <DialogDescription>
            Choose what to export: table columns only or all asset fields
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            onClick={handleExportTable}
            className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            <Download className="w-4 h-4" />
            Table Columns ({assets.length} assets)
          </Button>
          <Button
            onClick={handleExportFull}
            variant="outline"
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            All Fields ({assets.length} assets)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}