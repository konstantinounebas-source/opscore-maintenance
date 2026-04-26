import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";

export default function AddTemplateWorkDialog({ workItems, resources, rules = [], categories = [], triggerValues = [], onAdd, onClose }) {
  const [mode, setMode] = useState("rule"); // "rule" | "item"
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Build a readable label for each rule: "Category › Trigger Value › Work Item"
  const ruleOptions = rules.map(rule => {
    const cat = categories.find(c => c.id === rule.category_id);
    const tv = triggerValues.find(t => t.id === rule.trigger_value_id);
    const label = [
      cat?.category_name,
      tv?.display_label || tv?.trigger_value,
      rule.work_item_name_snapshot,
    ].filter(Boolean).join(" › ");
    return { id: rule.id, label, rule };
  });

  const handleRuleChange = (id) => {
    setSelectedRuleId(id);
    const found = rules.find(r => r.id === id);
    if (!found) return;
    setResourceId(found.resource_type_id || "");
    const totalMin = found.estimated_time_minutes || 0;
    setHours(Math.floor(totalMin / 60));
    setMinutes(totalMin % 60);
    // also set selectedItemId for reference
    setSelectedItemId(found.work_item_id || "");
  };

  const handleItemChange = (id) => {
    setSelectedItemId(id);
    const item = workItems.find(w => w.id === id);
    if (item?.default_resource_type_id) {
      setResourceId(item.default_resource_type_id);
    }
  };

  const handleAdd = () => {
    const baseMinutes = hours * 60 + minutes;
    if (mode === "rule") {
      if (!selectedRuleId) return alert("Please select a rule.");
      if (!resourceId) return alert("Resource type is required.");
      if (baseMinutes <= 0) return alert("Base time must be greater than 0.");
      const rule = rules.find(r => r.id === selectedRuleId);
      const item = workItems.find(w => w.id === rule?.work_item_id) || { id: rule?.work_item_id, work_name: rule?.work_item_name_snapshot };
      const res = resources.find(r => r.id === resourceId);
      onAdd(item, resourceId, res?.resource_name || rule?.resource_type_name_snapshot || "", baseMinutes);
    } else {
      if (!selectedItemId) return alert("Please select a work item.");
      if (!resourceId) return alert("Resource type is required.");
      if (baseMinutes <= 0) return alert("Base time must be greater than 0.");
      const item = workItems.find(w => w.id === selectedItemId);
      const res = resources.find(r => r.id === resourceId);
      onAdd(item, resourceId, res?.resource_name || "", baseMinutes);
    }
    onClose();
  };

  const displayTime = minutesToDisplay(hours * 60 + minutes);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-slate-800">Add Work from Template</p>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
          <button
            className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${mode === "rule" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setMode("rule")}
          >
            Select by Rule
          </button>
          <button
            className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-colors ${mode === "item" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setMode("item")}
          >
            Select by Work Item
          </button>
        </div>

        <div className="space-y-4">
          {mode === "rule" ? (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Rule *</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded px-2 py-2 text-sm bg-white"
                value={selectedRuleId}
                onChange={e => handleRuleChange(e.target.value)}
              >
                <option value="">— select rule —</option>
                {ruleOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              {selectedRuleId && (
                <p className="text-[10px] text-slate-400 mt-1">Resource and time auto-filled from rule. You can adjust below.</p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Work Item *</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded px-2 py-2 text-sm bg-white"
                value={selectedItemId}
                onChange={e => handleItemChange(e.target.value)}
              >
                <option value="">— select work item —</option>
                {workItems.map(w => (
                  <option key={w.id} value={w.id}>{w.work_name} {w.work_category ? `(${w.work_category})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Resource Type *</label>
            <select
              className="mt-1 w-full border border-slate-200 rounded px-2 py-2 text-sm bg-white"
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
            >
              <option value="">— select resource —</option>
              {resources.map(r => <option key={r.id} value={r.id}>{r.resource_name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Base Time *</label>
            <div className="flex gap-2 mt-1 items-center">
              <div className="flex-1">
                <input type="number" min={0} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Hours" value={hours} onChange={e => setHours(Number(e.target.value) || 0)} />
              </div>
              <span className="text-xs text-slate-400">h</span>
              <div className="flex-1">
                <input type="number" min={0} max={59} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
                  placeholder="Minutes" value={minutes} onChange={e => setMinutes(Number(e.target.value) || 0)} />
              </div>
              <span className="text-xs text-slate-400">m</span>
              <span className="text-xs font-mono bg-slate-100 border border-slate-200 rounded px-2 py-1 text-slate-700">{displayTime}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleAdd}>Add Work</Button>
        </div>
      </div>
    </div>
  );
}