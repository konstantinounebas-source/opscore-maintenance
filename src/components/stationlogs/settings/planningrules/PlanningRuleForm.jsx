import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  APPLIES_WHEN_OPERATORS,
  PLANNING_ITEM_TYPES,
  BASE_DATE_TYPES,
  OFFSET_DIRECTIONS,
} from "./planningRulesUtils";

export default function PlanningRuleForm({ rule, categoryId, rules = [], onSaved, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category_id: categoryId,
    rule_name: rule?.rule_name || "",
    description: rule?.description || "",
    applies_when_field: rule?.applies_when_field || "always",
    applies_when_operator: rule?.applies_when_operator || "exists",
    applies_when_value: rule?.applies_when_value || "",
    planning_item_name: rule?.planning_item_name || "",
    planning_item_type: rule?.planning_item_type || "Deadline",
    base_date_type: rule?.base_date_type || "Work Start Date",
    base_planning_rule_id: rule?.base_planning_rule_id || "",
    offset_direction: rule?.offset_direction || "Before",
    offset_days: rule?.offset_days ?? 0,
    use_working_days: rule?.use_working_days !== false,
    required: rule?.required !== false,
    notes: rule?.notes || "",
    sort_order: rule?.sort_order ?? 0,
  });

  const handleSave = async () => {
    if (!form.rule_name.trim()) {
      alert("Rule name is required");
      return;
    }
    if (!form.planning_item_name.trim()) {
      alert("Planning item name is required");
      return;
    }
    if (form.offset_days < 0) {
      alert("Offset days cannot be negative");
      return;
    }
    if (form.base_date_type === "Another Planning Item" && !form.base_planning_rule_id) {
      alert("Base planning rule ID is required when base date type is 'Another Planning Item'");
      return;
    }

    // Check for duplicate rule_name in same category
    if (!rule?.id) {
      const duplicate = rules.find(r => r.category_id === categoryId && r.rule_name === form.rule_name);
      if (duplicate) {
        alert("A rule with this name already exists in this category");
        return;
      }
    }

    setSaving(true);
    try {
      if (rule?.id) {
        await base44.entities.StationLogPlanningRules.update(rule.id, form);
      } else {
        await base44.entities.StationLogPlanningRules.create(form);
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
              <input
                type="text"
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.applies_when_field}
                onChange={e => setForm(f => ({ ...f, applies_when_field: e.target.value }))}
                placeholder="e.g. always, requires_rca, risk_level"
              />
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

        {/* Date Calculation Section */}
        <div className="col-span-2 p-2 bg-white border border-slate-100 rounded">
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Date Calculation</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Base Date Type *</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form.base_date_type}
                onChange={e => setForm(f => ({ ...f, base_date_type: e.target.value, base_planning_rule_id: "" }))}
              >
                {BASE_DATE_TYPES.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            {form.base_date_type === "Another Planning Item" && (
              <div>
                <label className="text-xs font-semibold text-slate-500">Base Planning Rule ID</label>
                <input
                  type="text"
                  className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={form.base_planning_rule_id}
                  onChange={e => setForm(f => ({ ...f, base_planning_rule_id: e.target.value }))}
                  placeholder="Rule ID to reference"
                />
              </div>
            )}

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