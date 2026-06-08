import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, XCircle, Search, Filter, Trash2 } from "lucide-react";

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

  const removeDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('removeDuplicateFMPIRecords', {});
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fmpiCatalogue'] });
      alert(`✅ ${data.message}\nUnique codes: ${data.uniqueCodes}`);
    },
    onError: (err) => {
      alert(`❌ Failed to remove duplicates: ${err.message}`);
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
    { key: 'child_line_code', label: 'FMPI Code', render: (item) => (
      <div className="flex flex-col">
        <span className="font-mono text-xs font-bold text-indigo-700">{item.child_line_code}</span>
        <span className="text-xs text-slate-400">{item.parent_fmpi_code}</span>
      </div>
    )},
    { key: 'description', label: 'Service Description', render: (item) => (
      <div className="max-w-lg">
        <p className="text-sm font-medium text-slate-800">{item.description}</p>
        <p className="text-xs text-slate-500 mt-0.5">{item.parent_description}</p>
        {item.notes && <p className="text-xs text-slate-400 italic mt-1">{item.notes}</p>}
      </div>
    )},
    { key: 'unit_of_measure', label: 'Unit', render: (item) => (
      <Badge variant="outline" className="text-xs font-mono">{item.unit_of_measure || '—'}</Badge>
    )},
    { key: 'contract_unit_price', label: 'Contract Unit Price', render: (item) => (
      <span className="text-xs font-bold text-slate-700">€{(item.contract_unit_price ?? 0).toFixed(2)}</span>
    )},
    { key: 'item_category', label: 'Type', render: (item) => (
      <Badge className={item.item_category === 'Contractual' ? "bg-indigo-100 text-indigo-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
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
      variant: item.is_active ? 'outline' : 'secondary',
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
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900">Import FMPI Contract Catalogue</h3>
              <p className="text-xs text-indigo-600 mt-0.5">Upload the Services Excel file to populate or update catalogue items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white text-indigo-700 border border-indigo-200 text-xs font-semibold">{totalItems} items</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold">{activeItems} active</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-indigo-700 mb-1.5 block">Contract Version</label>
            <Input
              value={importOptions.contract_version}
              onChange={e => setImportOptions(o => ({ ...o, contract_version: e.target.value }))}
              className="h-8 text-xs"
              placeholder="v1.0-2024"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-indigo-700 mb-1.5 block">Effective Date</label>
            <Input type="date" value={importOptions.effective_date}
              onChange={e => setImportOptions(o => ({ ...o, effective_date: e.target.value }))}
              className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-indigo-700 mb-1.5 block">Expiry Date</label>
            <Input type="date" value={importOptions.expiry_date}
              onChange={e => setImportOptions(o => ({ ...o, expiry_date: e.target.value }))}
              className="h-8 text-xs" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" checked={importOptions.replace_existing}
                onChange={e => setImportOptions(o => ({ ...o, replace_existing: e.target.checked }))}
                className="rounded border-slate-300" />
              <span className="font-semibold text-indigo-800">⚠️ Replace all existing records</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2 text-sm shadow-sm"
          >
            {importMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Select Excel File & Import</>}
          </Button>
          <Button
            onClick={() => {
              if (confirm('Remove duplicate FMPI catalogue records based on child_line_code? This will keep the most recently updated record.')) {
                removeDuplicatesMutation.mutate();
              }
            }}
            disabled={removeDuplicatesMutation.isPending}
            variant="outline"
            className="gap-2 text-sm border-red-200 text-red-700 hover:bg-red-50"
          >
            {removeDuplicatesMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing...</> : <><Trash2 className="w-4 h-4" /> Remove Duplicates</>}
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Filter by category:</span>
        </div>
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

      {/* Clean Table Layout */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue...
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600" style={{ minWidth: 300 }}>Description</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Unit</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Def. Qty</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Unit Price</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-indigo-600">{item.child_line_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-800">{item.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.parent_fmpi_code} - {item.parent_description}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-600">{item.unit_of_measure || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-600">{item.default_quantity ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-slate-700">€{(item.contract_unit_price ?? 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs">{item.item_category || 'Contractual'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={item.is_active ? "bg-emerald-100 text-emerald-700 text-xs gap-1" : "bg-slate-100 text-slate-600 text-xs gap-1"}>
                        {item.is_active ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getActions(item).map((action, idx) => (
                        <Button
                          key={idx}
                          variant={action.variant}
                          size={action.size}
                          onClick={action.onClick}
                          className="text-xs h-7"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              No catalogue items found. Import the Services Excel file to populate.
            </div>
          )}
        </div>
      )}
    </div>
  );
}