import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Pencil, Check, X,
  ToggleLeft, ToggleRight, Loader2,
  ChevronRight
} from "lucide-react";

function derivePrefix(name = '') {
  return name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'XX';
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  Draft:      "bg-slate-100 text-slate-600",
  Active:     "bg-green-100 text-green-700",
  Locked:     "bg-amber-100 text-amber-700",
  Archived:   "bg-red-100 text-red-600",
};

function PlanningTypeRow({ pt, allWeeks, editingId, editData, setEditData, onSaveEdit, onCancelEdit, onStartEdit, onToggleActive, onDelete, onOpenGenerate }) {
  const [expanded, setExpanded] = useState(false);

  const weeks = allWeeks
    .filter(w => w.planning_type_id === pt.id)
    .sort((a, b) => a.week_code?.localeCompare(b.week_code));

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className={`flex items-center gap-2 p-3 transition-colors ${expanded ? "bg-slate-50 border-b border-slate-200" : "bg-white hover:bg-slate-50"}`}>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 transition-colors"
        >
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>

        {/* Name / edit form */}
        <div className="flex-1 min-w-0">
          {editingId === pt.id ? (
            <div className="flex gap-2 flex-wrap">
              <Input
                value={editData.name || ""}
                onChange={e => setEditData({ ...editData, name: e.target.value })}
                placeholder="Name"
                className="text-sm h-7 min-w-32 flex-1"
                autoFocus
              />
              <Input
                value={editData.description || ""}
                onChange={e => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description"
                className="text-sm h-7 min-w-32 flex-1"
              />
              <div className="flex items-center gap-1">
                <Input
                  value={editData.prefix !== undefined ? editData.prefix : derivePrefix(editData.name)}
                  onChange={e => setEditData({ ...editData, prefix: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="XX"
                  maxLength={2}
                  className="text-sm h-7 w-14 text-center font-mono uppercase"
                  title="2-letter prefix for period codes"
                />
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  → {(editData.prefix || derivePrefix(editData.name)).padEnd(2,'X')}-W-01-{String(new Date().getFullYear()).slice(-2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm font-semibold truncate ${!pt.is_active ? "text-slate-400 line-through" : "text-slate-900"}`}>
                {pt.name}
              </span>
              {pt.description && (
                <span className="text-xs text-slate-400 truncate hidden sm:inline">{pt.description}</span>
              )}
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1 rounded flex-shrink-0">
                {(pt.prefix || derivePrefix(pt.name)).toUpperCase().padEnd(2,'X')}
              </span>
              <span className="text-[10px] text-slate-400 flex-shrink-0">
                {weeks.length > 0 ? `${weeks.length} period${weeks.length !== 1 ? "s" : ""}` : "no periods"}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {editingId === pt.id ? (
            <>
              <Button variant="ghost" size="sm" onClick={onSaveEdit} className="h-7 w-7 p-0 text-green-600 hover:text-green-700">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelEdit} className="h-7 w-7 p-0 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost" size="sm"
                onClick={() => onOpenGenerate(pt.id)}
                title="Generate planning periods"
                className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
              >
                + Periods
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onToggleActive(pt)} className="h-7 w-7 p-0" title={pt.is_active ? "Deactivate" : "Activate"}>
                {pt.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onStartEdit(pt)} className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(pt.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded: periods list */}
      {expanded && (
        <div className="p-3 bg-white space-y-1">
          {weeks.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">No periods generated yet. Use "+ Periods" to create some.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 px-2 pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Code</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Name</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dates</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
              </div>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {weeks.map(w => (
                  <div key={w.id} className="grid grid-cols-4 gap-2 items-center px-2 py-1.5 rounded hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-mono text-slate-700">{w.week_code}</span>
                    <span className="text-xs text-slate-600 truncate">{w.week_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {w.start_date} → {w.end_date}
                    </span>
                    <span>
                      <Badge className={`text-[9px] ${STATUS_COLORS[w.status] || "bg-slate-100 text-slate-600"}`}>
                        {w.status}
                      </Badge>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlanningTypesConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [generateMode, setGenerateMode] = useState("weeks");

  const { data: planningTypes = [] } = useQuery({
    queryKey: ["planningTypes"],
    queryFn: () => base44.entities.PlanningTypes.list(),
  });

  const { data: allWeeks = [] } = useQuery({
    queryKey: ["planningWeeks"],
    queryFn: () => base44.entities.PlanningWeeks.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanningTypes.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningTypes"] });
      setNewName("");
      setNewDescription("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanningTypes.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningTypes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningTypes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningTypes"] }),
  });

  const generateWeeksMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generatePlanningWeeks', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      const label = generateMode === "months" ? "12 months" : "52 weeks";
      toast({ title: `${label} generated successfully (${res.data?.total_created || 0} periods)` });
      setGenerateDialogOpen(false);
    },
    onError: (err) => toast({ title: "Failed to generate periods", description: err.message, variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      code: newName.toLowerCase().replace(/\s+/g, "_"),
      name: newName.trim(),
      description: newDescription.trim(),
      is_active: true,
      sort_order: planningTypes.length,
    });
  };

  const startEdit = (pt) => { setEditingId(pt.id); setEditData({ ...pt }); };
  const saveEdit = () => {
    if (editData.name?.trim()) {
      const prefix = (editData.prefix || derivePrefix(editData.name)).toUpperCase().slice(0, 2);
      updateMutation.mutate({ id: editingId, data: { name: editData.name, description: editData.description, prefix } });
      setEditingId(null);
    }
  };
  const toggleActive = (pt) => updateMutation.mutate({ id: pt.id, data: { is_active: !pt.is_active } });

  const handleGenerateWeeks = () => {
    if (!selectedTypeId) return;
    generateWeeksMutation.mutate({ planning_type_id: selectedTypeId, year: generateYear, mode: generateMode });
  };

  return (
    <div className="space-y-4">
      {/* Add new type */}
      <div className="space-y-2 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <div className="space-y-1.5">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Planning type name..." className="text-sm" onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description (optional)..." className="text-sm" onKeyDown={e => e.key === "Enter" && handleAdd()} />
        </div>
        <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 w-full">
          <Plus className="w-3.5 h-3.5" /> Add Planning Type
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {planningTypes.length === 0 && (
          <p className="text-sm text-slate-400 py-4">No planning types configured. Add one above.</p>
        )}
        {planningTypes.map(pt => (
          <PlanningTypeRow
            key={pt.id}
            pt={pt}
            allWeeks={allWeeks}
            editingId={editingId}
            editData={editData}
            setEditData={setEditData}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingId(null)}
            onStartEdit={startEdit}
            onToggleActive={toggleActive}
            onDelete={(id) => deleteMutation.mutate(id)}
            onOpenGenerate={(id) => { setSelectedTypeId(id); setGenerateMode("weeks"); setGenerateDialogOpen(true); }}
          />
        ))}
      </div>

      {/* Generate Periods Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Planning Periods</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Period Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGenerateMode("weeks")}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${generateMode === "weeks" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"}`}
                >
                  52 Weeks
                </button>
                <button
                  onClick={() => setGenerateMode("months")}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${generateMode === "months" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"}`}
                >
                  12 Months
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Year</label>
              <Input
                type="number"
                value={generateYear}
                onChange={e => setGenerateYear(parseInt(e.target.value))}
                min={2020} max={2050}
                className="text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">
                {generateMode === "months" ? `12 monthly periods will be created for ${generateYear}` : `52 weekly periods will be created for ${generateYear}`}
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleGenerateWeeks} disabled={generateWeeksMutation.isPending}>
                {generateWeeksMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {generateWeeksMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}