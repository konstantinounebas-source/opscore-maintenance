import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CheckCircle, XCircle, Copy, ChevronDown, ChevronRight } from "lucide-react";

// Allowed trigger fields — display label → stored key
export const TRIGGER_FIELDS = [
  { key: "shelter_type", label: "Shelter Type" },
  { key: "pavement_type", label: "Pavement Type" },
  { key: "existing_infrastructure_type", label: "Existing Infrastructure" },
  { key: "requires_footway", label: "Requires Footway" },
  { key: "has_bus_bay", label: "Has Bus Bay" },
  { key: "has_road_marking", label: "Has Road Marking" },
  { key: "traffic_impact_level", label: "Traffic Impact Level" },
  { key: "risk_level", label: "Risk Level" },
  { key: "installation_type", label: "Installation Type" },
  { key: "intervention_scope", label: "Intervention Scope" },
];

const BOOLEAN_FIELDS = ["requires_footway", "has_bus_bay", "has_road_marking"];

function timeToMinutes(hours, minutes) {
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}
function minutesToDisplay(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
function minutesToParts(mins) {
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
}

// Seed work rules — resolved after seed data loaded
const SEED_RULES_TEMPLATES = [
  { trigger_field: "shelter_type", trigger_label: "Shelter Type", trigger_value: "TYPE C3", work_item_name: "Excavation", estimated_time_minutes: 210, resource_name: "Civil Crew", default_selected: true },
  { trigger_field: "shelter_type", trigger_label: "Shelter Type", trigger_value: "TYPE C3", work_item_name: "Platform / Base Preparation", estimated_time_minutes: 1200, resource_name: "Civil Crew", default_selected: true },
  { trigger_field: "shelter_type", trigger_label: "Shelter Type", trigger_value: "TYPE C3", work_item_name: "Concrete Works", estimated_time_minutes: 35, resource_name: "Civil Crew", default_selected: true },
  { trigger_field: "shelter_type", trigger_label: "Shelter Type", trigger_value: "TYPE C3", work_item_name: "New Shelter Installation", estimated_time_minutes: 150, resource_name: "Installation Crew", default_selected: true },
  { trigger_field: "pavement_type", trigger_label: "Pavement Type", trigger_value: "Tactile Warning Tiles", work_item_name: "Tactile Pavement", estimated_time_minutes: 45, resource_name: "Civil Crew", default_selected: true },
  { trigger_field: "existing_infrastructure_type", trigger_label: "Existing Infrastructure", trigger_value: "Sign Only", work_item_name: "Signs Removal", estimated_time_minutes: 5, resource_name: "Small Crew", default_selected: true },
  { trigger_field: "requires_footway", trigger_label: "Requires Footway", trigger_value: "Yes", work_item_name: "Footway Construction", estimated_time_minutes: 120, resource_name: "Civil Crew", default_selected: false },
];

function RuleForm({ opt, workItems, resources, dropdownOptions, onSave, onCancel }) {
  const initialParts = opt?.estimated_time_minutes != null ? minutesToParts(opt.estimated_time_minutes) : { hours: 0, minutes: 0 };
  const [form, setForm] = useState({
    trigger_field: opt?.trigger_field || TRIGGER_FIELDS[0].key,
    trigger_value: opt?.trigger_value || "",
    work_item_id: opt?.work_item_id || "",
    resource_type_id: opt?.resource_type_id || "",
    hours: initialParts.hours,
    minutes: initialParts.minutes,
    default_selected: opt?.default_selected !== false,
    is_active: opt?.is_active !== false,
    notes: opt?.notes || "",
    sort_order: opt?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const triggerFieldDef = TRIGGER_FIELDS.find(f => f.key === form.trigger_field);
  const isBoolean = BOOLEAN_FIELDS.includes(form.trigger_field);

  // Get dropdown options for non-boolean trigger fields from StationLogDropdownOptions
  const fieldOptions = dropdownOptions
    .filter(o => o.category === form.trigger_field && o.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const handleSave = async () => {
    if (!form.trigger_value.trim()) return alert("Trigger value is required.");
    if (!form.work_item_id) return alert("Work item is required.");
    const mins = timeToMinutes(form.hours, form.minutes);
    const workItem = workItems.find(w => w.id === form.work_item_id);
    const resource = resources.find(r => r.id === form.resource_type_id);
    const triggerLabel = TRIGGER_FIELDS.find(f => f.key === form.trigger_field)?.label || form.trigger_field;
    setSaving(true);
    const payload = {
      trigger_field: form.trigger_field,
      trigger_label: triggerLabel,
      trigger_value: form.trigger_value,
      work_item_id: form.work_item_id,
      work_item_name_snapshot: workItem?.work_name || "",
      estimated_time_minutes: mins,
      estimated_time_display: minutesToDisplay(mins),
      resource_type_id: form.resource_type_id || null,
      resource_type_name_snapshot: resource?.resource_name || "",
      default_selected: form.default_selected,
      is_active: form.is_active,
      notes: form.notes,
      sort_order: Number(form.sort_order),
    };
    if (opt?.id) {
      await base44.entities.StationLogWorkRules.update(opt.id, payload);
    } else {
      await base44.entities.StationLogWorkRules.create(payload);
    }
    setSaving(false);
    onSave();
  };

  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg m-2 space-y-3">
          <p className="text-xs font-bold text-blue-800 uppercase">{opt ? "Edit Work Rule" : "New Work Rule"}</p>
          <div className="grid grid-cols-3 gap-3">
            {/* Trigger Field */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Trigger Field *</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.trigger_field}
                onChange={e => setForm(f => ({ ...f, trigger_field: e.target.value, trigger_value: "" }))}>
                {TRIGGER_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>

            {/* Trigger Value */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Trigger Value *</label>
              {isBoolean ? (
                <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                  value={form.trigger_value}
                  onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}>
                  <option value="">— select —</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              ) : fieldOptions.length > 0 ? (
                <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                  value={form.trigger_value}
                  onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}>
                  <option value="">— select —</option>
                  {fieldOptions.map(o => <option key={o.id} value={o.value || o.label}>{o.label || o.value}</option>)}
                </select>
              ) : (
                <Input className="mt-1 h-8 text-sm" value={form.trigger_value}
                  onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}
                  placeholder="e.g. TYPE C3" />
              )}
            </div>

            {/* Work Item */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Work Item *</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.work_item_id}
                onChange={e => setForm(f => ({ ...f, work_item_id: e.target.value }))}>
                <option value="">— select —</option>
                {workItems.map(w => <option key={w.id} value={w.id}>{w.work_name}</option>)}
              </select>
            </div>

            {/* Estimated Time */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Estimated Time</label>
              <div className="flex gap-1 mt-1">
                <div className="flex-1">
                  <Input type="number" min={0} className="h-8 text-sm" placeholder="h"
                    value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
                  <p className="text-[10px] text-slate-400 mt-0.5 text-center">hours</p>
                </div>
                <div className="flex-1">
                  <Input type="number" min={0} max={59} className="h-8 text-sm" placeholder="m"
                    value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} />
                  <p className="text-[10px] text-slate-400 mt-0.5 text-center">minutes</p>
                </div>
                <div className="flex items-start pt-1">
                  <span className="text-xs bg-slate-100 border border-slate-200 rounded px-2 py-1 font-mono text-slate-700 whitespace-nowrap">
                    = {minutesToDisplay(timeToMinutes(form.hours, form.minutes))}
                  </span>
                </div>
              </div>
            </div>

            {/* Resource Type */}
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Resource Type</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.resource_type_id}
                onChange={e => setForm(f => ({ ...f, resource_type_id: e.target.value }))}>
                <option value="">— none —</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.resource_name}</option>)}
              </select>
            </div>

            {/* Default Selected + Sort */}
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
                <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={form.default_selected}
                  onChange={e => setForm(f => ({ ...f, default_selected: e.target.checked }))} />
                <span className="text-xs font-semibold text-slate-600">Default Selected in Stage 2</span>
              </label>
            </div>

            {/* Notes */}
            <div className="col-span-3">
              <label className="text-xs font-semibold text-slate-600 uppercase">Notes</label>
              <Input className="mt-1 h-8 text-sm" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save Rule"}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function TriggerFieldSection({ fieldDef, rules, workItems, resources, dropdownOptions, onEdit, onToggle, onDuplicate, onAddRule }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          <span className="text-sm font-bold text-slate-700">{fieldDef.label}</span>
          <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-semibold">{rules.length}</span>
          <span className="text-[10px] text-slate-400 font-mono">({fieldDef.key})</span>
        </div>
        <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2"
          onClick={e => { e.stopPropagation(); onAddRule(fieldDef.key); }}>
          <Plus className="h-3 w-3" /> Add Rule
        </Button>
      </button>

      {!collapsed && (
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Trigger Value</th>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Work Item</th>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Est. Time</th>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Resource</th>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Default</th>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Status</th>
              <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                  No rules yet. Click "Add Rule" to create one.
                </td>
              </tr>
            ) : rules.map(rule => (
              <tr key={rule.id} className={`hover:bg-slate-50 ${rule.is_active === false ? "opacity-50" : ""}`}>
                <td className="px-3 py-2 font-medium text-slate-700">{rule.trigger_value}</td>
                <td className="px-3 py-2 text-slate-700">{rule.work_item_name_snapshot || workItems.find(w => w.id === rule.work_item_id)?.work_name || "—"}</td>
                <td className="px-3 py-2 font-mono text-slate-600">{rule.estimated_time_display || minutesToDisplay(rule.estimated_time_minutes || 0)}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">{rule.resource_type_name_snapshot || resources.find(r => r.id === rule.resource_type_id)?.resource_name || "—"}</td>
                <td className="px-3 py-2">
                  <Badge className={rule.default_selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}>
                    {rule.default_selected ? "Yes" : "No"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge className={rule.is_active === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}>
                    {rule.is_active === false ? "Inactive" : "Active"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(rule)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                      title="Duplicate" onClick={() => onDuplicate(rule)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className={`h-7 w-7 p-0 ${rule.is_active === false ? "text-green-600" : "text-slate-400 hover:text-red-500"}`}
                      onClick={() => onToggle(rule)}>
                      {rule.is_active === false ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Stage2WorkRulesTab() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState(null); // null=none, "new_<field>"=new, rule obj=edit
  const [newRuleField, setNewRuleField] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["stationLogWorkRules"],
    queryFn: () => base44.entities.StationLogWorkRules.list(),
  });

  const { data: workItems = [] } = useQuery({
    queryKey: ["stationLogWorkItems"],
    queryFn: () => base44.entities.StationLogWorkItems.list(),
    select: d => d.filter(i => i.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["stationLogResourceTypes"],
    queryFn: () => base44.entities.StationLogResourceTypes.list(),
    select: d => d.filter(r => r.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  });

  const { data: dropdownOptions = [] } = useQuery({
    queryKey: ["stationLogDropdownOptions"],
    queryFn: () => base44.entities.StationLogDropdownOptions.list(),
  });

  // Seed rules when work items and resources are loaded but rules are empty
  const seedRulesIfEmpty = async () => {
    if (rules.length > 0 || workItems.length === 0 || resources.length === 0) return;
    const allWorkItems = await base44.entities.StationLogWorkItems.list();
    const allResources = await base44.entities.StationLogResourceTypes.list();
    const toCreate = SEED_RULES_TEMPLATES.map(t => {
      const wi = allWorkItems.find(w => w.work_name === t.work_item_name);
      const rt = allResources.find(r => r.resource_name === t.resource_name);
      if (!wi || !rt) return null;
      return {
        trigger_field: t.trigger_field,
        trigger_label: t.trigger_label,
        trigger_value: t.trigger_value,
        work_item_id: wi.id,
        work_item_name_snapshot: wi.work_name,
        estimated_time_minutes: t.estimated_time_minutes,
        estimated_time_display: minutesToDisplay(t.estimated_time_minutes),
        resource_type_id: rt.id,
        resource_type_name_snapshot: rt.resource_name,
        default_selected: t.default_selected,
        is_active: true,
        sort_order: 0,
      };
    }).filter(Boolean);
    if (toCreate.length > 0) {
      await base44.entities.StationLogWorkRules.bulkCreate(toCreate);
      queryClient.invalidateQueries({ queryKey: ["stationLogWorkRules"] });
    }
  };

  useEffect(() => {
    if (!rulesLoading) seedRulesIfEmpty();
  }, [rulesLoading, workItems.length, resources.length]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stationLogWorkRules"] });
    setEditingRule(null);
    setNewRuleField(null);
  };

  const handleToggle = async (rule) => {
    await base44.entities.StationLogWorkRules.update(rule.id, { is_active: !rule.is_active });
    refresh();
  };

  const handleDuplicate = async (rule) => {
    const { id, created_date, updated_date, created_by, ...rest } = rule;
    await base44.entities.StationLogWorkRules.create({ ...rest, is_active: true });
    refresh();
  };

  const getRulesForField = (fieldKey) => {
    return rules
      .filter(r => r.trigger_field === fieldKey && (showInactive || r.is_active !== false))
      .sort((a, b) => {
        const valCmp = (a.trigger_value || "").localeCompare(b.trigger_value || "");
        if (valCmp !== 0) return valCmp;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Work Rules</h3>
          <p className="text-xs text-slate-500">
            Define which works are suggested for each Stage 1 field value. Grouped by trigger field.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
          Show inactive
        </label>
      </div>

      {/* Info banner */}
      <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <strong>Settings only.</strong> These rules will be used by Stage 2 to suggest work items based on Stage 1 field values. No filtering or selection happens here.
      </div>

      {rulesLoading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
      ) : (
        <div className="space-y-3">
          {TRIGGER_FIELDS.map(fieldDef => {
            const fieldRules = getRulesForField(fieldDef.key);
            const isAddingHere = newRuleField === fieldDef.key;
            const editingHere = editingRule && editingRule !== "new" && editingRule.trigger_field === fieldDef.key;

            return (
              <div key={fieldDef.key} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">{fieldDef.label}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-semibold">{fieldRules.length}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({fieldDef.key})</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[11px] gap-1 px-2"
                    onClick={() => { setNewRuleField(fieldDef.key); setEditingRule(null); }}>
                    <Plus className="h-3 w-3" /> Add Rule
                  </Button>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-t border-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Trigger Value</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Work Item</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Est. Time</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Resource</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Default</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-bold text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {/* New rule form inline */}
                    {isAddingHere && (
                      <RuleForm
                        opt={{ trigger_field: fieldDef.key }}
                        workItems={workItems}
                        resources={resources}
                        dropdownOptions={dropdownOptions}
                        onSave={refresh}
                        onCancel={() => setNewRuleField(null)}
                      />
                    )}
                    {fieldRules.length === 0 && !isAddingHere ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-center text-xs text-slate-400">
                          No rules yet for this field. Click "Add Rule".
                        </td>
                      </tr>
                    ) : fieldRules.map(rule => (
                      editingRule?.id === rule.id ? (
                        <RuleForm
                          key={rule.id}
                          opt={rule}
                          workItems={workItems}
                          resources={resources}
                          dropdownOptions={dropdownOptions}
                          onSave={refresh}
                          onCancel={() => setEditingRule(null)}
                        />
                      ) : (
                        <tr key={rule.id} className={`hover:bg-slate-50 ${rule.is_active === false ? "opacity-50" : ""}`}>
                          <td className="px-3 py-2 font-medium text-slate-700">{rule.trigger_value}</td>
                          <td className="px-3 py-2 text-slate-700">{rule.work_item_name_snapshot || workItems.find(w => w.id === rule.work_item_id)?.work_name || "—"}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{rule.estimated_time_display || minutesToDisplay(rule.estimated_time_minutes || 0)}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">{rule.resource_type_name_snapshot || resources.find(r => r.id === rule.resource_type_id)?.resource_name || "—"}</td>
                          <td className="px-3 py-2">
                            <Badge className={rule.default_selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}>
                              {rule.default_selected ? "Yes" : "No"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={rule.is_active === false ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"}>
                              {rule.is_active === false ? "Inactive" : "Active"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingRule(rule); setNewRuleField(null); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                                title="Duplicate" onClick={() => handleDuplicate(rule)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost"
                                className={`h-7 w-7 p-0 ${rule.is_active === false ? "text-green-600" : "text-slate-400 hover:text-red-500"}`}
                                onClick={() => handleToggle(rule)}>
                                {rule.is_active === false ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}