import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

const PLANNING_TYPE_TEMPLATES = {
  inspection: {
    name: "Inspection Planning",
    description: "Plan and track asset inspections",
    icon: "CheckCircle2",
    color: "#06B6D4",
    available_statuses: [
      { code: "planned", label: "Planned", color: "#6366F1", order: 1 },
      { code: "in_progress", label: "In Progress", color: "#3B82F6", order: 2 },
      { code: "completed", label: "Completed", color: "#22C55E", order: 3 },
      { code: "deferred", label: "Deferred", color: "#A78BFA", order: 4 },
      { code: "cancelled", label: "Cancelled", color: "#9CA3AF", order: 5 },
    ],
    available_fields: ["priority_bucket", "assignment_type", "estimated_duration_minutes", "sla_due_date"],
  },
  workorder: {
    name: "Work Order Planning",
    description: "Manage and track work order execution",
    icon: "Wrench",
    color: "#F59E0B",
    available_statuses: [
      { code: "open", label: "Open", color: "#6366F1", order: 1 },
      { code: "in_progress", label: "In Progress", color: "#3B82F6", order: 2 },
      { code: "completed", label: "Completed", color: "#22C55E", order: 3 },
      { code: "closed", label: "Closed", color: "#9CA3AF", order: 4 },
    ],
    available_fields: ["work_order_reference", "assignment_type", "estimated_duration_minutes", "sla_due_date"],
  },
  installation: {
    name: "Installation Planning",
    description: "Plan and track asset installations",
    icon: "Hammer",
    color: "#10B981",
    available_statuses: [
      { code: "planned", label: "Planned", color: "#6366F1", order: 1 },
      { code: "shipped", label: "Shipped", color: "#F59E0B", order: 2 },
      { code: "installed", label: "Installed", color: "#22C55E", order: 3 },
      { code: "verified", label: "Verified", color: "#06B6D4", order: 4 },
    ],
    available_fields: ["estimated_duration_minutes", "delivery_date", "installation_date"],
  },
};

export default function PlanningTypesConfig() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const { data: planningTypes = [] } = useQuery({
    queryKey: ["planningTypes"],
    queryFn: () => base44.entities.PlanningTypes.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanningTypes.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningTypes"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanningTypes.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningTypes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningTypes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planningTypes"] }),
  });

  const handleCreateTemplate = (templateKey) => {
    const template = PLANNING_TYPE_TEMPLATES[templateKey];
    const existsCount = planningTypes.filter(pt => pt.code === templateKey).length;
    if (existsCount > 0) {
      alert(`Planning type "${templateKey}" already exists`);
      return;
    }
    createMutation.mutate({
      code: templateKey,
      ...template,
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
          color: editData.color,
          is_active: editData.is_active,
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

  const availableTemplates = Object.keys(PLANNING_TYPE_TEMPLATES).filter(
    key => !planningTypes.some(pt => pt.code === key)
  );

  return (
    <div className="space-y-6">
      {/* Template buttons */}
      {availableTemplates.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-3">Quick Add Templates:</p>
          <div className="flex flex-wrap gap-2">
            {availableTemplates.map(key => {
              const template = PLANNING_TYPE_TEMPLATES[key];
              return (
                <Button
                  key={key}
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateTemplate(key)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {template.name}
                </Button>
              );
            })}
          </div>
          <hr className="my-4" />
        </div>
      )}

      {/* Planning types list */}
      <div className="space-y-3">
        {planningTypes.length === 0 && (
          <p className="text-sm text-slate-400 py-4">No planning types configured. Use the templates above to create one.</p>
        )}

        {planningTypes.map(pt => (
          <div key={pt.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {editingId === pt.id ? (
                  <div className="space-y-3">
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
                    <div className="flex gap-2">
                      <div>
                        <label className="text-xs text-slate-600 block mb-1">Color:</label>
                        <input
                          type="color"
                          value={editData.color || "#000000"}
                          onChange={e => setEditData({ ...editData, color: e.target.value })}
                          className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: pt.color }} />
                      <h3 className={`text-sm font-semibold ${!pt.is_active ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        {pt.name}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {pt.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{pt.description}</p>
                    {pt.available_statuses && (
                      <div className="flex flex-wrap gap-1.5">
                        {pt.available_statuses.map(s => (
                          <span
                            key={s.code}
                            className="text-[10px] px-2 py-1 rounded"
                            style={{ backgroundColor: `${s.color}20`, color: s.color }}
                          >
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
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
          </div>
        ))}
      </div>
    </div>
  );
}