import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PlanningRuleCategoryForm({ category, onSaved, onCancel, selectOptions = {} }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category_name: category?.category_name || "",
    description: category?.description || "",
    sort_order: category?.sort_order ?? 0,
  });

  const handleSave = async () => {
    if (!form.category_name.trim()) {
      alert("Category name is required");
      return;
    }

    setSaving(true);
    try {
      if (category?.id) {
        await base44.entities.StationLogPlanningRuleCategories.update(category.id, form);
      } else {
        await base44.entities.StationLogPlanningRuleCategories.create(form);
      }
      setSaving(false);
      onSaved();
    } catch (err) {
      setSaving(false);
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
      <h3 className="text-xs font-bold text-slate-600 uppercase">
        {category ? "Edit Category" : "New Category"}
      </h3>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Category Name *</label>
        <input
          type="text"
          className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={form.category_name}
          onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))}
          placeholder="e.g. RCA, Inspection, Execution"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Description</label>
        <textarea
          className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm h-12 focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={form.description || ""}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Optional description"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase">Sort Order</label>
        <input
          type="number"
          className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={form.sort_order}
          onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {saving ? "Saving..." : "Save Category"}
        </Button>
      </div>
    </div>
  );
}