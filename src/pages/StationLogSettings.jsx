import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, CheckCircle, XCircle, ChevronUp, ChevronDown, Settings, ChevronRight } from "lucide-react";
import Stage2WorkRulesTab from "@/components/stationlogs/settings/Stage2WorkRulesTab";
import Stage2WorkItemsTab from "@/components/stationlogs/settings/Stage2WorkItemsTab";
import Stage2ResourceTypesTab from "@/components/stationlogs/settings/Stage2ResourceTypesTab";
import Stage3PlanningRulesTab from "@/components/stationlogs/settings/Stage3PlanningRulesTab";

const CATEGORY_GROUPS = [
  {
    group: "Stage 1 — Order + Location",
    categories: [
      { key: "order_priority", label: "Order Priority" },
      { key: "order_type", label: "Order Type" },
      { key: "revision_source", label: "Revision Source" },
      { key: "installation_type", label: "Installation Type" },
      { key: "intervention_scope", label: "Intervention Scope" },
      { key: "shelter_type", label: "Shelter Type" },
      { key: "road_side", label: "Road Side" },
      { key: "traffic_direction", label: "Traffic Direction" },
      { key: "existing_infrastructure_type", label: "Existing Infrastructure Type" },
      { key: "pavement_type", label: "Pavement Type" },
      { key: "utility_type", label: "Utility Type" },
      { key: "traffic_impact_level", label: "Traffic Impact Level" },
      { key: "permit_type", label: "Permit Type" },
      { key: "risk_level", label: "Risk Level" },
      { key: "municipality", label: "Municipality" },
      { key: "district", label: "District" },
    ],
  },
  {
    group: "Tasks & Approvals",
    categories: [
      { key: "task_priority", label: "Task Priority" },
      { key: "task_status", label: "Task Status" },
      { key: "approval_status", label: "Approval Status" },
      { key: "authority_instruction_status", label: "Authority Instruction Status" },
    ],
  },
  {
    group: "Milestones",
    categories: [
      { key: "milestone_category", label: "Milestone Category" },
    ],
  },
  {
    group: "Stage 2 — Work & Resource Estimation",
    isSpecial: true,
    categories: [
      { key: "stage2_work_rules", label: "Work Rules" },
      { key: "stage2_work_items", label: "Work Items Library" },
      { key: "stage2_resource_types", label: "Resource Types" },
    ],
  },
  {
    group: "Stage 3 — Master Planning",
    isSpecial: true,
    categories: [
      { key: "stage3_planning_rules", label: "Planning Rules" },
    ],
  },
];

// Flat list for lookup
const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.categories);

function OptionRow({ opt, onEdit, onToggle, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${opt.is_active === false ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-200"}`}>
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={isFirst} className="text-slate-300 hover:text-slate-600 disabled:opacity-20">
          <ChevronUp className="h-3 w-3" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="text-slate-300 hover:text-slate-600 disabled:opacity-20">
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <span className="text-xs text-slate-400 w-6 text-right">{opt.sort_order ?? "—"}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{opt.label || opt.value}</p>
        {opt.description && <p className="text-xs text-slate-400">{opt.description}</p>}
      </div>
      <Badge className={opt.is_active === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}>
        {opt.is_active === false ? "Inactive" : "Active"}
      </Badge>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(opt)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" className={`h-7 w-7 p-0 ${opt.is_active === false ? "text-green-600 hover:text-green-700" : "text-slate-400 hover:text-red-500"}`}
        onClick={() => onToggle(opt)}>
        {opt.is_active === false ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function OptionForm({ categoryKey, opt, onSave, onCancel }) {
  const [form, setForm] = useState({
    category: categoryKey,
    value: opt?.value || "",
    label: opt?.label || "",
    description: opt?.description || "",
    sort_order: opt?.sort_order ?? 0,
    is_active: opt?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.value.trim()) return alert("Value is required.");
    setSaving(true);
    if (opt?.id) {
      await base44.entities.StationLogDropdownOptions.update(opt.id, form);
    } else {
      await base44.entities.StationLogDropdownOptions.create(form);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg space-y-2">
      <p className="text-xs font-bold text-blue-800 uppercase">{opt ? "Edit Option" : "New Option"}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-600 font-semibold uppercase">Value *</label>
          <Input className="mt-1 h-8 text-sm" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="stored value" />
        </div>
        <div>
          <label className="text-xs text-slate-600 font-semibold uppercase">Label</label>
          <Input className="mt-1 h-8 text-sm" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="display label" />
        </div>
        <div>
          <label className="text-xs text-slate-600 font-semibold uppercase">Sort Order</label>
          <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs text-slate-600 font-semibold uppercase">Description</label>
          <Input className="mt-1 h-8 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="optional" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default function StationLogSettings() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES[0].key);
  const [editingOpt, setEditingOpt] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(CATEGORY_GROUPS.map(g => [g.group, true]))
  );

  const toggleGroup = (group) =>
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const { data: allOptions = [], isLoading } = useQuery({
    queryKey: ["stationLogDropdownOptions"],
    queryFn: () => base44.entities.StationLogDropdownOptions.list(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stationLogDropdownOptions"] });
    setEditingOpt(null);
  };

  const categoryOptions = allOptions
    .filter(o => o.category === selectedCategory && (showInactive || o.is_active !== false))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.label ?? "").localeCompare(b.label ?? ""));

  const countByCategory = (cat) => allOptions.filter(o => o.category === cat && o.is_active !== false).length;

  const handleToggle = async (opt) => {
    await base44.entities.StationLogDropdownOptions.update(opt.id, { is_active: opt.is_active === false ? true : false });
    refresh();
  };

  const handleMoveUp = async (opt, idx) => {
    if (idx === 0) return;
    const prev = categoryOptions[idx - 1];
    await Promise.all([
      base44.entities.StationLogDropdownOptions.update(opt.id, { sort_order: prev.sort_order ?? idx - 1 }),
      base44.entities.StationLogDropdownOptions.update(prev.id, { sort_order: opt.sort_order ?? idx }),
    ]);
    refresh();
  };

  const handleMoveDown = async (opt, idx) => {
    if (idx === categoryOptions.length - 1) return;
    const next = categoryOptions[idx + 1];
    await Promise.all([
      base44.entities.StationLogDropdownOptions.update(opt.id, { sort_order: next.sort_order ?? idx + 1 }),
      base44.entities.StationLogDropdownOptions.update(next.id, { sort_order: opt.sort_order ?? idx }),
    ]);
    refresh();
  };

  const selectedCategoryLabel = ALL_CATEGORIES.find(c => c.key === selectedCategory)?.label || selectedCategory;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-slate-600" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Station Log Settings</h1>
            <p className="text-xs text-slate-500">Manage dropdown options used across the Station Log workflow</p>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        {/* Left: Category list */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Categories</p>
          </div>
          <div className="py-1">
            {CATEGORY_GROUPS.map(group => (
              <div key={group.group}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left bg-slate-50 hover:bg-slate-100 border-b border-slate-100 transition-colors"
                >
                  <ChevronRight className={`h-3 w-3 text-slate-400 transition-transform flex-shrink-0 ${expandedGroups[group.group] ? "rotate-90" : ""}`} />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">{group.group}</span>
                </button>
                {/* Group categories */}
                {expandedGroups[group.group] && group.categories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => { setSelectedCategory(cat.key); setEditingOpt(null); }}
                    className={`w-full flex items-center justify-between pl-6 pr-3 py-2 text-left transition-colors ${selectedCategory === cat.key ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50 text-slate-700"}`}
                  >
                    <span className="text-sm font-medium truncate">{cat.label}</span>
                    {!group.isSpecial && (
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

        {/* Right: Options for selected category */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Stage 2 special tabs */}
           {selectedCategory === "stage2_work_rules" && <Stage2WorkRulesTab />}
           {selectedCategory === "stage2_work_items" && <Stage2WorkItemsTab />}
           {selectedCategory === "stage2_resource_types" && <Stage2ResourceTypesTab />}

           {/* Stage 3 special tabs */}
           {selectedCategory === "stage3_planning_rules" && <Stage3PlanningRulesTab />}

           {/* Standard dropdown category panel */}
           {!selectedCategory.startsWith("stage2_") && !selectedCategory.startsWith("stage3_") && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">{selectedCategoryLabel}</h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedCategory}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
                    Show inactive
                  </label>
                  <Button size="sm" className="gap-1 h-8" onClick={() => setEditingOpt(false)}>
                    <Plus className="h-3.5 w-3.5" /> Add Option
                  </Button>
                </div>
              </div>

              {editingOpt !== null && (
                <OptionForm
                  categoryKey={selectedCategory}
                  opt={editingOpt || null}
                  onSave={refresh}
                  onCancel={() => setEditingOpt(null)}
                />
              )}

              {isLoading ? (
                <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
              ) : categoryOptions.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
                  No options yet. Click "Add Option" to create one.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {categoryOptions.map((opt, idx) => (
                    <OptionRow
                      key={opt.id}
                      opt={opt}
                      isFirst={idx === 0}
                      isLast={idx === categoryOptions.length - 1}
                      onEdit={() => setEditingOpt(opt)}
                      onToggle={handleToggle}
                      onMoveUp={() => handleMoveUp(opt, idx)}
                      onMoveDown={() => handleMoveDown(opt, idx)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}