import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfigLists } from "@/components/shared/useConfigLists";

export default function ChildFormDialog({ open, onOpenChange, child, parentAssetId, onSave }) {
  const categories = useConfigLists("Child Category");
  const types = useConfigLists("Child Type");

  const [form, setForm] = useState({
    child_id: "", category: "", serial_number: "", installation_date: "", child_type: ""
  });

  useEffect(() => {
    if (child) {
      setForm({
        child_id: child.child_id || "",
        category: child.category || "",
        serial_number: child.serial_number || "",
        installation_date: child.installation_date || "",
        child_type: child.child_type || "",
      });
    } else {
      setForm({ child_id: "", category: "", serial_number: "", installation_date: "", child_type: "" });
    }
  }, [child, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, parent_asset_id: parentAssetId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{child ? "Edit Child" : "Add Child"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Child ID *</Label>
              <Input value={form.child_id} onChange={e => setForm(f => ({ ...f, child_id: e.target.value }))} required disabled={!!child} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Serial Number *</Label>
              <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(categories.length ? categories : ["Component", "Spare Part", "Accessory"]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.child_type} onValueChange={v => setForm(f => ({ ...f, child_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(types.length ? types : ["Primary", "Secondary", "Auxiliary"]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Installation Date</Label>
            <Input type="date" value={form.installation_date} onChange={e => setForm(f => ({ ...f, installation_date: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{child ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}