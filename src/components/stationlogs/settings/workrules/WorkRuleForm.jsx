import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { timeToMinutes, minutesToDisplay, minutesToParts } from "./workRulesUtils";

export default function WorkRuleForm({ categoryId, triggerValueId, triggerField, triggerValue, workItems, resources, existingRules = [], opt, onSave, onCancel }) {
  const initialParts = opt?.estimated_time_minutes != null ? minutesToParts(opt.estimated_time_minutes) : { hours: 0, minutes: 0 };
  const [form, setForm] = useState({
    work_item_id: opt?.work_item_id || "",
    resource_type_id: opt?.resource_type_id || "",
    hours: initialParts.hours,
    minutes: initialParts.minutes,
    default_selected: opt?.default_selected !== false,
    notes: opt?.notes || "",
    sort_order: opt?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.work_item_id) return alert("Work item is required.");
    if (!form.resource_type_id) return alert("Resource type is required.");
    const mins = timeToMinutes(form.hours, form.minutes);
    if (mins === 0) return alert("Estimated time is required (hours + minutes must be > 0).");
    // Duplicate check: same work_item_id under same trigger_value_id
    const duplicate = existingRules.find(r =>
      r.trigger_value_id === triggerValueId &&
      r.work_item_id === form.work_item_id &&
      r.id !== opt?.id
    );
    if (duplicate) return alert(`Work item "${workItems.find(w => w.id === form.work_item_id)?.work_name}" already exists under this trigger value.`);
    const workItem = workItems.find(w => w.id === form.work_item_id);
    const resource = resources.find(r => r.id === form.resource_type_id);
    setSaving(true);
    const payload = {
      category_id: categoryId,
      trigger_value_id: triggerValueId,
      trigger_field: triggerField,
      trigger_value: triggerValue,
      work_item_id: form.work_item_id,
      work_item_name_snapshot: workItem?.work_name || "",
      estimated_time_minutes: mins,
      estimated_time_display: minutesToDisplay(mins),
      resource_type_id: form.resource_type_id || null,
      resource_type_name_snapshot: resource?.resource_name || "",
      default_selected: form.default_selected,
      is_active: true,
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

  const displayTime = minutesToDisplay(timeToMinutes(form.hours, form.minutes));

  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg m-2 space-y-3">
          <p className="text-xs font-bold text-blue-800 uppercase">{opt ? "Edit Work Rule" : "Add Work Rule"}</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Work Item *</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.work_item_id} onChange={e => setForm(f => ({ ...f, work_item_id: e.target.value }))}>
                <option value="">— select —</option>
                {workItems.map(w => <option key={w.id} value={w.id}>{w.work_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Resource Type *</label>
              <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
                value={form.resource_type_id} onChange={e => setForm(f => ({ ...f, resource_type_id: e.target.value }))}>
                <option value="">— select resource —</option>
                {resources.map(r => <option key={r.id} value={r.id}>{r.resource_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Estimated Time *</label>
              <div className="flex gap-1 mt-1">
                <div className="flex-1">
                  <Input type="number" min={0} className="h-8 text-sm" placeholder="h"
                    value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
                  <p className="text-[10px] text-slate-400 text-center">h</p>
                </div>
                <div className="flex-1">
                  <Input type="number" min={0} max={59} className="h-8 text-sm" placeholder="m"
                    value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} />
                  <p className="text-[10px] text-slate-400 text-center">m</p>
                </div>
                <div className="flex items-start pt-1">
                  <span className="text-xs bg-slate-100 border border-slate-200 rounded px-1.5 py-1 font-mono text-slate-700">{displayTime}</span>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Notes</label>
              <Input className="mt-1 h-8 text-sm" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="optional" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Sort Order</label>
              <Input type="number" className="mt-1 h-8 text-sm" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="default_sel" checked={form.default_selected}
                onChange={e => setForm(f => ({ ...f, default_selected: e.target.checked }))} />
              <label htmlFor="default_sel" className="text-xs font-semibold text-slate-600 cursor-pointer">Default Selected</label>
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