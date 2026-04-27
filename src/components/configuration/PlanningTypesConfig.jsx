import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

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

  const startEdit = (planningType) => {
    setEditingId(planningType.id);
    setEditData({ ...planningType });
  };

  const saveEdit = () => {
    if (editData.name?.trim()) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: editData.name,
          description: editData.description,
        },
      });
      setEditingId(null);
    }
  };

  const toggleActive = (planningType) => {
    updateMutation.mutate({
      id: planningType.id,
      data: { is_active: !planningType.is_active },
    });
  };

  const handleGenerateWeeks = () => {
    if (!selectedTypeId) return;
    generateWeeksMutation.mutate({
      planning_type_id: selectedTypeId,
      year: generateYear,
      mode: generateMode,
    });
  };

  return (
    <div className="space-y-4">
      {/* Input for new planning type */}
      <div className="space-y-2 p-4 border border-slate-200 rounded-lg bg-slate-50">
        <div className="space-y-1.5">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Planning type name..."
            className="text-sm"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <Input
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="text-sm"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 w-full">
          <Plus className="w-3.5 h-3.5" /> Add Planning Type
        </Button>
      </div>

      {/* Planning types list */}
      <div className="space-y-2">
        {planningTypes.length === 0 && (
          <p className="text-sm text-slate-400 py-4">No planning types configured. Add one above.</p>
        )}

        {planningTypes.map(pt => (
          <div key={pt.id} className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              {editingId === pt.id ? (
                <div className="space-y-1.5">
                  <Input
                    value={editData.name || ""}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Planning type name"
                    className="text-sm"
                  />
                  <Input
                    value={editData.description || ""}
                    onChange={e => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                    className="text-sm"
                  />
                </div>
              ) : (
                <>
                  <h3 className={`text-sm font-semibold ${!pt.is_active ? "text-slate-400 line-through" : "text-slate-900"}`}>
                    {pt.name}
                  </h3>
                  {pt.description && <p className="text-xs text-slate-500">{pt.description}</p>}
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {editingId === pt.id ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveEdit}
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                    className="h-7 w-7 p-0 text-slate-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedTypeId(pt.id); setGenerateMode("weeks"); setGenerateDialogOpen(true); }}
                    title="Generate planning periods"
                    className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
                  >
                    + Periods
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(pt)}
                    title={pt.is_active ? "Deactivate" : "Activate"}
                    className="h-7 w-7 p-0"
                  >
                    {pt.is_active ? (
                      <ToggleRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(pt)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(pt.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
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
                 min={2020}
                 max={2050}
                 className="text-sm"
               />
               <p className="text-xs text-slate-400 mt-1">
                 {generateMode === "months" ? `12 monthly periods will be created for ${generateYear}` : `52 weekly periods will be created for ${generateYear}`}
               </p>
             </div>
             <div className="flex gap-2 justify-end pt-2">
               <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
               <Button
                 className="bg-indigo-600 hover:bg-indigo-700"
                 onClick={handleGenerateWeeks}
                 disabled={generateWeeksMutation.isPending}
               >
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