import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfigLists } from "@/components/shared/useConfigLists";

const defaultStatuses = ["Active", "Inactive", "Under Maintenance", "Decommissioned", "Pending"];

export default function AssetFormDialog({ open, onOpenChange, asset, onSave }) {
  const categories = useConfigLists("Asset Category");
  const types = useConfigLists("Asset Type");

  const [form, setForm] = useState({
    asset_id: "", asset_name: "", category: "", asset_type: "", status: "Active",
    installation_date: "", location: "", description: ""
  });

  useEffect(() => {
    if (asset) {
      setForm({
        asset_id: asset.asset_id || "",
        asset_name: asset.asset_name || "",
        category: asset.category || "",
        asset_type: asset.asset_type || "",
        status: asset.status || "Active",
        installation_date: asset.installation_date || "",
        location: asset.location || "",
        description: asset.description || "",
      });
    } else {
      setForm({ asset_id: "", asset_name: "", category: "", asset_type: "", status: "Active", installation_date: "", location: "", description: "" });
    }
  }, [asset, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset ID *</Label>
              <Input value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} required disabled={!!asset} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Name *</Label>
              <Input value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(categories.length ? categories : ["Electrical", "Mechanical", "Structural", "Plumbing"]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(types.length ? types : ["Equipment", "Vehicle", "Building", "Infrastructure"]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {defaultStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Installation Date</Label>
              <Input type="date" value={form.installation_date} onChange={e => setForm(f => ({ ...f, installation_date: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Location</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{asset ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}