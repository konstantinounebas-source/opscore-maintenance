import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
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

const BLANK_WEEK = { week_name: "", week_code: "", start_date: "", end_date: "" };

export default function AssignAssetModal({ open, onOpenChange, asset, week, weeks = [], existingAssignment, incidents, workOrders, onSave, onDelete, onWeekCreated }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Week creation
  const [newWeek, setNewWeek] = useState(BLANK_WEEK);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [weekCreateOpen, setWeekCreateOpen] = useState(false);
  const [createdWeek, setCreatedWeek] = useState(null); // the week to assign to after creation

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
    setNewWeek(BLANK_WEEK);
    setWeekCreateOpen(false);
    setCreatedWeek(null);
    setConfirmDelete(false);
  }, [existingAssignment, open, week]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setWk = (k, v) => setNewWeek(f => ({ ...f, [k]: v }));

  // When editing, use the existing assignment's week; otherwise use a newly created week or the prop week
  const resolvedWeek = createdWeek || week;

  const handleCreateWeek = async () => {
    if (!newWeek.week_name || !newWeek.week_code || !newWeek.start_date || !newWeek.end_date) return;
    setCreatingWeek(true);
    const created = await base44.entities.PlanningWeeks.create({ ...newWeek, status: "Draft" });
    setCreatedWeek(created);
    setWeekCreateOpen(false);
    setCreatingWeek(false);
    if (onWeekCreated) onWeekCreated(created);
  };

  const handleSave = async () => {
    if (!asset || !resolvedWeek) return;
    setSaving(true);
    const linkedIncident = incidents.find(i => i.id === form.source_incident_id);
    const linkedWO = workOrders.find(w => w.id === form.source_work_order_id);
    const bucket = form.priority_bucket || computePriorityBucket(linkedIncident, linkedWO);
    const pinColor = computePinColor(bucket, form.assignment_status);
    await onSave({
      ...form,
      planning_week_id: resolvedWeek.id,
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
          <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-xs text-slate-600 border mb-1 space-y-1.5">
            <div><span className="font-medium">Asset:</span> {asset.asset_id} — {asset.asset_name}</div>

            {/* Week display / creation */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">Week: </span>
                {resolvedWeek
                  ? <span className="text-indigo-700 font-semibold">{resolvedWeek.week_name} ({resolvedWeek.week_code})</span>
                  : <span className="text-slate-400 italic">No week assigned yet</span>
                }
              </div>
              {!existingAssignment && (
                <button
                  onClick={() => setWeekCreateOpen(v => !v)}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs shrink-0"
                >
                  {weekCreateOpen ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {weekCreateOpen ? "Cancel" : "New Week"}
                </button>
              )}
            </div>

            {weekCreateOpen && (
              <div className="border border-indigo-200 bg-white rounded-md p-3 space-y-2 mt-1">
                <p className="text-[11px] text-indigo-600 font-semibold uppercase tracking-wide">Create New Planning Week</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Week Name</Label>
                    <Input className="h-7 text-xs mt-0.5" placeholder="e.g. Week 14 – Apr" value={newWeek.week_name} onChange={e => setWk("week_name", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Week Code</Label>
                    <Input className="h-7 text-xs mt-0.5" placeholder="e.g. W2026-14" value={newWeek.week_code} onChange={e => setWk("week_code", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Start Date</Label>
                    <Input type="date" className="h-7 text-xs mt-0.5" value={newWeek.start_date} onChange={e => setWk("start_date", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[11px]">End Date</Label>
                    <Input type="date" className="h-7 text-xs mt-0.5" value={newWeek.end_date} onChange={e => setWk("end_date", e.target.value)} />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 mt-1"
                  disabled={creatingWeek || !newWeek.week_name || !newWeek.week_code || !newWeek.start_date || !newWeek.end_date}
                  onClick={handleCreateWeek}
                >
                  {creatingWeek ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {creatingWeek ? "Creating…" : "Create & Use This Week"}
                </Button>
              </div>
            )}
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
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving || !asset || !resolvedWeek}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : existingAssignment ? "Update" : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}