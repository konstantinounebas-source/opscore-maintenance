import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { minutesToDisplay } from "../settings/workrules/workRulesUtils";

export default function AddManualWorkDialog({ resources, onAdd, onClose }) {
  const [workName, setWorkName] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!workName.trim()) return alert("Work name is required.");
    if (!resourceId) return alert("Resource type is required.");
    const baseMinutes = hours * 60 + minutes;
    if (baseMinutes <= 0) return alert("Base time must be greater than 0 minutes.");
    const res = resources.find(r => r.id === resourceId);
    onAdd(workName.trim(), resourceId, res?.resource_name || "", baseMinutes, notes);
    onClose();
  };

  const displayTime = minutesToDisplay(hours * 60 + minutes);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-slate-800">Add Manual Work</p>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Work Name *</label>
            <Input
              className="mt-1 h-9 text-sm"
              placeholder="Describe the work…"
              value={workName}
              onChange={e => setWorkName(e.target.value)}
            />
          </div>

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

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Notes</label>
            <Input
              className="mt-1 h-9 text-sm"
              placeholder="Optional notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
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