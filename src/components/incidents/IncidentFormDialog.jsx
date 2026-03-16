import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useConfigLists } from "@/components/shared/useConfigLists";

const defaultStatuses = ["Open", "In Progress", "On Hold", "Resolved", "Closed"];
const defaultPriorities = ["Critical", "High", "Medium", "Low"];

export default function IncidentFormDialog({ open, onOpenChange, incident, onSave, defaultAssetId }) {
  const categories = useConfigLists("Incident Category");
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });

  const [form, setForm] = useState({
    incident_id: "", title: "", related_asset_id: "", related_asset_name: "",
    status: "Open", priority: "Medium", category: "", reported_date: "",
    assigned_to: "", description: ""
  });

  useEffect(() => {
    if (incident) {
      setForm({
        incident_id: incident.incident_id || "",
        title: incident.title || "",
        related_asset_id: incident.related_asset_id || "",
        related_asset_name: incident.related_asset_name || "",
        status: incident.status || "Open",
        priority: incident.priority || "Medium",
        category: incident.category || "",
        reported_date: incident.reported_date || "",
        assigned_to: incident.assigned_to || "",
        description: incident.description || "",
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      setForm({
        incident_id: "", title: "", related_asset_id: defaultAssetId || "", related_asset_name: "",
        status: "Open", priority: "Medium", category: "", reported_date: today,
        assigned_to: "", description: ""
      });
    }
  }, [incident, open, defaultAssetId]);

  const handleAssetChange = (assetId) => {
    const selectedAsset = assets.find(a => a.id === assetId);
    setForm(f => ({
      ...f,
      related_asset_id: assetId,
      related_asset_name: selectedAsset?.asset_name || ""
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{incident ? "Edit Incident" : "New Incident"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Incident ID *</Label>
              <Input value={form.incident_id} onChange={e => setForm(f => ({ ...f, incident_id: e.target.value }))} required disabled={!!incident} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Related Asset</Label>
            <Select value={form.related_asset_id} onValueChange={handleAssetChange}>
              <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_id} — {a.asset_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{defaultStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{defaultPriorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(categories.length ? categories : ["Equipment Failure", "Safety", "Environmental", "Operational"]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Reported Date</Label>
              <Input type="date" value={form.reported_date} onChange={e => setForm(f => ({ ...f, reported_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned To</Label>
              <Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{incident ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}