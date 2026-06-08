import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import DataTable from "@/components/shared/DataTable";

export default function FMPIContractCatalogueConfig() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [importOptions, setImportOptions] = useState({
    contract_version: 'v1.0-2024',
    effective_date: '2024-01-01',
    expiry_date: '2027-12-31',
    replace_existing: false,
  });
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fmpiCatalogue'],
    queryFn: () => base44.entities.FMPIContractCatalogue.list('-child_line_code', 500),
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

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(i => i.parent_fmpi_code === selectedCategory);

  const columns = [
    { key: 'child_line_code', label: 'Code', render: (item) => (
      <span className="font-mono text-xs font-bold text-indigo-600">{item.child_line_code}</span>
    )},
    { key: 'description', label: 'Description', render: (item) => (
      <div className="max-w-md">
        <p className="text-sm text-slate-800">{item.description}</p>
        <p className="text-xs text-slate-500 mt-0.5">{item.parent_fmpi_code} - {item.parent_description}</p>
      </div>
    )},
    { key: 'unit_of_measure', label: 'Unit', render: (item) => (
      <span className="text-xs text-slate-600">{item.unit_of_measure || '—'}</span>
    )},
    { key: 'default_quantity', label: 'Def. Qty', render: (item) => (
      <span className="text-xs text-slate-600">{item.default_quantity ?? '—'}</span>
    )},
    { key: 'contract_unit_price', label: 'Unit Price (€)', render: (item) => (
      <span className="text-xs font-semibold text-slate-700">€{(item.contract_unit_price ?? 0).toFixed(2)}</span>
    )},
    { key: 'item_category', label: 'Category', render: (item) => (
      <Badge variant="outline" className="text-xs">
        {item.item_category || 'Contractual'}
      </Badge>
    )},
    { key: 'is_active', label: 'Status', render: (item) => (
      <Badge className={item.is_active ? "bg-emerald-100 text-emerald-700 text-xs gap-1" : "bg-slate-100 text-slate-600 text-xs gap-1"}>
        {item.is_active ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
      </Badge>
    )},
  ];

  const getActions = (item) => [
    {
      label: item.is_active ? 'Deactivate' : 'Activate',
      onClick: () => toggleMutation.mutate({ id: item.id, is_active: !item.is_active }),
      variant: item.is_active ? 'outline' : 'default',
      size: 'sm',
    },
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: '58', label: '58 - Civil Works (Footway)' },
    { value: '59', label: '59 - Refurbishment (Factory)' },
    { value: '60', label: '60 - Refurbishment (Site)' },
    { value: '61', label: '61 - Civil Works (Existing)' },
    { value: '62', label: '62 - Decommissioning' },
  ];

  return (
    <div className="space-y-4">
      {/* Import Panel */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-bold text-indigo-900">Import from Excel</h3>
            <p className="text-xs text-indigo-600 mt-0.5">Upload Services Excel to populate FMPI Contract Catalogue</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-700 shrink-0">
            <span className="bg-white rounded px-2 py-1 border border-indigo-200 font-semibold">{totalItems} total</span>
            <span className="bg-emerald-50 rounded px-2 py-1 border border-emerald-200 text-emerald-700 font-semibold">{activeItems} active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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
              <span className="text-xs font-semibold text-indigo-800">Replace all</span>
            </label>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm"
        >
          {importMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Upload & Import</>}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Filter:</span>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
              className={`text-xs ${selectedCategory === cat.value ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          actions={getActions}
          emptyMessage="No catalogue items found. Import the Services Excel file to populate."
        />
      )}
    </div>
  );
}