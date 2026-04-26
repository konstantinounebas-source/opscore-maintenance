import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle } from "lucide-react";
import {
  APPLIES_WHEN_OPERATORS,
  APPLIES_WHEN_FIELDS,
  PLANNING_ITEM_TYPES,
  OFFSET_DIRECTIONS,
  WORKFLOW_STAGES,
  getAvailableBaseDateOptions,
  inferBaseDateKeyFromType,
} from "./planningRulesUtils";

export default function PlanningRuleForm({ rule, categoryId, rules = [], onSaved, onCancel }) {
  const [saving, setSaving] = useState(false);
  
  // Backwards compatibility: infer base_date_key from old base_date_type if needed
  const inferredBaseDateKey = rule?.base_date_key || inferBaseDateKeyFromType(rule?.base_date_type) || "work_start_date";
  
  const [form, setForm] = useState({
    category_id: categoryId,
    rule_name: rule?.rule_name || "",
    description: rule?.description || "",
    applies_when_field: rule?.applies_when_field || "always",
    applies_when_operator: rule?.applies_when_operator || "exists",
    applies_when_value: rule?.applies_when_value || "",
    planning_item_name: rule?.planning_item_name || "",
    planning_item_type: rule?.planning_item_type || "Deadline",
    output_date_key: rule?.output_date_key || "",
    output_flow_stage_id: rule?.output_flow_stage_id || "",
    base_date_type: rule?.base_date_type || "Work Start Date",
    base_date_key: inferredBaseDateKey,
    base_planning_rule_id: rule?.base_planning_rule_id || "",
    offset_direction: rule?.offset_direction || "Before",
    offset_days: rule?.offset_days ?? 0,
    use_working_days: rule?.use_working_days !== false,
    required: rule?.required !== false,
    notes: rule?.notes || "",
    sort_order: rule?.sort_order ?? 0,
  });
  
  const availableBaseDates = getAvailableBaseDateOptions(rules);

  const handleSave = async () => {
    if (!form.rule_name.trim()) {
      alert("Rule name is required");
      return;
    }
    if (!form.planning_item_name.trim()) {
      alert("Planning item name is required");
      return;
    }
    if (!form.output_date_key.trim()) {
      alert("Output Date Key is required");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(form.output_date_key)) {
      alert("Output Date Key must be lowercase snake_case (e.g. rca_approval_deadline)");
      return;
    }
    if (!form.output_flow_stage_id) {
      alert("Output Flow Stage is required");
      return;
    }
    if (!form.base_date_key.trim()) {
      alert("Base Date is required");
      return;
    }
    if (form.offset_days < 0) {
      alert("Offset days cannot be negative");
      return;
    }

    // Check for duplicate output_date_key
    if (!rule?.id) {
      const duplicate = rules.find(r => r.output_date_key === form.output_date_key);
      if (duplicate) {
        alert("A rule with this Output Date Key already exists");
        return;
      }
    }

    // Check for duplicate rule_name in same category
    if (!rule?.id) {
      const duplicate = rules.find(r => r.category_id === categoryId && r.rule_name === form.rule_name);
      if (duplicate) {
        alert("A rule with this name already exists in this category");
        return;
      }
    }

    // Prepare data for save
    const formData = {
      ...form,
      output_flow_stage_name: WORKFLOW_STAGES.find(s => s.id === Number(form.output_flow_stage_id))?.name || ""
    };

    setSaving(true);
    try {
      if (rule?.id) {
        await base44.entities.StationLogPlanningRules.update(rule.id, formData);
      } else {
        await base44.entities.StationLogPlanningRules.create(formData);
      }
      setSaving(false);
      onSaved();
    } catch (err) {
      setSaving(false);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-xs font-bold text-blue-800 uppercase">
        {rule ? "Edit Rule" : "New Planning Rule"}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Rule Name *</label>
          <input
            type="text"
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.rule_name}
            onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))}
            placeholder="e.g. Inspection Planning Due"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
          <textarea
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm h-10 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>

        {/* Applies When Section */}
         <div className="col-span-2 p-2 bg-white border border-slate-100 rounded">
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Applies When</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Field</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.applies_when_field}
                onChange={e => setForm(f => ({ ...f, applies_when_field: e.target.value }))}
              >
                {APPLIES_WHEN_FIELDS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">Operator</label>
                <select
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={form.applies_when_operator}
                  onChange={e => setForm(f => ({ ...f, applies_when_operator: e.target.value }))}
                >
                  {APPLIES_WHEN_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Value</label>
                <input
                  type="text"
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={form.applies_when_value}
                  onChange={e => setForm(f => ({ ...f, applies_when_value: e.target.value }))}
                  placeholder="e.g. true, High"
                  disabled={["exists", "not_exists"].includes(form.applies_when_operator)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Planning Item Section */}
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Planning Item Name *</label>
          <input
            type="text"
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.planning_item_name}
            onChange={e => setForm(f => ({ ...f, planning_item_name: e.target.value }))}
            placeholder="e.g. Inspection Planning Due"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase">Item Type *</label>
          <select
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.planning_item_type}
            onChange={e => setForm(f => ({ ...f, planning_item_type: e.target.value }))}
          >
            {PLANNING_ITEM_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Output Section */}
        <div className="col-span-2 p-2 bg-white border border-slate-100 rounded">
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Output</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                Output Date Key *
                <span title="Unique key produced by this rule (e.g. rca_approval_deadline)">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                </span>
              </label>
              <input
                type="text"
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                value={form.output_date_key}
                onChange={e => setForm(f => ({ ...f, output_date_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))}
                placeholder="e.g. rca_approval_deadline"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Must be lowercase snake_case. This key can be used by other rules.</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                Flow Stage *
                <span title="Select which workflow stage this planning date belongs to">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                </span>
              </label>
              <select
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.output_flow_stage_id}
                onChange={e => setForm(f => ({ ...f, output_flow_stage_id: Number(e.target.value) }))}
              >
                <option value="">— Select Stage —</option>
                {WORKFLOW_STAGES.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.id}. {stage.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date Calculation Section */}
         <div className="col-span-2 p-2 bg-white border border-slate-100 rounded">
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Date Calculation</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                Base Date *
                <span title="Select which date this rule depends on">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                </span>
              </label>
              <select
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.base_date_key}
                onChange={e => setForm(f => ({ ...f, base_date_key: e.target.value }))}
              >
                <option value="">— Select Base Date —</option>
                {availableBaseDates.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.items.map(item => (
                      <option key={item.key} value={item.key}>
                        {item.name} ({`Stage ${item.stage}`})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">Direction *</label>
                <select
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={form.offset_direction}
                  onChange={e => setForm(f => ({ ...f, offset_direction: e.target.value }))}
                >
                  {OFFSET_DIRECTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Offset Days *</label>
                <input
                  type="number"
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={form.offset_days}
                  onChange={e => setForm(f => ({ ...f, offset_days: Math.max(0, Number(e.target.value)) }))}
                  min="0"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={form.use_working_days}
                    onChange={e => setForm(f => ({ ...f, use_working_days: e.target.checked }))}
                  />
                  <span className="text-xs font-semibold text-slate-500">Working Days</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-2 flex items-center gap-4 p-2 bg-white border border-slate-100 rounded">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={form.required}
              onChange={e => setForm(f => ({ ...f, required: e.target.checked }))}
            />
            <span className="text-xs font-semibold text-slate-500">Required</span>
          </label>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
          <textarea
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm h-10 focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes about this rule"
          />
        </div>

        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Sort Order</label>
          <input
            type="number"
            className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {saving ? "Saving..." : "Save Rule"}
        </Button>
      </div>
    </div>
  );
}