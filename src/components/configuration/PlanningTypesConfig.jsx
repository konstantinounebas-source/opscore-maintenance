import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

export default function PlanningTypesConfig() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

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
    </div>
  );
}