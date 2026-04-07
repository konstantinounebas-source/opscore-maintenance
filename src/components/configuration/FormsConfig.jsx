import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X, GripVertical, ToggleLeft, ToggleRight, FileText } from "lucide-react";
import { useRef } from "react";

// ── Form field definitions ────────────────────────────────────────────────────
// Each form has a set of configurable list_type keys for their dropdowns
const FORM_FIELDS = {
  outline_management: {
    label: "Outline Management Plan (OMPI)",
    description: "Configure dropdown options for the Outline Management Plan form.",
    lists: [
      { key: "form_ompi_owr",         label: "Εκτός Εγγύησης (OWR) Options" },
      { key: "form_ompi_ca_approval", label: "CA Approval Options" },
      { key: "form_ompi_priority",    label: "Priority Options" },
    ],
  },
  fmpi_invoice: {
    label: "Full Management Plan (FMPI) & Pricing Order",
    description: "Configure dropdown options for the FMPI form and Pricing Order tab.",
    lists: [
      { key: "form_fmpi_owr",         label: "Εκτός Εγγύησης (OWR) Options" },
      { key: "form_fmpi_ca_approval", label: "CA Approval Options" },
      { key: "form_fmpi_priority",    label: "Priority Options" },
    ],
  },
  make_safe: {
    label: "Make Safe Checklist",
    description: "Configure dropdown and checklist options for the Make Safe Checklist form.",
    lists: [
      { key: "form_make_safe_technicians",     label: "Technicians" },
      { key: "form_make_safe_vehicles",        label: "Vehicles" },
      { key: "form_make_safe_danger_types",    label: "Danger Types" },
      { key: "form_make_safe_ppe_items",       label: "PPE Items" },
      { key: "form_make_safe_coord_partners",  label: "Coordination Partners" },
    ],
  },
  corrective_wo: {
    label: "Work Order Invoice (Corrective)",
    description: "Configure dropdown options for the Corrective Work Order Invoice form.",
    lists: [
      { key: "form_wo_technicians",  label: "Technicians / Assigned To" },
      { key: "form_wo_sig_services", label: "Service / Position (Signature)" },
    ],
  },
  child_catalog: {
    label: "Child Catalog",
    description: "Configure dropdown options for Child Category and Type in the Child Catalog.",
    lists: [
      { key: "child_category", label: "Category" },
      { key: "child_type",     label: "Type" },
    ],
  },
};

// ── Single list manager ───────────────────────────────────────────────────────
function ListEditor({ listKey, listLabel, allItems, queryClient }) {
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [dragOverId, setDragOverId] = useState(null);
  const dragSrcId = useRef(null);

  const items = allItems
    .filter(i => i.list_type === listKey)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
    createMutation.mutate({ list_type: listKey, value: newValue.trim(), is_active: true, sort_order: items.length });
  };

  const startEdit = (item) => { setEditingId(item.id); setEditValue(item.value); };
  const saveEdit = (item) => {
    if (editValue.trim() && editValue.trim() !== item.value)
      updateMutation.mutate({ id: item.id, data: { value: editValue.trim() } });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);
  const toggleActive = (item) => updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });

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
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{listLabel}</span>
        <span className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="p-3 space-y-1.5">
        {items.length === 0 && (
          <p className="text-xs text-slate-400 py-2 text-center italic">No values yet. Add below.</p>
        )}
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => onDragStart(e, item)}
            onDragOver={e => onDragOver(e, item)}
            onDrop={e => onDrop(e, item)}
            onDragEnd={onDragEnd}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border transition-colors group
              ${!item.is_active ? "bg-slate-50 opacity-60" : "bg-white"}
              ${dragOverId === item.id ? "border-indigo-400 bg-indigo-50" : "border-transparent hover:border-slate-200"}
            `}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="opacity-0 group-hover:opacity-40 cursor-grab shrink-0">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
              </span>
              {editingId === item.id ? (
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(item); if (e.key === "Escape") cancelEdit(); }}
                  className="h-6 text-xs max-w-xs"
                  autoFocus
                />
              ) : (
                <span className={`text-sm ${item.is_active ? "text-slate-700" : "text-slate-400 line-through"}`}>{item.value}</span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {editingId === item.id ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => saveEdit(item)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700">
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(item)} className="h-6 w-6 p-0">
                    {item.is_active
                      ? <ToggleRight className="w-3.5 h-3.5 text-green-500" />
                      : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)} className="h-6 w-6 p-0 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Add new value..."
            className="h-7 text-xs"
          />
          <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1 px-2" onClick={handleAdd}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main FormsConfig component ────────────────────────────────────────────────
export default function FormsConfig() {
  const queryClient = useQueryClient();
  const { data: allItems = [] } = useQuery({
    queryKey: ["configLists"],
    queryFn: () => base44.entities.ConfigLists.list(),
  });

  const formKeys = Object.keys(FORM_FIELDS);

  return (
    <div>
      <Tabs defaultValue={formKeys[0]}>
        <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-slate-100 p-1 rounded-lg">
          {formKeys.map(key => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              {FORM_FIELDS[key].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {formKeys.map(key => {
          const form = FORM_FIELDS[key];
          return (
            <TabsContent key={key} value={key} className="space-y-4">
              <p className="text-xs text-slate-500">{form.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.lists.map(list => (
                  <ListEditor
                    key={list.key}
                    listKey={list.key}
                    listLabel={list.label}
                    allItems={allItems}
                    queryClient={queryClient}
                  />
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}