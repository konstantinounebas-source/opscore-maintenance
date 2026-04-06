import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ImportDataDialog({ isOpen, onClose, onImportComplete }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Clear existing data first
      const clearRes = await base44.functions.invoke('clearChildData', {});
      if (!clearRes.data.success) {
        throw new Error('Failed to clear existing data');
      }

      // Upload file to get URL
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      
      // Call import function
      const importRes = await base44.functions.invoke('importChildCatalogAndTemplates', {
        file_url: uploadRes.file_url
      });

      if (importRes.data.success) {
        setResult({
          ...importRes.data,
          templatesCleared: clearRes.data.templatesDeleted,
          catalogsCleared: clearRes.data.catalogsDeleted
        });
        onImportComplete?.();
      } else {
        setError(importRes.data.error || 'Import failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during import');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Configuration Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result && !error && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={loading}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <Button
                  variant="outline"
                  disabled={loading}
                  className="w-full"
                  asChild
                >
                  <span>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Select Excel File
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-slate-500 mt-3">
                Upload the cleaned Excel file with Child_Catalog and Type_Templates sheets
              </p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-green-800">Import Successful</h3>
              </div>
              <div className="space-y-2 text-sm text-green-700">
                {result.catalogsCleared > 0 && <p>✓ Cleared {result.catalogsCleared} old catalog records</p>}
                {result.templatesCleared > 0 && <p>✓ Cleared {result.templatesCleared} old template records</p>}
                <p>✓ {result.childCatalogCount} new Child Catalog records imported</p>
                <p>✓ {result.typeTemplatesCount} new Type Templates records imported</p>
              </div>
              <Button onClick={onClose} className="w-full mt-4">
                Close
              </Button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <h3 className="font-semibold text-red-800">Import Failed</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}