import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfigLists } from "@/components/shared/useConfigLists";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChildFormDialog({ open, onOpenChange, child, parentAssetId, onSave }) {
  const categories = useConfigLists("Child Category");
  const types = useConfigLists("Child Type");

  const { data: allChildAssets = [] } = useQuery({
    queryKey: ["childAssets"],
    queryFn: () => base44.entities.ChildAssets.list(),
  });

  // Show only truly unassigned children (no parent), exclude those already in this asset
  const availableChildren = allChildAssets.filter(c => !c.parent_asset_id);

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

  const handleChildSelect = (childId) => {
    const selected = allChildAssets.find(c => c.child_id === childId);
    if (selected) {
      setForm({
        child_id: selected.child_id,
        category: selected.category || "",
        serial_number: selected.serial_number || "",
        installation_date: selected.installation_date || "",
        child_type: selected.child_type || "",
        _recordId: selected.id,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { _recordId, ...payload } = form;
    onSave({ ...payload, parent_asset_id: parentAssetId }, _recordId);
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
              {child ? (
                <Input value={form.child_id} disabled />
              ) : (
                <Select value={form.child_id} onValueChange={handleChildSelect} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select child..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChildren.map(c => (
                      <SelectItem key={c.child_id} value={c.child_id}>{c.child_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{child ? "Update" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}