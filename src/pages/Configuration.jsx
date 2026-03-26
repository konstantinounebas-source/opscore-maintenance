import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Check, X, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import WorkflowConfig from "@/components/configuration/WorkflowConfig";
import ChildLogicConfig from "@/components/configuration/ChildLogicConfig";

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
  { key: "Reporter Names", label: "Ονόματα Αναφερόντων (Dropdown)" },
  { key: "Reporter Phones", label: "Τηλέφωνα Αναφερόντων" },
  { key: "Reporter Emails", label: "Emails Αναφερόντων" },
  { key: "Τρόποι Αναφοράς", label: "Τρόποι Αναφοράς" },
];

const PLANNING_LIST_TYPES = [
  { key: "Planning Assignment Types",    label: "Assignment Types" },
  { key: "Planning Assignment Statuses", label: "Assignment Statuses" },
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
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [dragOverId, setDragOverId] = useState(null);
  const dragSrcId = useRef(null);

  const items = allItems.filter(i => i.list_type === selectedType).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ConfigLists.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["configLists"] }); setNewValue(""); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConfigLists.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["configLists"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfigLists.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["configLists"] }),
  });

  const handleAdd = () => {
    if (!newValue.trim()) return;
    createMutation.mutate({ list_type: selectedType, value: newValue.trim(), is_active: true, sort_order: items.length });
  };

  const startEdit = (item) => { setEditingId(item.id); setEditValue(item.value); };
  const saveEdit = (item) => {
    if (editValue.trim() && editValue.trim() !== item.value)
      updateMutation.mutate({ id: item.id, data: { value: editValue.trim() } });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const toggleActive = (item) => updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });

  // Drag handlers
  const onDragStart = (e, item) => { dragSrcId.current = item.id; e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e, item) => { e.preventDefault(); setDragOverId(item.id); };
  const onDrop = (e, dropItem) => {
    e.preventDefault();
    const srcId = dragSrcId.current;
    if (!srcId || srcId === dropItem.id) { setDragOverId(null); return; }
    const srcIdx = items.findIndex(i => i.id === srcId);
    const dstIdx = items.findIndex(i => i.id === dropItem.id);
    const reordered = [...items];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dstIdx, 0, moved);
    reordered.forEach((item, idx) => updateMutation.mutate({ id: item.id, data: { sort_order: idx } }));
    dragSrcId.current = null;
    setDragOverId(null);
  };
  const onDragEnd = () => { dragSrcId.current = null; setDragOverId(null); };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setEditingId(null); }}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {listTypes.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 mb-4">
        {items.length === 0 && <p className="text-sm text-slate-400 py-4">No items configured. Add values below.</p>}
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => onDragStart(e, item)}
            onDragOver={e => onDragOver(e, item)}
            onDrop={e => onDrop(e, item)}
            onDragEnd={onDragEnd}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors group
              ${!item.is_active ? "bg-slate-50 opacity-60" : "bg-white"}
              ${dragOverId === item.id ? "border-indigo-400 bg-indigo-50" : "border-transparent hover:border-slate-200"}
            `}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Drag handle */}
              <span className="opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical className="w-4 h-4 text-slate-400" />
              </span>
              {editingId === item.id ? (
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(item); if (e.key === "Escape") cancelEdit(); }}
                  className="h-7 text-sm max-w-xs"
                  autoFocus
                />
              ) : (
                <span className={`text-sm ${item.is_active ? "text-slate-700" : "text-slate-400 line-through"}`}>{item.value}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {editingId === item.id ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => saveEdit(item)} className="h-7 w-7 p-0 text-green-600 hover:text-green-700">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(item)} title={item.is_active ? "Deactivate" : "Activate"} className="h-7 w-7 p-0">
                    {item.is_active
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Add new value..." className="max-w-sm" onKeyDown={e => e.key === "Enter" && handleAdd()} />
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
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Child Logic</h2>
          <p className="text-xs text-slate-500 mb-6">Define child components, shelter type mappings, and templates. When a shelter type is selected during asset creation, children are auto-loaded from these templates.</p>
          <ChildLogicConfig />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Planning Configuration</h2>
          <p className="text-xs text-slate-500 mb-6">Configure assignment types, statuses, and other planning dropdown values. These drive all Planning module dropdowns.</p>
          <ListManager listTypes={PLANNING_LIST_TYPES} allItems={allItems} queryClient={queryClient} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs text-slate-500 mb-6">Define and manage workflow actions, phases, SLA rules, and attachment requirements. Changes here are reflected immediately in all incident workflows.</p>
          <WorkflowConfig />
        </div>
      </div>
    </div>
  );
}