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
import { useConfigLists } from "@/components/shared/useConfigLists";
import { computePriorityBucket, computePinColor } from "./planningUtils";

const BLANK = {
  assignment_type: "",
  assignment_status: "Planned",
  priority_bucket: "",
  team_name: "",
  assigned_to: "",
  route_zone: "",
  notes: "",
  source_incident_id: "",
  source_work_order_id: "",
};

const BLANK_WEEK = { start_date: "", end_date: "" };

// Auto-generate week_name and week_code from dates
function deriveWeekMeta(start, end) {
  if (!start) return { week_name: "", week_code: "" };
  const d = new Date(start);
  const year = d.getFullYear();
  // ISO week number
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    week_name: `Week ${weekNum} – ${d.toLocaleString("default", { month: "short" })} ${year}`,
    week_code: `W${year}-${pad(weekNum)}`,
  };
}

export default function AssignAssetModal({
  open, onOpenChange, asset, week, weeks = [],
  existingAssignment, incidents, workOrders,
  onSave, onDelete, onWeekCreated,
}) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Week creation
  const [newWeek, setNewWeek] = useState(BLANK_WEEK);
  const [creatingWeek, setCreatingWeek] = useState(false);
  const [weekCreateOpen, setWeekCreateOpen] = useState(false);
  const [createdWeek, setCreatedWeek] = useState(null);

  // Config lists from Configuration module
  const typeOptions = useConfigLists("Planning Assignment Types");
  const statusOptions = useConfigLists("Planning Assignment Statuses");

  useEffect(() => {
    if (existingAssignment) {
      setForm({
        assignment_type:      existingAssignment.assignment_type      || "",
        assignment_status:    existingAssignment.assignment_status    || "Planned",
        priority_bucket:      existingAssignment.priority_bucket      || "",
        team_name:            existingAssignment.team_name            || "",
        assigned_to:          existingAssignment.assigned_to          || "",
        route_zone:           existingAssignment.route_zone           || "",
        notes:                existingAssignment.notes                || "",
        source_incident_id:   existingAssignment.source_incident_id   || "",
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

  // Auto-fill priority from linked incident when source changes
  useEffect(() => {
    if (!form.source_incident_id) return;
    const inc = assetIncidents.find(i => i.id === form.source_incident_id);
    if (inc && !form.priority_bucket) {
      const bucket = computePriorityBucket(inc, null);
      if (bucket) setForm(f => ({ ...f, priority_bucket: bucket }));
    }
  }, [form.source_incident_id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setWk = (k, v) => setNewWeek(f => ({ ...f, [k]: v }));

  const resolvedWeek = createdWeek || week;

  const handleCreateWeek = async () => {
    if (!newWeek.start_date || !newWeek.end_date) return;
    setCreatingWeek(true);
    const meta = deriveWeekMeta(newWeek.start_date, newWeek.end_date);
    const created = await base44.entities.PlanningWeeks.create({
      ...meta,
      start_date: newWeek.start_date,
      end_date: newWeek.end_date,
      status: "Draft",
    });
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

  // Derived priority from linked incident for display
  const linkedIncidentForPriority = assetIncidents.find(i => i.id === form.source_incident_id);
  const autoPriority = linkedIncidentForPriority
    ? (linkedIncidentForPriority.initial_priority || linkedIncidentForPriority.priority || "")
    : "";

  const PRIORITY_OPTIONS = ["P1", "P2", "Critical", "High", "Medium", "Low"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" style={{ zIndex: 9999 }}>
        <DialogHeader>
          <DialogTitle>{existingAssignment ? "Edit Assignment" : "Assign Asset to Week"}</DialogTitle>
        </DialogHeader>

        {asset && (
          <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-xs text-slate-600 border mb-1">
            <div><span className="font-medium">Asset:</span> {asset.asset_id} — {asset.asset_name}</div>
          </div>
        )}

        {/* Type & Week at top before tabs */}
        <div className="bg-indigo-50 rounded-lg px-4 py-3 space-y-2.5 border border-indigo-100 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Type</Label>
              <Select value={form.assignment_type || "__none__"} onValueChange={v => set("assignment_type", v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1.5 text-sm"><SelectValue placeholder="— Type —" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__none__">— Type —</SelectItem>
                  {typeOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Planning Week</Label>
              <Select value={resolvedWeek?.id || "__none__"} onValueChange={v => {
                if (v === "__new__") {
                  setWeekCreateOpen(true);
                } else if (v !== "__none__") {
                  const selected = weeks.find(w => w.id === v);
                  if (selected) {
                    setCreatedWeek(selected);
                  }
                }
              }}>
                <SelectTrigger className="mt-1.5 text-sm"><SelectValue placeholder="Pick a date…" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__none__">Pick a date to select a week…</SelectItem>
                  {weeks.map(w => <SelectItem key={w.id} value={w.id}>{w.week_code} — {w.week_name}</SelectItem>)}
                  <SelectItem value="__new__">+ Create new week</SelectItem>
                </SelectContent>
              </Select>
              {weekCreateOpen && (
                <div className="border border-indigo-200 bg-white rounded-md p-3 space-y-2 mt-2">
                  <p className="text-[11px] text-indigo-600 font-semibold uppercase tracking-wide">Create New Planning Week</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Start Date</Label>
                      <Input type="date" className="h-7 text-xs mt-0.5" value={newWeek.start_date}
                        onChange={e => setWk("start_date", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-[11px]">End Date</Label>
                      <Input type="date" className="h-7 text-xs mt-0.5" value={newWeek.end_date}
                        onChange={e => setWk("end_date", e.target.value)} />
                    </div>
                  </div>
                  {newWeek.start_date && newWeek.end_date && (
                    <p className="text-[10px] text-slate-400">
                      Will be saved as: <b>{deriveWeekMeta(newWeek.start_date).week_name}</b> ({deriveWeekMeta(newWeek.start_date).week_code})
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                      disabled={creatingWeek || !newWeek.start_date || !newWeek.end_date}
                      onClick={handleCreateWeek}
                    >
                      {creatingWeek ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                      {creatingWeek ? "Creating…" : "Create"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setWeekCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="assignment">
           <TabsList className="w-full">
             <TabsTrigger value="assignment" className="flex-1 text-xs">Asset Info</TabsTrigger>
             <TabsTrigger value="team" className="flex-1 text-xs">Team & Zone</TabsTrigger>
             <TabsTrigger value="links" className="flex-1 text-xs">Links</TabsTrigger>
           </TabsList>

           <TabsContent value="assignment" className="space-y-3 pt-3">
             {/* Asset Summary */}
             {asset && (
               <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                 <div className="grid grid-cols-2 gap-2 text-xs">
                   {asset.shelter_type && <div><span className="text-slate-500">Type:</span> <span className="font-medium">{asset.shelter_type}</span></div>}
                   {asset.city && <div><span className="text-slate-500">City:</span> <span className="font-medium">{asset.city}</span></div>}
                   {asset.municipality && <div><span className="text-slate-500">Municipality:</span> <span className="font-medium">{asset.municipality}</span></div>}
                   {asset.location_address && <div className="col-span-2"><span className="text-slate-500">Location:</span> <span className="font-medium">{asset.location_address}</span></div>}
                 </div>
               </div>
             )}

             {/* Incidents */}
             {assetIncidents.length > 0 && (
               <div className="space-y-1">
                 <p className="text-xs font-semibold text-slate-700">Incidents ({assetIncidents.length})</p>
                 <div className="space-y-1.5">
                   {assetIncidents.map(inc => (
                     <div key={inc.id} className="bg-red-50 border border-red-200 rounded-md p-2.5 text-xs">
                       <div className="font-medium text-red-900">{inc.incident_id}</div>
                       <div className="text-red-700 text-[11px]">{inc.title}</div>
                       <div className="flex items-center gap-2 mt-1.5">
                         <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                           inc.priority === 'Critical' ? 'bg-red-200 text-red-800' :
                           inc.priority === 'High' ? 'bg-orange-200 text-orange-800' :
                           'bg-yellow-200 text-yellow-800'
                         }`}>
                           {inc.priority || 'N/A'}
                         </span>
                         <span className="text-red-600 text-[10px]">{inc.status}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Work Orders */}
             {assetWOs.length > 0 && (
               <div className="space-y-1">
                 <p className="text-xs font-semibold text-slate-700">Work Orders ({assetWOs.length})</p>
                 <div className="space-y-1.5">
                   {assetWOs.map(wo => (
                     <div key={wo.id} className="bg-blue-50 border border-blue-200 rounded-md p-2.5 text-xs">
                       <div className="font-medium text-blue-900">{wo.work_order_id}</div>
                       <div className="text-blue-700 text-[11px]">{wo.title}</div>
                       <div className="flex items-center gap-2 mt-1.5">
                         <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                           wo.priority === 'Critical' ? 'bg-red-200 text-red-800' :
                           wo.priority === 'High' ? 'bg-orange-200 text-orange-800' :
                           'bg-yellow-200 text-yellow-800'
                         }`}>
                           {wo.priority || 'N/A'}
                         </span>
                         <span className="text-blue-600 text-[10px]">{wo.status}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div>
               <Label className="text-xs">Status</Label>
               <Select value={form.assignment_status || "__none__"} onValueChange={v => set("assignment_status", v === "__none__" ? "" : v)}>
                 <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                 <SelectContent style={{ zIndex: 99999 }}>
                   {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div>
               <Label className="text-xs">Status</Label>
               <Select value={form.assignment_status || "__none__"} onValueChange={v => set("assignment_status", v === "__none__" ? "" : v)}>
                 <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                 <SelectContent style={{ zIndex: 99999 }}>
                   {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>

            {/* Priority — drawn from linked incident */}
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority_bucket || "auto"} onValueChange={v => set("priority_bucket", v === "auto" ? "" : v)}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Auto from incident" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="auto">
                    Auto from linked incident{autoPriority ? ` (${autoPriority})` : ""}
                  </SelectItem>
                  {PRIORITY_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {autoPriority && !form.priority_bucket && (
                <p className="text-xs text-indigo-500 mt-1">Derived from linked incident: <b>{autoPriority}</b></p>
              )}
              {!autoPriority && !form.priority_bucket && (
                <p className="text-xs text-slate-400 mt-1">Link an incident in the Links tab to auto-derive priority.</p>
              )}
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
                <Label className="text-xs">Link to Incident <span className="text-slate-400">(auto-fills priority)</span></Label>
                <Select value={form.source_incident_id || "none"} onValueChange={v => set("source_incident_id", v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select incident..." /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="none">None</SelectItem>
                    {assetIncidents.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.incident_id} — {i.title} ({i.status}){i.initial_priority ? ` [${i.initial_priority}]` : ""}
                      </SelectItem>
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
                  <SelectContent style={{ zIndex: 99999 }}>
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