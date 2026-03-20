import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import {
  Plus, ChevronDown, ChevronUp, CheckCircle2, Clock,
  Loader2, Paperclip, StickyNote, XCircle
} from "lucide-react";

const WO_TYPE_CONFIG = {
  make_safe:   { label: "Make Safe WO",   prefix: "MSAFE", priority: "Critical", color: "text-red-700 bg-red-50 border-red-200" },
  inspection:  { label: "Inspection WO",  prefix: "INSP",  priority: "High",     color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  corrective:  { label: "Corrective WO",  prefix: "CORR",  priority: "Medium",   color: "text-blue-700 bg-blue-50 border-blue-200" },
};

function WOCard({ wo, onClose, onSubmitChecklist }) {
  const statusColors = {
    "Open": "bg-amber-50 text-amber-700 border-amber-200",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    "Completed": "bg-green-50 text-green-700 border-green-200",
    "Cancelled": "bg-slate-100 text-slate-500 border-slate-200",
  };
  const isCompleted = wo.status === "Completed" || wo.status === "Cancelled";

  return (
    <div className={`rounded-lg border px-3 py-2.5 flex items-start justify-between gap-2 ${isCompleted ? "opacity-70 bg-slate-50" : "bg-white"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-700 truncate">{wo.work_order_id}</span>
          <span className={`text-xs px-1.5 py-0 rounded border font-medium ${statusColors[wo.status] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
            {wo.status}
          </span>
        </div>
        {wo.description && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{wo.description}</p>
        )}
      </div>
      {!isCompleted && (
        <div className="flex gap-1 flex-shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onSubmitChecklist(wo)}>
            Checklist
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-green-700 border-green-300 hover:bg-green-50" onClick={() => onClose(wo)}>
            Close WO
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateWOModal({ woType, incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = WO_TYPE_CONFIG[woType];
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState("");

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(i => i.value);
    },
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!person.trim()) {
      toast({ title: "Person required" });
      return;
    }
    if (woType === "make_safe" && !formData.make_safe_confirmed) {
      toast({ title: "Please confirm if Make Safe is required" });
      return;
    }

    setSaving(true);
    try {
      let woCreated = false;

      if (woType !== "make_safe" || formData.make_safe_confirmed === "yes") {
        const woId = `${config.prefix}-${Date.now()}`;
        await base44.entities.WorkOrders.create({
          work_order_id: woId,
          incident_id: incidentId,
          title: `${config.label} - ${incident.incident_id}`,
          related_asset_id: incident.related_asset_id,
          related_asset_name: incident.related_asset_name,
          status: "Open",
          priority: config.priority,
          description: formData.notes || "",
          assigned_to: formData.assigned_to || "",
          due_date: formData.due_date || "",
        });
        woCreated = true;

        if (formData.file) {
          await base44.entities.IncidentAttachments.create({
            file_url: formData.file.file_url,
            file_name: formData.file.file_name,
            file_type: formData.file.file_type || "Document",
            incident_id: incidentId,
            uploaded_by: user?.email,
          });
        }
      }

      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: `${config.label} Created`,
        details: woCreated
          ? `WO created${formData.notes ? `: ${formData.notes}` : ""}${formData.assigned_to ? ` — Assigned: ${formData.assigned_to}` : ""}`
          : "Make Safe assessed — not required",
        user: person || user?.email,
        ...(formData.file ? { attachments: [formData.file.file_url], attachment_names: [formData.file.file_name] } : {}),
      });

      queryClient.invalidateQueries({ queryKey: ["workOrders", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
      toast({ title: woCreated ? `${config.label} created` : "Make Safe assessed" });
      onDone();
    } catch (err) {
      console.error("CreateWOModal error:", err);
      toast({ title: "Error", description: err?.message || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {config.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">

          {woType === "make_safe" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Is Make Safe Required? *</Label>
              <div className="flex gap-2">
                {["yes", "no"].map(v => (
                  <button key={v} type="button" onClick={() => set("make_safe_confirmed", v)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.make_safe_confirmed === v
                        ? v === "yes" ? "bg-red-600 text-white border-red-600" : "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}>
                    {v === "yes" ? "Yes — Create WO" : "No — Not required"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(woType !== "make_safe" || formData.make_safe_confirmed === "yes") && (
            <>
              {woType === "corrective" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Assigned To</Label>
                    <Input placeholder="Technician..." value={formData.assigned_to || ""} onChange={e => set("assigned_to", e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={formData.due_date || ""} onChange={e => set("due_date", e.target.value)} className="text-sm" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</Label>
                <Textarea placeholder="Add notes..." rows={2} value={formData.notes || ""} onChange={e => set("notes", e.target.value)} className="text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachment (optional)</Label>
                <FileUploader onUpload={fd => set("file", fd)} label={formData.file ? formData.file.file_name : "Upload File"} />
              </div>
            </>
          )}

          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs font-semibold">Person Responsible *</Label>
            {personList.length > 0 && (
              <Select value={personList.includes(person) ? person : "__manual__"} onValueChange={v => { if (v !== "__manual__") setPerson(v); }}>
                <SelectTrigger className="mb-1"><SelectValue placeholder="Select from list..." /></SelectTrigger>
                <SelectContent>
                  {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value="__manual__">— Manual Entry —</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Enter person name..." value={person} onChange={e => setPerson(e.target.value)} className="text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSubmit} disabled={saving || !person.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CloseWOModal({ wo, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [person, setPerson] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(i => i.value);
    },
  });

  const handleSubmit = async () => {
    if (!person.trim()) { toast({ title: "Person required" }); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.WorkOrders.update(wo.id, { status: "Completed" });
      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "Work Order Closed",
        details: `WO ${wo.work_order_id} closed${notes ? `: ${notes}` : ""}`,
        user: person || user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ["workOrders", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      toast({ title: "Work Order closed" });
      onDone();
    } catch (err) {
      console.error("CloseWOModal error:", err);
      toast({ title: "Error", description: err?.message || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close Work Order — {wo.work_order_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><StickyNote className="w-3 h-3" /> Closing Notes</Label>
            <Textarea placeholder="Add closing notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs font-semibold">Person Responsible *</Label>
            {personList.length > 0 && (
              <Select value={personList.includes(person) ? person : "__manual__"} onValueChange={v => { if (v !== "__manual__") setPerson(v); }}>
                <SelectTrigger className="mb-1"><SelectValue placeholder="Select from list..." /></SelectTrigger>
                <SelectContent>
                  {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value="__manual__">— Manual Entry —</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Enter person name..." value={person} onChange={e => setPerson(e.target.value)} className="text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={saving || !person.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : "Close Work Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistModal({ wo, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [person, setPerson] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(i => i.value);
    },
  });

  const handleSubmit = async () => {
    if (!person.trim()) { toast({ title: "Person required" }); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      if (file) {
        await base44.entities.IncidentAttachments.create({
          ...file, incident_id: incidentId, uploaded_by: user?.email
        });
      }
      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "WO Checklist Submitted",
        details: `WO ${wo.work_order_id}${notes ? `: ${notes}` : ""}`,
        user: person || user?.email,
        attachments: file ? [file.file_url] : [],
        attachment_names: file ? [file.file_name] : [],
      });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
      toast({ title: "Checklist submitted" });
      onDone();
    } catch (err) {
      console.error("ChecklistModal error:", err);
      toast({ title: "Error", description: err?.message || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit WO Checklist — {wo.work_order_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><StickyNote className="w-3 h-3" /> Comments</Label>
            <Textarea placeholder="Add comments..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachment (optional)</Label>
            <FileUploader onUpload={fd => setFile(fd)} label={file ? file.file_name : "Upload Checklist File"} />
          </div>
          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs font-semibold">Person Responsible *</Label>
            {personList.length > 0 && (
              <Select value={personList.includes(person) ? person : "__manual__"} onValueChange={v => { if (v !== "__manual__") setPerson(v); }}>
                <SelectTrigger className="mb-1"><SelectValue placeholder="Select from list..." /></SelectTrigger>
                <SelectContent>
                  {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value="__manual__">— Manual Entry —</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Enter person name..." value={person} onChange={e => setPerson(e.target.value)} className="text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSubmit} disabled={saving || !person.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkOrderPanel({ woType, incident, incidentId }) {
  const config = WO_TYPE_CONFIG[woType];
  const [expanded, setExpanded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [closingWO, setClosingWO] = useState(null);
  const [checklistWO, setChecklistWO] = useState(null);
  const queryClient = useQueryClient();

  const { data: allWOs = [] } = useQuery({
    queryKey: ["workOrders", incidentId],
    queryFn: () => base44.entities.WorkOrders.filter({ incident_id: incidentId }),
  });

  // Filter by WO type label
  const wos = allWOs.filter(w => w.title?.includes(config.label));

  const openCount = wos.filter(w => w.status !== "Completed" && w.status !== "Cancelled").length;
  const totalCount = wos.length;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${config.color}`}>
            {config.label}
          </span>
          {totalCount > 0 && (
            <span className="text-xs text-slate-500">
              {totalCount} WO{totalCount > 1 ? "s" : ""}
              {openCount > 0 && <span className="text-amber-600 ml-1">({openCount} open)</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); setShowCreate(true); }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Create WO
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-2 space-y-1.5 bg-slate-50">
          {wos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No work orders yet.</p>
          ) : (
            wos.map(wo => (
              <WOCard
                key={wo.id}
                wo={wo}
                onClose={setClosingWO}
                onSubmitChecklist={setChecklistWO}
              />
            ))
          )}
        </div>
      )}

      {showCreate && (
        <CreateWOModal
          woType={woType}
          incident={incident}
          incidentId={incidentId}
          onClose={() => setShowCreate(false)}
          onDone={() => setShowCreate(false)}
        />
      )}
      {closingWO && (
        <CloseWOModal
          wo={closingWO}
          incidentId={incidentId}
          onClose={() => setClosingWO(null)}
          onDone={() => setClosingWO(null)}
        />
      )}
      {checklistWO && (
        <ChecklistModal
          wo={checklistWO}
          incidentId={incidentId}
          onClose={() => setChecklistWO(null)}
          onDone={() => setChecklistWO(null)}
        />
      )}
    </div>
  );
}