import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Check, X, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import WorkflowConfig from "@/components/configuration/WorkflowConfig";

const INCIDENT_LIST_TYPES = [
  { key: "Provinces", label: "Provinces" },
  { key: "Municipalities", label: "Municipalities" },
  { key: "Incident Sources", label: "Incident Sources" },
  { key: "Structural Issues", label: "Structural Issues" },
  { key: "Electrical Issues", label: "Electrical Issues" },
  { key: "Electronic Issues", label: "Electronic Issues" },
  { key: "Probable Causes", label: "Probable Causes" },
  { key: "Evidence Types", label: "Evidence Types" },
  { key: "Priority", label: "Priority" },
  { key: "OWR / Make-Safe", label: "OWR / Make-Safe" },
  { key: "Yes / No", label: "Yes / No" },
  { key: "Asset ID", label: "Asset ID" },
  { key: "Asset Province", label: "Asset Province" },
  { key: "Asset Municipality", label: "Asset Municipality" },
  { key: "Asset Address", label: "Asset Address" },
  { key: "Reporter Names", label: "Ονόματα Αναφερόντων" },
  { key: "Reporter Phones", label: "Τηλέφωνα Αναφερόντων" },
  { key: "Reporter Emails", label: "Emails Αναφερόντων" },
  { key: "Τρόποι Αναφοράς", label: "Τρόποι Αναφοράς" },
];

const CHILD_LIST_TYPES = [
  { key: "Child Category", label: "Category" },
  { key: "Child Type", label: "Child Type" },
  { key: "Child Parent Asset", label: "Parent Asset" },
  { key: "Child Status", label: "Status" },
];

const ASSET_LIST_TYPES = [
  { key: "Asset Cities", label: "Cities" },
  { key: "Asset Shelter Types", label: "Shelter Types" },
  { key: "Asset Child Categories", label: "Child Categories" },
  { key: "Asset Child Subcategories", label: "Child Subcategories" },
  { key: "Asset Status", label: "Status" },
  { key: "Asset Evidence Types", label: "Evidence Types" },
];

function ListManager({ listTypes, allItems, queryClient }) {
  const [selectedType, setSelectedType] = useState(listTypes[0].key);
  const [newValue, setNewValue] = useState("");

  const items = allItems.filter(i => i.list_type === selectedType).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ConfigLists.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configLists"] });
      setNewValue("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfigLists.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configLists"] });
    },
  });

  const handleAdd = () => {
    if (!newValue.trim()) return;
    createMutation.mutate({ list_type: selectedType, value: newValue.trim(), is_active: true, sort_order: items.length });
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {listTypes.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 mb-4">
        {items.length === 0 && <p className="text-sm text-slate-400 py-4">No items configured. Add values below.</p>}
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-700">{item.value}</span>
            <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={`Add new value...`} className="max-w-sm" onKeyDown={e => e.key === "Enter" && handleAdd()} />
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
    </>
  );
}

export default function Configuration() {
  const queryClient = useQueryClient();

  const { data: allItems = [] } = useQuery({ queryKey: ["configLists"], queryFn: () => base44.entities.ConfigLists.list() });

  return (
    <div>
      <TopHeader title="Configuration" />
      <div className="p-6 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Manage Dropdown Lists of Incident</h2>
          <p className="text-xs text-slate-500 mb-6">Configure the dropdown values used across the application. These lists power category, type, status, and priority fields.</p>
          <ListManager listTypes={INCIDENT_LIST_TYPES} allItems={allItems} queryClient={queryClient} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Manage Dropdown Lists for Assets</h2>
          <p className="text-xs text-slate-500 mb-6">Configure the dropdown values used in asset management. These lists power shelter types, cities, child categories, and status fields.</p>
          <ListManager listTypes={ASSET_LIST_TYPES} allItems={allItems} queryClient={queryClient} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Manage Dropdown Lists for Childs</h2>
          <p className="text-xs text-slate-500 mb-6">Configure the dropdown values used in child asset management. These lists power category, type, parent asset, and status fields.</p>
          <ListManager listTypes={CHILD_LIST_TYPES} allItems={allItems} queryClient={queryClient} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs text-slate-500 mb-6">Define and manage workflow actions, phases, SLA rules, and attachment requirements. Changes here are reflected immediately in all incident workflows.</p>
          <WorkflowConfig />
        </div>
      </div>
    </div>
  );
}