import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAGE1_FIELDS } from "./workRulesUtils";

export default function CategoryForm({ opt, onSave, onCancel }) {
  const [form, setForm] = useState({
    category_name: opt?.category_name || "",
    description: opt?.description || "",
    linked_stage1_field: opt?.linked_stage1_field || "",
    field_type: opt?.field_type || "enum",
    sort_order: opt?.sort_order ?? 0,
    is_active: opt?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  // Auto-set field_type when Stage 1 field is selected
  const handleFieldChange = (key) => {
    const def = STAGE1_FIELDS.find(f => f.key === key);
    setForm(f => ({ ...f, linked_stage1_field: key, field_type: def?.field_type || "enum" }));
  };

  const handleSave = async () => {
    if (!form.category_name.trim()) return alert("Category name is required.");
    if (!form.linked_stage1_field) return alert("Linked Stage 1 field is required.");
    setSaving(true);
    if (opt?.id) {
      await base44.entities.StationLogWorkRuleCategories.update(opt.id, form);
    } else {
      await base44.entities.StationLogWorkRuleCategories.create({ ...form, is_active: true });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
      <p className="text-xs font-bold text-blue-800 uppercase">{opt ? "Edit Category" : "New Work Rule Category"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Category Name *</label>
          <Input className="mt-1 h-8 text-sm" value={form.category_name}
            onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))}
            placeholder="e.g. Shelter Type" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Linked Stage 1 Field *</label>
          <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
            value={form.linked_stage1_field} onChange={e => handleFieldChange(e.target.value)}>
            <option value="">— select field —</option>
            {STAGE1_FIELDS.map(f => (
              <option key={f.key} value={f.key}>{f.label} ({f.field_type})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Field Type</label>
          <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
            value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value }))}>
            <option value="enum">Enum / Dropdown</option>
            <option value="boolean">Boolean (Yes/No)</option>
            <option value="text">Text</option>
            <option value="number">Number</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
          <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600 uppercase">Description</label>
          <Input className="mt-1 h-8 text-sm" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="optional" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save Category"}
        </Button>
      </div>
    </div>
  );
}