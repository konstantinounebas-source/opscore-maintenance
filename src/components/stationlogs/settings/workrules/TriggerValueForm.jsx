import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TriggerValueForm({ categoryId, fieldType, dropdownOptions, linkedField, opt, onSave, onCancel }) {
  const [form, setForm] = useState({
    trigger_value: opt?.trigger_value || "",
    display_label: opt?.display_label || "",
    sort_order: opt?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const isBoolean = fieldType === "boolean";
  const enumOptions = dropdownOptions
    .filter(o => o.category === linkedField && o.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const hasEnumOptions = enumOptions.length > 0;

  const handleSave = async () => {
    if (!form.trigger_value.trim()) return alert("Trigger value is required.");
    setSaving(true);
    const payload = {
      category_id: categoryId,
      trigger_value: form.trigger_value,
      display_label: form.display_label || form.trigger_value,
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

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
      <p className="text-xs font-bold text-amber-800 uppercase">{opt ? "Edit Trigger Value" : "Add Trigger Value"}</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600 uppercase">Trigger Value *</label>
          {isBoolean ? (
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
              value={form.trigger_value} onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}>
              <option value="">— select —</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          ) : hasEnumOptions ? (
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
              value={form.trigger_value} onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}>
              <option value="">— select —</option>
              {enumOptions.map(o => <option key={o.id} value={o.value || o.label}>{o.label || o.value}</option>)}
            </select>
          ) : (
            <Input className="mt-1 h-8 text-sm" value={form.trigger_value}
              onChange={e => setForm(f => ({ ...f, trigger_value: e.target.value }))}
              placeholder="e.g. TYPE C3" />
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
          <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
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