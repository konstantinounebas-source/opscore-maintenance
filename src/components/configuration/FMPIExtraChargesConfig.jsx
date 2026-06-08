import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Check, X, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

const EMPTY_FORM = { extra_charge_code: '', display_name: '', description: '', default_unit: '', default_rate: '', requires_justification: true, requires_approval: true, is_active: true, sort_order: 0 };

export default function FMPIExtraChargesConfig() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fmpiExtraChargeTypes'],
    queryFn: () => base44.entities.FMPIExtraChargeTypes.list('sort_order', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FMPIExtraChargeTypes.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fmpiExtraChargeTypes'] }); setShowAdd(false); setAddForm(EMPTY_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FMPIExtraChargeTypes.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fmpiExtraChargeTypes'] }); setEditingId(null); },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('importFMPIContractCatalogue', {
        file_url: null,
        seed_extra_charges_only: true,
      });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fmpiExtraChargeTypes'] }),
  });

  const set = (form, setForm, key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const ef = (k, v) => set(editForm, setEditForm, k, v);
  const af = (k, v) => set(addForm, setAddForm, k, v);

  const BoolToggle = ({ val, onChange }) => (
    <button type="button" onClick={() => onChange(!val)} className={`px-2 py-1 rounded text-xs font-semibold border ${val ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
      {val ? 'Yes' : 'No'}
    </button>
  );

  const RowForm = ({ form, onChange, onSave, onCancel, saveLabel = 'Save' }) => (
    <tr className="bg-indigo-50">
      <td className="px-3 py-2"><Input value={form.extra_charge_code} onChange={e => onChange('extra_charge_code', e.target.value)} placeholder="EC-007" className="h-7 text-xs w-24" /></td>
      <td className="px-3 py-2"><Input value={form.display_name} onChange={e => onChange('display_name', e.target.value)} placeholder="Display name" className="h-7 text-xs" /></td>
      <td className="px-3 py-2"><Input value={form.description} onChange={e => onChange('description', e.target.value)} placeholder="Description" className="h-7 text-xs" /></td>
      <td className="px-3 py-2"><Input value={form.default_unit} onChange={e => onChange('default_unit', e.target.value)} placeholder="hour" className="h-7 text-xs w-20" /></td>
      <td className="px-3 py-2"><Input value={form.default_rate} onChange={e => onChange('default_rate', e.target.value)} placeholder="—" className="h-7 text-xs w-20" /></td>
      <td className="px-3 py-2 text-center"><BoolToggle val={form.requires_justification} onChange={v => onChange('requires_justification', v)} /></td>
      <td className="px-3 py-2 text-center"><BoolToggle val={form.requires_approval} onChange={v => onChange('requires_approval', v)} /></td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onSave} className="h-7 w-7 p-0 text-emerald-600"><Check className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={onCancel} className="h-7 w-7 p-0 text-slate-400"><X className="w-3.5 h-3.5" /></Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Configure the extra charge types that can appear on FMPI Pricing Orders. All require justification and approval by default.</p>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs h-8">
          <Plus className="w-3.5 h-3.5" /> Add Type
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-slate-400 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-24">Code</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Name</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Description</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-20">Unit</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-20">Rate €</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600">Justif.</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600">Approv.</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {showAdd && (
                <RowForm
                  form={addForm}
                  onChange={af}
                  onSave={() => createMutation.mutate({ ...addForm, default_rate: addForm.default_rate ? Number(addForm.default_rate) : null })}
                  onCancel={() => { setShowAdd(false); setAddForm(EMPTY_FORM); }}
                  saveLabel="Add"
                />
              )}
              {items.map(item => editingId === item.id ? (
                <RowForm
                  key={item.id}
                  form={editForm}
                  onChange={ef}
                  onSave={() => updateMutation.mutate({ id: item.id, data: { ...editForm, default_rate: editForm.default_rate ? Number(editForm.default_rate) : null } })}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={item.id} className={`hover:bg-slate-50 ${!item.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5">{item.extra_charge_code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{item.display_name}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{item.description}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{item.default_unit || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{item.default_rate != null ? `€${item.default_rate}` : '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge className={item.requires_justification ? 'bg-amber-50 text-amber-700 text-xs' : 'bg-slate-50 text-slate-400 text-xs'}>
                      {item.requires_justification ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge className={item.requires_approval ? 'bg-red-50 text-red-600 text-xs' : 'bg-slate-50 text-slate-400 text-xs'}>
                      {item.requires_approval ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } })} className="text-slate-400 hover:text-slate-700">
                        {item.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => { setEditingId(item.id); setEditForm({ ...item }); }} className="text-slate-400 hover:text-indigo-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && !showAdd && (
            <div className="text-center py-8 text-slate-400 text-sm">No extra charge types configured. Import the Services Excel or add manually.</div>
          )}
        </div>
      )}
    </div>
  );
}