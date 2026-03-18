import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { computePriorityBucket, computePinColor } from "./planningUtils";

export default function AssignAssetModal({ open, onOpenChange, asset, week, existingAssignment, incidents, workOrders, onSave }) {
  const [form, setForm] = useState({
    assignment_type: "Inspection",
    assignment_status: "Planned",
    priority_bucket: "",
    team_name: "",
    assigned_to: "",
    route_zone: "",
    notes: "",
    source_incident_id: "",
    source_work_order_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingAssignment) {
      setForm({
        assignment_type: existingAssignment.assignment_type || "Inspection",
        assignment_status: existingAssignment.assignment_status || "Planned",
        priority_bucket: existingAssignment.priority_bucket || "",
        team_name: existingAssignment.team_name || "",
        assigned_to: existingAssignment.assigned_to || "",
        route_zone: existingAssignment.route_zone || "",
        notes: existingAssignment.notes || "",
        source_incident_id: existingAssignment.source_incident_id || "",
        source_work_order_id: existingAssignment.source_work_order_id || "",
      });
    } else {
      setForm({ assignment_type: "Inspection", assignment_status: "Planned", priority_bucket: "", team_name: "", assigned_to: "", route_zone: "", notes: "", source_incident_id: "", source_work_order_id: "" });
    }
  }, [existingAssignment, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!asset || !week) return;
    setSaving(true);
    const linkedIncident = incidents.find(i => i.id === form.source_incident_id);
    const linkedWO = workOrders.find(w => w.id === form.source_work_order_id);
    const bucket = form.priority_bucket || computePriorityBucket(linkedIncident, linkedWO);
    const pinColor = computePinColor(bucket, form.assignment_status);
    await onSave({
      ...form,
      planning_week_id: week.id,
      asset_id: asset.id,
      priority_bucket: bucket,
      pin_color: pinColor,
    }, existingAssignment?.id);
    setSaving(false);
    onOpenChange(false);
  };

  // Related incidents & WOs for this asset
  const assetIncidents = incidents.filter(i => i.related_asset_id === asset?.id);
  const assetWOs = workOrders.filter(w => w.related_asset_id === asset?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingAssignment ? "Edit Assignment" : "Assign Asset to Week"}</DialogTitle>
        </DialogHeader>
        {asset && (
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-xs text-slate-600 border mb-2 space-y-0.5">
            <div><span className="font-medium">Asset:</span> {asset.asset_id} — {asset.asset_name}</div>
            <div><span className="font-medium">Week:</span> {week?.week_name} ({week?.week_code})</div>
          </div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Assignment Type</Label>
              <Select value={form.assignment_type} onValueChange={v => set("assignment_type", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Inspection", "Preventive", "Corrective", "Review", "Mixed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.assignment_status} onValueChange={v => set("assignment_status", v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Planned", "In Progress", "Completed", "Deferred", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority Bucket</Label>
              <Select value={form.priority_bucket || "auto"} onValueChange={v => set("priority_bucket", v === "auto" ? "" : v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Auto from source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto from source</SelectItem>
                  {["P1", "P2", "Critical", "High", "Medium", "Low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Route Zone</Label>
              <Input placeholder="e.g. Zone A" value={form.route_zone} onChange={e => set("route_zone", e.target.value)} className="text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Assigned To</Label>
              <Input placeholder="Technician name..." value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} className="text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Team Name</Label>
              <Input placeholder="Team name..." value={form.team_name} onChange={e => set("team_name", e.target.value)} className="text-sm mt-1" />
            </div>
          </div>
          {assetIncidents.length > 0 && (
            <div>
              <Label className="text-xs">Link to Incident (optional)</Label>
              <Select value={form.source_incident_id || "none"} onValueChange={v => set("source_incident_id", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select incident..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {assetIncidents.map(i => <SelectItem key={i.id} value={i.id}>{i.incident_id} — {i.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {assetWOs.length > 0 && (
            <div>
              <Label className="text-xs">Link to Work Order (optional)</Label>
              <Select value={form.source_work_order_id || "none"} onValueChange={v => set("source_work_order_id", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select work order..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {assetWOs.map(w => <SelectItem key={w.id} value={w.id}>{w.work_order_id} — {w.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea placeholder="Assignment notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="text-sm mt-1" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving || !asset || !week}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : existingAssignment ? "Update" : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}