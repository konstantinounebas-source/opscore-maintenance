import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Settings2 } from "lucide-react";

const PHASES = ["Response", "Execution", "Finalisation", "Closure"];
const ENTITIES = ["OMPI", "OWR", "FMPI", "Incident", "WorkOrder"];
const PHASE_COLORS = {
  Response: "bg-green-100 text-green-700",
  Execution: "bg-yellow-100 text-yellow-700",
  Finalisation: "bg-blue-100 text-blue-700",
  Closure: "bg-slate-100 text-slate-700",
};

const emptyAction = () => ({
  action_key: "", label: "", phase: "Response", related_entity: "Incident",
  requires_attachment: false, requires_note: false, is_mandatory_for_closure: false,
  owr_only: false, is_active: true, display_order: 0,
  sla_hours_p1: "", sla_hours_p2: "", description: ""
});

export default function WorkflowConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editItem, setEditItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: actions = [] } = useQuery({
    queryKey: ["wfActionTypes"],
    queryFn: () => base44.entities.WFActionTypes.list("display_order"),
  });

  const openNew = () => { setEditItem(emptyAction()); setDialogOpen(true); };
  const openEdit = (a) => { setEditItem({ ...a }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editItem.action_key || !editItem.label || !editItem.phase) return;
    setSaving(true);
    const data = {
      ...editItem,
      sla_hours_p1: editItem.sla_hours_p1 ? Number(editItem.sla_hours_p1) : null,
      sla_hours_p2: editItem.sla_hours_p2 ? Number(editItem.sla_hours_p2) : null,
      display_order: Number(editItem.display_order) || 0,
    };
    if (editItem.id) {
      await base44.entities.WFActionTypes.update(editItem.id, data);
    } else {
      await base44.entities.WFActionTypes.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["wfActionTypes"] });
    toast({ title: editItem.id ? "Action updated" : "Action created" });
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this action type?")) return;
    await base44.entities.WFActionTypes.delete(id);
    queryClient.invalidateQueries({ queryKey: ["wfActionTypes"] });
    toast({ title: "Deleted" });
  };

  const set = (k, v) => setEditItem(p => ({ ...p, [k]: v }));

  const grouped = PHASES.reduce((acc, ph) => {
    acc[ph] = actions.filter(a => a.phase === ph);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-800">Workflow Action Types</h2>
        </div>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Add Action
        </Button>
      </div>

      <div className="space-y-5">
        {PHASES.map(phase => (
          <div key={phase}>
            <h3 className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded mb-2 inline-block ${PHASE_COLORS[phase]}`}>
              {phase}
            </h3>
            <div className="border rounded-lg divide-y">
              {grouped[phase].length === 0 && (
                <p className="text-xs text-slate-400 px-4 py-3">No actions configured for this phase.</p>
              )}
              {grouped[phase].map(action => (
                <div key={action.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{action.label}</span>
                      <span className="text-xs text-slate-400 font-mono">{action.action_key}</span>
                      {!action.is_active && <Badge variant="outline" className="text-xs text-slate-400">Inactive</Badge>}
                      {action.is_mandatory_for_closure && <Badge className="text-xs bg-red-50 text-red-600 border border-red-200">Mandatory</Badge>}
                      {action.owr_only && <Badge className="text-xs bg-purple-50 text-purple-600 border border-purple-200">OWR Only</Badge>}
                      {action.requires_attachment && <Badge className="text-xs bg-amber-50 text-amber-600 border border-amber-200">📎 Attachment</Badge>}
                    </div>
                    {action.description && <p className="text-xs text-slate-400 mt-0.5">{action.description}</p>}
                    {(action.sla_hours_p1 || action.sla_hours_p2) && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        SLA: {action.sla_hours_p1 ? `P1 ${action.sla_hours_p1}h` : ""}{action.sla_hours_p1 && action.sla_hours_p2 ? " · " : ""}{action.sla_hours_p2 ? `P2 ${action.sla_hours_p2}h` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(action)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(action.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Action Type" : "New Action Type"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Action Key *</Label>
                  <Input value={editItem.action_key} onChange={e => set("action_key", e.target.value)} placeholder="e.g. create_ompi" className="font-mono text-sm" disabled={!!editItem.id} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Order</Label>
                  <Input type="number" value={editItem.display_order} onChange={e => set("display_order", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Label *</Label>
                <Input value={editItem.label} onChange={e => set("label", e.target.value)} placeholder="Display name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Phase *</Label>
                  <Select value={editItem.phase} onValueChange={v => set("phase", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PHASES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Related Entity</Label>
                  <Select value={editItem.related_entity || ""} onValueChange={v => set("related_entity", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">SLA Hours P1</Label>
                  <Input type="number" value={editItem.sla_hours_p1 || ""} onChange={e => set("sla_hours_p1", e.target.value)} placeholder="e.g. 24" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SLA Hours P2</Label>
                  <Input type="number" value={editItem.sla_hours_p2 || ""} onChange={e => set("sla_hours_p2", e.target.value)} placeholder="e.g. 8" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea value={editItem.description || ""} onChange={e => set("description", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
                {[
                  ["requires_attachment", "Requires Attachment"],
                  ["requires_note", "Requires Note"],
                  ["is_mandatory_for_closure", "Mandatory for Closure"],
                  ["owr_only", "OWR Incidents Only"],
                  ["is_active", "Active"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <Checkbox checked={!!editItem[key]} onCheckedChange={v => set(key, !!v)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving || !editItem.action_key || !editItem.label}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}