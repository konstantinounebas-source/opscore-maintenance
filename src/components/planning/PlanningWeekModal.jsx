import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const EMPTY = {
  week_code: "",
  week_name: "",
  start_date: "",
  end_date: "",
  status: "Draft",
  map_view_mode: "Default",
  color_code: "",
  notes: "",
  is_active: true,
};

export default function PlanningWeekModal({ open, onOpenChange, week, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(week ? { ...EMPTY, ...week } : EMPTY);
  }, [week, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.week_code || !form.week_name || !form.start_date || !form.end_date) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{week ? "Edit Planning Week" : "New Planning Week"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Week Code *</Label>
              <Input placeholder="e.g. W2026-12" value={form.week_code} onChange={e => set("week_code", e.target.value)} className="text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Week Name *</Label>
              <Input placeholder="e.g. Week 12 — March" value={form.week_name} onChange={e => set("week_name", e.target.value)} className="text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">End Date *</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Draft", "Active", "Locked", "Archived"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Map View Mode</Label>
              <Select value={form.map_view_mode} onValueChange={v => set("map_view_mode", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Default", "Inspection", "Priority", "Custom"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Optional notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="text-sm mt-1" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave}
              disabled={saving || !form.week_code || !form.week_name || !form.start_date || !form.end_date}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}