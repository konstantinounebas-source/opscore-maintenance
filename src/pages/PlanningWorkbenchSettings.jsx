import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Pencil, Check, X,
  GripVertical, ToggleLeft, ToggleRight,
  Settings, ChevronRight, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import PlanningTypesConfig from "@/components/configuration/PlanningTypesConfig";

// ─── Planning dropdown lists ──────────────────────────────────────────────────
const PLANNING_LIST_TYPES = [
  { key: "Planning Assignment Types",    label: "Assignment Types" },
  { key: "Planning Assignment Statuses", label: "Assignment Statuses" },
];

const CATEGORY_GROUPS = [
  {
    group: "Planning Types",
    isSpecial: true,
    categories: [
      { key: "planning_types", label: "Planning Types" },
    ],
  },
  {
    group: "Planning Dropdown Lists",
    categories: PLANNING_LIST_TYPES.map(t => ({ key: t.key, label: t.label })),
  },
];

// ─── ListManager (same as Configuration) ─────────────────────────────────────
function ListManager({ listKey, allItems, queryClient }) {
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
    <div className="space-y-4">
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-slate-400 py-4">No items configured. Add values below.</p>
        )}
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
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(item)} className="h-7 w-7 p-0">
                    {item.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
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
        <Input
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          placeholder="Add new value..."
          className="max-w-sm"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlanningWorkbenchSettings() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("planning_types");
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(CATEGORY_GROUPS.map(g => [g.group, true]))
  );

  const toggleGroup = (group) =>
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const { data: allItems = [] } = useQuery({
    queryKey: ["configLists"],
    queryFn: () => base44.entities.ConfigLists.list(),
  });

  const { data: planningTypesData = [] } = useQuery({
    queryKey: ["planningTypes"],
    queryFn: () => base44.entities.PlanningTypes.list(),
  });

  const countByCategory = (key) => {
    if (key === "planning_types") return planningTypesData.length;
    return allItems.filter(i => i.list_type === key && i.is_active !== false).length;
  };

  const selectedLabel = CATEGORY_GROUPS.flatMap(g => g.categories).find(c => c.key === selectedCategory)?.label || selectedCategory;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-slate-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Planning Workbench Settings</h1>
            <p className="text-xs text-slate-500">Manage planning types, assignment dropdowns and workbench configuration</p>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        {/* Left: Category sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Categories</p>
          </div>
          <div className="py-1">
            {CATEGORY_GROUPS.map(group => (
              <div key={group.group}>
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left bg-slate-50 hover:bg-slate-100 border-b border-slate-100 transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 text-slate-400 transition-transform flex-shrink-0 ${expandedGroups[group.group] ? "rotate-90" : ""}`} />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">{group.group}</span>
                  <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{group.categories.length}</span>
                </button>
                {expandedGroups[group.group] && group.categories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`w-full flex items-center justify-between pl-6 pr-3 py-2 text-left transition-colors ${selectedCategory === cat.key ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-700"}`}
                  >
                    <span className="text-sm font-medium truncate">{cat.label}</span>
                    {countByCategory(cat.key) !== null && (
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ml-1 flex-shrink-0 ${selectedCategory === cat.key ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
                        {countByCategory(cat.key)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Content panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {selectedCategory === "planning_types" && (
            <>
              <div>
                <h2 className="text-base font-bold text-slate-800">Planning Types</h2>
                <p className="text-xs text-slate-500 mt-0.5">Define different planning types (Inspection, Work Order, Installation) and their fields. Each planning week uses one of these types.</p>
              </div>
              <PlanningTypesConfig />
            </>
          )}

          {PLANNING_LIST_TYPES.map(t => t.key).includes(selectedCategory) && (
            <>
              <div>
                <h2 className="text-base font-bold text-slate-800">{selectedLabel}</h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedCategory}</p>
              </div>
              <ListManager listKey={selectedCategory} allItems={allItems} queryClient={queryClient} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}