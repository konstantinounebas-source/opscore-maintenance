import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TriggerValueForm({ categoryId, fieldType, dropdownOptions, linkedField, opt, existingTriggerValues = [], onSave, onCancel }) {
  const [form, setForm] = useState({
    trigger_value: opt?.trigger_value || "",
    display_label: opt?.display_label || "",
    sort_order: opt?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const isBoolean = fieldType === "boolean";
  const isEnum = fieldType === "enum" || (!fieldType && fieldType !== "text" && fieldType !== "number");
  const isText = fieldType === "text";
  const isNumber = fieldType === "number";

  // Filter dropdown options — category field in StationLogDropdownOptions matches linked_stage1_field
  const enumOptions = dropdownOptions
    .filter(o => o.category === linkedField && o.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const hasEnumOptions = enumOptions.length > 0;

  // When selecting from dropdown, auto-populate display_label
  const handleValueSelect = (val) => {
    const option = enumOptions.find(o => o.value === val);
    setForm(f => ({
      ...f,
      trigger_value: val,
      display_label: option?.label && option.label !== val ? option.label : f.display_label,
    }));
  };

  const canSave = isEnum ? hasEnumOptions : true;

  const handleSave = async () => {
    const trimmed = String(form.trigger_value).trim();
    if (!trimmed) return alert("Trigger value is required.");
    if (isEnum && !hasEnumOptions) return alert("Configure Stage 1 dropdown options first.");
    // Duplicate check within same category
    const duplicate = existingTriggerValues.find(tv =>
      tv.category_id === categoryId &&
      tv.trigger_value === trimmed &&
      tv.id !== opt?.id
    );
    if (duplicate) return alert(`Trigger value "${trimmed}" already exists in this category.`);
    setSaving(true);
    const payload = {
      category_id: categoryId,
      trigger_value: trimmed,
      display_label: form.display_label.trim() || trimmed,
      sort_order: Number(form.sort_order),
      is_active: true,
    };
    if (opt?.id) {
      await base44.entities.StationLogWorkRuleTriggerValues.update(opt.id, payload);
    } else {
      await base44.entities.StationLogWorkRuleTriggerValues.create(payload);
    }
    setSaving(false);
    onSave();
  };

  const renderValueInput = () => {
    if (isBoolean) {
      return (
        <>
          <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
            value={form.trigger_value} onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}>
            <option value="">— select —</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <p className="text-[10px] text-amber-700 mt-0.5">Stored as "true" / "false" to match Stage 1 boolean fields</p>
        </>
      );
    }
    if (isEnum) {
      if (!hasEnumOptions) {
        return (
          <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            ⚠ No Stage 1 options found for field <code className="font-mono">{linkedField}</code>.<br />
            Configure dropdown options in the <strong>Stage 1 — Order + Location</strong> section first.
          </div>
        );
      }
      return (
        <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
          value={form.trigger_value} onChange={e => handleValueSelect(e.target.value)}>
          <option value="">— select —</option>
          {enumOptions.map(o => <option key={o.id} value={o.value}>{o.label || o.value}</option>)}
        </select>
      );
    }
    if (isNumber) {
      return (
        <Input type="number" className="mt-1 h-8 text-sm" value={form.trigger_value}
          onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}
          placeholder="e.g. 3" />
      );
    }
    // text (default)
    return (
      <Input className="mt-1 h-8 text-sm" value={form.trigger_value}
        onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}
        placeholder="Enter value" />
    );
  };

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
      <p className="text-xs font-bold text-amber-800 uppercase">{opt ? "Edit Trigger Value" : "Add Trigger Value"}</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Trigger Value *</label>
          {renderValueInput()}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Display Label</label>
          <Input className="mt-1 h-8 text-sm" value={form.display_label}
            onChange={e => setForm(f => ({ ...f, display_label: e.target.value }))}
            placeholder="Friendly name (optional)" />
          <p className="text-[10px] text-slate-400 mt-0.5">Shown in UI — defaults to trigger value</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
          <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" disabled={saving || !canSave} onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}