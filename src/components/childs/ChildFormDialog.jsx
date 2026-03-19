import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmCloseDialog from "@/components/shared/ConfirmCloseDialog";

const emptyForm = {
  child_id: "",
  parent_asset_id: "",
  category: "",
  serial_number: "",
  installation_date: "",
  child_type: "",
  status: "",
};

export default function ChildFormDialog({ open, onOpenChange, child, onSave, parentAssets }) {
  const [form, setForm] = useState(emptyForm);
  const [confirmClose, setConfirmClose] = useState(false);

  const { data: configLists = [] } = useQuery({
    queryKey: ["configLists"],
    queryFn: () => base44.entities.ConfigLists.list(),
  });

  const statusOptions = configLists.filter(i => i.list_type === "Child Status" && i.is_active);

  useEffect(() => {
    if (child) {
      setForm(child);
    } else {
      setForm(emptyForm);
    }
  }, [child, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onOpenChange(false);
  };

  return (
    <>
    <ConfirmCloseDialog
      open={confirmClose}
      onCancel={() => setConfirmClose(false)}
      onConfirm={() => { setConfirmClose(false); onOpenChange(false); }}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={e => { e.preventDefault(); setConfirmClose(true); }}>
        <DialogHeader>
          <DialogTitle>{child ? "Edit Child Asset" : "Create Child Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Child ID *</Label>
            <Input value={form.child_id} onChange={e => set("child_id", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Serial Number *</Label>
            <Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Input value={form.category} onChange={e => set("category", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Child Type</Label>
            <Input value={form.child_type} onChange={e => set("child_type", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Installation Date</Label>
            <Input type="date" value={form.installation_date} onChange={e => set("installation_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.length > 0
                  ? statusOptions.map(s => <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>)
                  : <>
                      <SelectItem value="Assigned">Assigned</SelectItem>
                      <SelectItem value="Un-Assigned">Un-Assigned</SelectItem>
                    </>
                }
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parent Asset</Label>
            <Select value={form.parent_asset_id} onValueChange={v => set("parent_asset_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Unassigned</SelectItem>
                {parentAssets.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.asset_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setConfirmClose(true)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{child ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}