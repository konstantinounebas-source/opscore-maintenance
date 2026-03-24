import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Trash2 } from "lucide-react";
import { computePriorityBucket, computePinColor } from "./planningUtils";

const BLANK = {
  assignment_type: "Make Safe",
  assignment_status: "Planned",
  priority_bucket: "",
  team_name: "",
  assigned_to: "",
  route_zone: "",
  notes: "",
  source_incident_id: "",
  source_work_order_id: "",
};

export default function AssignAssetModal({ open, onOpenChange, asset, week, existingAssignment, incidents, workOrders, onSave, onDelete }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existingAssignment) {
      setForm({
        assignment_type:    existingAssignment.assignment_type    || "Make Safe",
        assignment_status:  existingAssignment.assignment_status  || "Planned",
        priority_bucket:    existingAssignment.priority_bucket    || "",
        team_name:          existingAssignment.team_name          || "",
        assigned_to:        existingAssignment.assigned_to        || "",
        route_zone:         existingAssignment.route_zone         || "",
        notes:              existingAssignment.notes              || "",
        source_incident_id: existingAssignment.source_incident_id || "",
        source_work_order_id: existingAssignment.source_work_order_id || "",
      });
    } else {
      setForm(BLANK);
    }
    setConfirmDelete(false);
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

  const assetIncidents = incidents.filter(i => i.related_asset_id === asset?.id);
  const assetWOs = workOrders.filter(w => w.related_asset_id === asset?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" style={{ zIndex: 1000 }}>
        <DialogHeader>
          <DialogTitle>{existingAssignment ? "Edit Assignment" : "Assign Asset to Week"}</DialogTitle>
        </DialogHeader>

        {asset && (
          <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-xs text-slate-600 border mb-1 space-y-0.5">
            <div><span className="font-medium">Asset:</span> {asset.asset_id} — {asset.asset_name}</div>
            <div><span className="font-medium">Week:</span> {week?.week_name} ({week?.week_code})</div>
          </div>
        )}

        <Tabs defaultValue="assignment">
          <TabsList className="w-full">
            <TabsTrigger value="assignment" className="flex-1 text-xs">Assignment</TabsTrigger>
            <TabsTrigger value="team" className="flex-1 text-xs">Team & Zone</TabsTrigger>
            <TabsTrigger value="links" className="flex-1 text-xs">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="assignment" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Assignment Type</Label>
                <Select value={form.assignment_type} onValueChange={v => set("assignment_type", v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Make Safe", "Corrective"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.assignment_status} onValueChange={v => set("assignment_status", v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Planned", "In Progress", "Completed", "Deferred"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Priority Bucket</Label>
              <Select value={form.priority_bucket || "auto"} onValueChange={v => set("priority_bucket", v === "auto" ? "" : v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Auto from source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto from linked source</SelectItem>
                  {["P1", "P2"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">If "Auto", priority is derived from any linked incident or work order.</p>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Assignment notes..." value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="text-sm mt-1" rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-3 pt-3">
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
            <div>
              <Label className="text-xs">Route Zone</Label>
              <Input placeholder="e.g. Zone A, North District" value={form.route_zone} onChange={e => set("route_zone", e.target.value)} className="text-sm mt-1" />
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-3 pt-3">
            {assetIncidents.length === 0 && assetWOs.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No incidents or work orders linked to this asset.</p>
            )}
            {assetIncidents.length > 0 && (
              <div>
                <Label className="text-xs">Link to Incident (optional)</Label>
                <Select value={form.source_incident_id || "none"} onValueChange={v => set("source_incident_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select incident..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {assetIncidents.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.incident_id} — {i.title} ({i.status})</SelectItem>
                    ))}
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
                    {assetWOs.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.work_order_id} — {w.title} ({w.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 gap-2">
          {existingAssignment && onDelete && (
            <div className="flex items-center gap-2">
              {!confirmDelete ? (
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1.5 text-xs"
                  onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              ) : (
                <>
                  <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                  <Button variant="destructive" size="sm" className="text-xs h-7" disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      await onDelete(existingAssignment.id);
                      setDeleting(false);
                      onOpenChange(false);
                    }}>
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Delete"}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="flex gap-2 ml-auto">
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