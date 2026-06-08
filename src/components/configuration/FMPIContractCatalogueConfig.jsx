import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

const PARENT_CATEGORIES = [
  { code: "58", label: "Civil Works for Extended Footway Repair or Construction" },
  { code: "59", label: "Refurbishment of existing shelters in factory" },
  { code: "60", label: "Refurbishment of existing shelters on site" },
  { code: "61", label: "Civil Works for Existing Bus Shelters" },
  { code: "62", label: "Decommissioning of existing shelters" },
];

function CategorySection({ category, items, onToggle }) {
  const [open, setOpen] = useState(false);
  const catItems = items.filter(i => i.parent_fmpi_code === category.code)
    .sort((a, b) => Number(a.child_line_number || 0) - Number(b.child_line_number || 0));

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
        <span className="font-bold text-slate-800 text-sm">{category.code}</span>
        <span className="text-sm text-slate-600 flex-1">{category.label}</span>
        <Badge variant="outline" className="text-xs">{catItems.length} items</Badge>
        <Badge className={catItems.length > 0 ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
          {catItems.length > 0 ? "Loaded" : "Empty"}
        </Badge>
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {catItems.length === 0 && (
            <div className="px-4 py-4 text-sm text-slate-400 text-center">No items imported yet. Use the import button above.</div>
          )}
          {catItems.map(item => (
            <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${!item.is_active ? 'opacity-50 bg-slate-50' : 'bg-white'}`}>
              <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-0.5 shrink-0">{item.child_line_code}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800">{item.description}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-slate-500">UoM: <strong>{item.unit_of_measure || '—'}</strong></span>
                  <span className="text-xs text-slate-500">Def. Qty: <strong>{item.default_quantity ?? '—'}</strong></span>
                  <span className="text-xs text-slate-500">Unit Price: <strong>€{item.contract_unit_price ?? '—'}</strong></span>
                  <span className="text-xs text-slate-500">Version: <strong>{item.contract_version || '—'}</strong></span>
                  {item.item_category === 'Specify Required' && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs gap-1"><AlertTriangle className="w-3 h-3" /> Specify Required</Badge>
                  )}
                  {item.requires_approval && (
                    <Badge className="bg-red-50 text-red-600 text-xs">Requires Approval</Badge>
                  )}
                </div>
              </div>
              <button onClick={() => onToggle(item)} className="shrink-0 mt-0.5 text-slate-400 hover:text-slate-700">
                {item.is_active
                  ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                  : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FMPIContractCatalogueConfig() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [importOptions, setImportOptions] = useState({
    contract_version: 'v1.0-2024',
    effective_date: '2024-01-01',
    expiry_date: '2027-12-31',
    replace_existing: false,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fmpiCatalogue'],
    queryFn: () => base44.entities.FMPIContractCatalogue.list('-created_date', 500),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.FMPIContractCatalogue.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fmpiCatalogue'] }),
  });

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadResult.file_url || uploadResult.url;
      const response = await base44.functions.invoke('importFMPIContractCatalogue', {
        file_url,
        ...importOptions,
      });
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fmpiCatalogue'] });
      queryClient.invalidateQueries({ queryKey: ['fmpiExtraChargeTypes'] });
      alert(`✅ ${data.message}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      alert(`❌ Import failed: ${err.message}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const confirmMsg = importOptions.replace_existing
      ? 'This will DELETE all existing FMPI Contract Catalogue records and reimport. Continue?'
      : 'This will ADD new items to the FMPI Contract Catalogue. Continue?';
    if (confirm(confirmMsg)) importMutation.mutate(file);
  };

  const totalItems = items.length;
  const activeItems = items.filter(i => i.is_active).length;

  return (
    <div className="space-y-5">
      {/* Import Panel */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-indigo-900">Import from Excel</h3>
            <p className="text-xs text-indigo-600 mt-0.5">Upload the Services Excel file to populate the FMPI Contract Catalogue. Parent categories 58–62 will be detected automatically.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-700 shrink-0">
            <span className="bg-white rounded px-2 py-1 border border-indigo-200">{totalItems} items</span>
            <span className="bg-white rounded px-2 py-1 border border-indigo-200">{activeItems} active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-indigo-800 mb-1 block">Contract Version</label>
            <Input
              value={importOptions.contract_version}
              onChange={e => setImportOptions(o => ({ ...o, contract_version: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-indigo-800 mb-1 block">Effective Date</label>
            <Input type="date" value={importOptions.effective_date}
              onChange={e => setImportOptions(o => ({ ...o, effective_date: e.target.value }))}
              className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-indigo-800 mb-1 block">Expiry Date</label>
            <Input type="date" value={importOptions.expiry_date}
              onChange={e => setImportOptions(o => ({ ...o, expiry_date: e.target.value }))}
              className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={importOptions.replace_existing}
                onChange={e => setImportOptions(o => ({ ...o, replace_existing: e.target.checked }))}
                className="rounded" />
              <span className="text-xs font-semibold text-indigo-800">Replace existing</span>
            </label>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm"
        >
          {importMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Upload & Import Services Excel</>}
        </Button>
      </div>

      {/* Catalogue Tree */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue...
        </div>
      ) : (
        <div className="space-y-3">
          {PARENT_CATEGORIES.map(cat => (
            <CategorySection
              key={cat.code}
              category={cat}
              items={items}
              onToggle={(item) => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })}
            />
          ))}
        </div>
      )}
    </div>
  );
}