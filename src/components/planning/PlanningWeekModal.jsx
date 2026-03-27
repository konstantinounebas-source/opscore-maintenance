import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2 } from "lucide-react";

const BLANK = {
  week_code: "",
  week_name: "",
  start_date: "",
  end_date: "",
  status: "Draft",
  is_active: false,
  notes: "",
};

export default function PlanningWeekModal({ open, onOpenChange, week, onSave, onDelete }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    if (week) {
      setForm({
        week_code: week.week_code || "",
        week_name: week.week_name || "",
        start_date: week.start_date || "",
        end_date: week.end_date || "",
        status: week.status || "Draft",
        is_active: week.is_active || false,
        notes: week.notes || "",
      });
    } else {
      setForm(BLANK);
    }
  }, [week, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.week_name || !form.start_date || !form.end_date) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(week.id);
    setDeleting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: 1000 }}>
        <DialogHeader>
          <DialogTitle>{week ? "Edit Planning Week" : "New Planning Week"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div>
            <Label className="text-xs">Week Name *</Label>
            <Input placeholder="Week 14 - April" value={form.week_name} onChange={e => set("week_name", e.target.value)} className="mt-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">End Date *</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="mt-1 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent style={{ zIndex: 1100 }}>
                  {["Draft", "Active", "Locked", "Archived"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
              <Label className="text-xs cursor-pointer">Set as Active Week</Label>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Optional notes..." value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1 text-sm" rows={2} />
          </div>
          <div className="flex justify-between items-center pt-1">
            {week && onDelete ? (
              <Button
                variant="outline"
                className={confirmDelete ? "border-red-500 text-red-600 hover:bg-red-50" : "text-red-500 hover:text-red-700 hover:border-red-300"}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                {confirmDelete ? "Confirm Delete" : "Delete Week"}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSave}
              disabled={saving || !form.week_name || !form.start_date || !form.end_date}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : week ? "Update" : "Create"}
            </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}