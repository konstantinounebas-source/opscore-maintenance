import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from "lucide-react";

const DEFAULT_RULE = {
  rule_name: "", incident_priority_source: "", assignment_type: "",
  max_response_hours: "", max_resolution_days: "", target_week_offset: "",
  severity_weight: 50, is_active: true, notes: "",
};

function RuleDialog({ open, onOpenChange, initialData, onSave }) {
  const [form, setForm] = useState(initialData || DEFAULT_RULE);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.rule_name) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initialData?.id ? "Edit SLA Rule" : "New SLA Rule"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          <div><Label className="text-xs">Rule Name *</Label><Input value={form.rule_name} onChange={e => set("rule_name", e.target.value)} className="h-8 text-sm" placeholder="P1 Emergency Response" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Priority Source</Label>
              <Input value={form.incident_priority_source || ""} onChange={e => set("incident_priority_source", e.target.value)} className="h-8 text-sm" placeholder="P1, P2, Critical…" />
            </div>
            <div><Label className="text-xs">Assignment Type</Label>
              <Input value={form.assignment_type || ""} onChange={e => set("assignment_type", e.target.value)} className="h-8 text-sm" placeholder="Inspection, Corrective…" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Max Response (h)</Label><Input type="number" value={form.max_response_hours || ""} onChange={e => set("max_response_hours", Number(e.target.value))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Max Resolution (d)</Label><Input type="number" value={form.max_resolution_days || ""} onChange={e => set("max_resolution_days", Number(e.target.value))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Week Offset</Label><Input type="number" value={form.target_week_offset || ""} onChange={e => set("target_week_offset", Number(e.target.value))} className="h-8 text-sm" /></div>
          </div>
          <div><Label className="text-xs">Severity Weight (0–100)</Label><Input type="number" min="0" max="100" value={form.severity_weight || ""} onChange={e => set("severity_weight", Number(e.target.value))} className="h-8 text-sm" /></div>
          <div><Label className="text-xs">Notes</Label><Input value={form.notes || ""} onChange={e => set("notes", e.target.value)} className="h-8 text-sm" /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active !== false} onChange={e => set("is_active", e.target.checked)} />
            <Label htmlFor="is_active" className="text-xs cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !form.rule_name}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SLAConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const { data: rules = [] } = useQuery({ queryKey: ["slaRules"], queryFn: () => base44.entities.SLARules.list("-created_date") });

  const handleSave = async (form) => {
    if (editingRule?.id) {
      await base44.entities.SLARules.update(editingRule.id, form);
      toast({ title: "SLA rule updated" });
    } else {
      await base44.entities.SLARules.create(form);
      toast({ title: "SLA rule created" });
    }
    queryClient.invalidateQueries({ queryKey: ["slaRules"] });
    setEditingRule(null);
  };

  const handleDelete = async (rule) => {
    await base44.entities.SLARules.delete(rule.id);
    queryClient.invalidateQueries({ queryKey: ["slaRules"] });
    toast({ title: "Rule deleted" });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeader
        title="SLA Rules"
        subtitle="Configure SLA and response time rules for scheduling"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingRule(null); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Rule
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-5">
        {rules.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">No SLA rules yet. Add a rule to enable SLA-aware scheduling.</div>
          </div>
        ) : (
          <div className="max-w-4xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {["Rule Name", "Priority Source", "Assignment Type", "Response (h)", "Resolution (d)", "Weight", "Active", ""].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{rule.rule_name}</td>
                    <td className="px-3 py-2.5 text-slate-500">{rule.incident_priority_source || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{rule.assignment_type || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{rule.max_response_hours ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{rule.max_resolution_days ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{rule.severity_weight ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${rule.is_active !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        {rule.is_active !== false ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingRule(rule); setDialogOpen(true); }}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => handleDelete(rule)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editingRule}
        onSave={handleSave}
      />
    </div>
  );
}