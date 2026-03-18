import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, MapPin, Tag, Copy, MoveRight } from "lucide-react";

export default function BulkActionsBar({ selectedIds, allAssignments, weeks, currentWeekId, onBulkUpdate, onDuplicateToWeek, saving }) {
  const [bulkModal, setBulkModal] = useState(null); // "team" | "assignee" | "zone" | "status" | "duplicate"
  const [bulkValue, setBulkValue] = useState("");
  const [targetWeekId, setTargetWeekId] = useState("");

  const count = selectedIds.length;
  if (count === 0) return null;

  const doUpdate = async (field) => {
    await onBulkUpdate(selectedIds, { [field]: bulkValue });
    setBulkModal(null);
    setBulkValue("");
  };

  const doDuplicate = async () => {
    if (!targetWeekId) return;
    await onDuplicateToWeek(selectedIds, targetWeekId);
    setBulkModal(null);
    setTargetWeekId("");
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 flex items-center gap-3 flex-wrap">
      <span className="text-xs font-semibold text-indigo-700">{count} selected</span>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          onClick={() => { setBulkValue(""); setBulkModal("team"); }}>
          <Users className="w-3 h-3" /> Set Team
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          onClick={() => { setBulkValue(""); setBulkModal("assignee"); }}>
          <Tag className="w-3 h-3" /> Set Assignee
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          onClick={() => { setBulkValue(""); setBulkModal("zone"); }}>
          <MapPin className="w-3 h-3" /> Set Zone
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          onClick={() => { setBulkValue("Cancelled"); setBulkModal("status"); }}>
          <Tag className="w-3 h-3" /> Set Status
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
          onClick={() => { setTargetWeekId(""); setBulkModal("duplicate"); }}>
          <Copy className="w-3 h-3" /> Duplicate to Week
        </Button>
      </div>

      {/* Team modal */}
      <Dialog open={bulkModal === "team"} onOpenChange={() => setBulkModal(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Set Team for {count} Assignments</DialogTitle></DialogHeader>
          <Label className="text-xs">Team Name</Label>
          <Input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Team name..." className="mt-1 text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkModal(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => doUpdate("team_name")} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignee modal */}
      <Dialog open={bulkModal === "assignee"} onOpenChange={() => setBulkModal(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Set Assignee for {count} Assignments</DialogTitle></DialogHeader>
          <Label className="text-xs">Assigned To</Label>
          <Input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Technician name..." className="mt-1 text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkModal(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => doUpdate("assigned_to")} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone modal */}
      <Dialog open={bulkModal === "zone"} onOpenChange={() => setBulkModal(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Set Route Zone for {count} Assignments</DialogTitle></DialogHeader>
          <Label className="text-xs">Route Zone</Label>
          <Input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="e.g. Zone A" className="mt-1 text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkModal(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => doUpdate("route_zone")} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status modal */}
      <Dialog open={bulkModal === "status"} onOpenChange={() => setBulkModal(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Set Status for {count} Assignments</DialogTitle></DialogHeader>
          <Label className="text-xs">Status</Label>
          <Select value={bulkValue} onValueChange={setBulkValue}>
            <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Planned", "In Progress", "Completed", "Deferred", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkModal(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => doUpdate("assignment_status")} disabled={saving || !bulkValue}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate to week modal */}
      <Dialog open={bulkModal === "duplicate"} onOpenChange={() => setBulkModal(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Duplicate {count} Assignments to Week</DialogTitle></DialogHeader>
          <Label className="text-xs">Target Week</Label>
          <Select value={targetWeekId} onValueChange={setTargetWeekId}>
            <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select week..." /></SelectTrigger>
            <SelectContent>
              {weeks.filter(w => w.id !== currentWeekId).map(w => (
                <SelectItem key={w.id} value={w.id}>{w.week_code} — {w.week_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 mt-1">Assignments already present in the target week will be skipped.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setBulkModal(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={doDuplicate} disabled={saving || !targetWeekId}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              <MoveRight className="w-3.5 h-3.5 mr-1" /> Duplicate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}