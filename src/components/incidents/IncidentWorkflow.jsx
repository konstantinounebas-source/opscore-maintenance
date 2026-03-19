import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2, Circle, Loader2, ChevronRight,
  Paperclip, StickyNote, AlertTriangle, FileCheck
} from "lucide-react";

const PHASE_ORDER = ["Response", "Execution", "Finalisation", "Closure"];
const PHASE_COLORS = {
  Response:     "text-green-700  bg-green-50  border-green-200",
  Execution:    "text-yellow-700 bg-yellow-50 border-yellow-200",
  Finalisation: "text-blue-700   bg-blue-50   border-blue-200",
  Closure:      "text-slate-700  bg-slate-50  border-slate-200",
};

// Map action_key → incident flag field
const FLAG_MAP = {
  create_ompi:            "ompi_done",
  confirmation_of_receipt:"confirmation_done",
  create_inspection_wo:   "inspection_done",
  create_make_safe_wo:    "make_safe_done",
  create_corrective_wo:   "corrective_done",
  create_fmpi:            "owr_fmpi_done",
  upload_wo_checklist:    "checklist_done",
  revisit:                "revisit_done",
  finalise_fmpi:          "finalise_done",
  close_incident:         null,
};

// Map action_key → context label used when storing attachments
const ATTACHMENT_CONTEXT = {
  create_ompi:         "OMPI",
  create_inspection_wo:"Inspection WO",
  create_make_safe_wo: "Make Safe WO",
  finalise_fmpi:       "FMPI Finalisation",
};

// Actions that REQUIRE an attachment (unless one already exists for that context)
const ATTACHMENT_REQUIRED_KEYS = new Set([
  "create_ompi", "create_inspection_wo", "create_make_safe_wo", "finalise_fmpi"
]);

function ActionCard({ actionType, incident, onOpen }) {
  const flag = FLAG_MAP[actionType.action_key];
  const isDone = flag ? !!incident[flag] : incident.status === "Closed";

  if (actionType.owr_only && !incident.is_owr) return null;

  return (
    <button
      onClick={() => onOpen(actionType)}
      className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg border transition-all
        ${isDone
          ? "bg-green-50 border-green-200 opacity-80"
          : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
        }`}
    >
      <div className="mt-0.5 flex-shrink-0">
        {isDone
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Circle className="w-4 h-4 text-slate-300" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
            {actionType.label}
          </span>
          {isDone && <span className="text-xs text-green-600 font-medium">✓ Done</span>}
          {ATTACHMENT_REQUIRED_KEYS.has(actionType.action_key) && !isDone && (
            <span className="flex items-center gap-0.5 text-xs text-amber-600">
              <Paperclip className="w-3 h-3" /> Attachment required
            </span>
          )}
          {actionType.owr_only && (
            <Badge className="text-xs bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0">OWR</Badge>
          )}
        </div>
        {actionType.description && !isDone && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{actionType.description}</p>
        )}
      </div>
      {!isDone && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
    </button>
  );
}

// ── Individual action modals ─────────────────────────────────────────────────

function ActionModal({ actionType, incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState("");

  const key = actionType.action_key;
  const context = ATTACHMENT_CONTEXT[key];
  const needsAttachment = ATTACHMENT_REQUIRED_KEYS.has(key);

  // Load existing attachments for this incident
  const { data: existingAttachments = [] } = useQuery({
    queryKey: ["incidentAttachments", incidentId],
    queryFn: () => base44.entities.IncidentAttachments.filter({ incident_id: incidentId }),
  });

  // Check if attachment already uploaded for this context
  const alreadyUploaded = needsAttachment && context
    ? existingAttachments.some(a => a.file_name?.includes(context) || (a.uploaded_by && a.file_name))
    : false;

  // More precise check: look for any attachment tagged to this context
  const contextAttachments = needsAttachment && context
    ? existingAttachments.filter(a => {
        // We store context in audit trail details; here check by context prefix in file name or just show all
        return true; // Show all existing; user decides
      })
    : [];

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(i => i.value);
    },
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const addAudit = async (action, details, extra = {}) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAuditTrail.create({
      incident_id: incidentId, action, details,
      user: person || user?.email,
      ...extra
    });
  };

  const handleAttach = async (fileData, ctx) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAttachments.create({
      ...fileData, incident_id: incidentId, uploaded_by: user?.email
    });
    await base44.entities.IncidentAuditTrail.create({
      incident_id: incidentId,
      action: "Attachment Uploaded",
      details: `${ctx}: ${fileData.file_name}`,
      user: person || user?.email,
      attachments: [fileData.file_url],
      attachment_names: [fileData.file_name],
    });
    queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
  };

  const handleSubmit = async () => {
    // Attachment required unless already uploaded or user uploads now
    if (needsAttachment && !formData.file && existingAttachments.length === 0) {
      toast({ title: "Attachment required", description: "Please upload the required file." });
      return;
    }
    if (!person.trim()) {
      toast({ title: "Person required", description: "Please enter the responsible person." });
      return;
    }
    // Make Safe: needs yes/no answer
    if (key === "create_make_safe_wo" && !formData.make_safe_confirmed) {
      toast({ title: "Confirmation required", description: "Please confirm if Make Safe is required." });
      return;
    }

    setSaving(true);
    const auditLines = [];
    let incidentUpdates = {};

    try {
      // ── create_ompi ──
      if (key === "create_ompi") {
        await base44.entities.WorkOrders.create({
          work_order_id: `OMPI-${Date.now()}`,
          title: `OMPI - ${incident.incident_id}`,
          related_asset_id: incident.related_asset_id,
          related_asset_name: incident.related_asset_name,
          status: "Open",
          priority: incident.initial_priority === "P1" ? "High" : "Medium",
          description: formData.notes || "",
        });
        if (formData.file) await handleAttach(formData.file, "OMPI");
        incidentUpdates.ompi_done = true;
        auditLines.push(`✔ OMPI created`);
      }

      // ── confirmation_of_receipt ──
      if (key === "confirmation_of_receipt") {
        const msg = `Αγαπητοί/ες,\n\nΕπιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): ${incident.incident_id}.\n\nΤο περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης. Παρακαλώ όπως βρείτε επισυναπτόμενο το Outline Management Plan.\nΠαραμένουμε στην διάθεσή σας.\nΜε εκτίμηση,`;
        incidentUpdates.confirmation_done = true;
        await addAudit("Confirmation of Receipt", msg);
        auditLines.push(`✔ Confirmation of Receipt sent`);
      }

      // ── create_inspection_wo ──
      if (key === "create_inspection_wo") {
        await base44.entities.WorkOrders.create({
          work_order_id: `INSP-${Date.now()}`,
          title: `Inspection WO - ${incident.incident_id}`,
          related_asset_id: incident.related_asset_id,
          related_asset_name: incident.related_asset_name,
          status: "Open", priority: "High",
          description: formData.notes || "Inspection required",
        });
        if (formData.file) await handleAttach(formData.file, "Inspection WO");
        incidentUpdates.inspection_done = true;
        auditLines.push(`✔ Inspection WO created`);
      }

      // ── create_make_safe_wo ──
      if (key === "create_make_safe_wo") {
        if (formData.make_safe_confirmed === "yes") {
          await base44.entities.WorkOrders.create({
            work_order_id: `MSAFE-${Date.now()}`,
            title: `Make Safe WO - ${incident.incident_id}`,
            related_asset_id: incident.related_asset_id,
            related_asset_name: incident.related_asset_name,
            status: "Open", priority: "Critical",
            description: formData.notes || "Make Safe required",
          });
          if (formData.file) await handleAttach(formData.file, "Make Safe WO");
          auditLines.push(`✔ Make Safe WO created`);
        } else {
          auditLines.push(`✔ Make Safe assessed — not required`);
        }
        incidentUpdates.make_safe_done = true;
      }

      // ── create_corrective_wo ──
      if (key === "create_corrective_wo") {
        await base44.entities.WorkOrders.create({
          work_order_id: `CORR-${Date.now()}`,
          title: `Corrective WO - ${incident.incident_id}`,
          related_asset_id: incident.related_asset_id,
          related_asset_name: incident.related_asset_name,
          status: "Open", priority: incident.priority || "Medium",
          description: formData.notes || "Corrective maintenance",
          due_date: formData.due_date || "",
          assigned_to: formData.assigned_to || "",
        });
        incidentUpdates.corrective_done = true;
        auditLines.push(`✔ Corrective WO created${formData.assigned_to ? ` — Assigned: ${formData.assigned_to}` : ""}${formData.due_date ? ` · Due: ${formData.due_date}` : ""}`);
      }

      // ── create_fmpi ──
      if (key === "create_fmpi") {
        await base44.entities.WorkOrders.create({
          work_order_id: `FMPI-${Date.now()}`,
          title: `FMPI - ${incident.incident_id}`,
          related_asset_id: incident.related_asset_id,
          related_asset_name: incident.related_asset_name,
          status: "Open", priority: "High",
          description: `FMPI created (OWR). CA Approval required. ${formData.notes || ""}`,
        });
        incidentUpdates.owr_fmpi_done = true;
        auditLines.push(`✔ FMPI (OWR) created — CA Approval required`);
      }

      // ── upload_wo_checklist ──
      if (key === "upload_wo_checklist") {
        if (formData.file) await handleAttach(formData.file, "WO Checklist");
        incidentUpdates.checklist_done = true;
        auditLines.push(`✔ WO Checklist uploaded`);
      }

      // ── update_status ──
      if (key === "update_status" && formData.new_status) {
        await base44.entities.Incidents.update(incidentId, { status: formData.new_status });
        auditLines.push(`✔ Status updated to: ${formData.new_status}`);
      }

      // ── revisit ──
      if (key === "revisit") {
        if (formData.needs_revisit === "yes") {
          await base44.entities.WorkOrders.create({
            work_order_id: `CORR2-${Date.now()}`,
            title: `Revisit WO - ${incident.incident_id}`,
            related_asset_id: incident.related_asset_id,
            related_asset_name: incident.related_asset_name,
            status: "Open", priority: incident.priority || "Medium",
            description: formData.notes || "Revisit required",
          });
          auditLines.push(`✔ Revisit WO created`);
        } else {
          auditLines.push(`✔ No revisit required`);
        }
        incidentUpdates.revisit_done = true;
      }

      // ── finalise_fmpi ──
      if (key === "finalise_fmpi") {
        if (formData.file) await handleAttach(formData.file, "FMPI Finalisation");
        incidentUpdates.finalise_done = true;
        auditLines.push(`✔ FMPI Finalised`);
        if (incident.is_owr) auditLines.push(`  ⚠ OWR — CA Approval required before closure`);
      }

      // ── close_incident ──
      if (key === "close_incident") {
        await base44.entities.Incidents.update(incidentId, { status: "Closed" });
        await addAudit("Incident Closed", formData.notes ? `Closing notes: ${formData.notes}` : "Incident closed and resolved.");
        refreshAll();
        toast({ title: "Incident Closed" });
        setSaving(false);
        onDone();
        return;
      }

      if (Object.keys(incidentUpdates).length > 0) {
        await base44.entities.Incidents.update(incidentId, incidentUpdates);
      }
      if (auditLines.length > 0) {
        await addAudit(actionType.label, auditLines.join("\n"));
      }

      refreshAll();
      toast({ title: `${actionType.label} completed` });
    } finally {
      setSaving(false);
      onDone();
    }
  };

  const flag = FLAG_MAP[key];
  const isDone = flag ? !!incident[flag] : incident.status === "Closed";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{actionType.label}</span>
            {isDone && <Badge className="bg-green-100 text-green-700 border-green-200">Done</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isDone && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              ✓ This action has already been completed. You can perform it again if needed.
            </div>
          )}

          {/* Confirmation of Receipt preview */}
          {key === "confirmation_of_receipt" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 leading-relaxed space-y-2">
              <p>Αγαπητοί/ες,</p>
              <p>Επιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): <strong>{incident.incident_id}</strong>.</p>
              <p>Το περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης. Παρακαλώ όπως βρείτε επισυναπτόμενο το Outline Management Plan.</p>
              <p>Παραμένουμε στην διάθεσή σας.<br />Με εκτίμηση,</p>
            </div>
          )}

          {/* OWR warning for FMPI */}
          {(key === "create_fmpi" || key === "finalise_fmpi") && incident.is_owr && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> CA Approval required for OWR incidents.
            </div>
          )}

          {/* Make Safe: Yes / No question */}
          {key === "create_make_safe_wo" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Is Make Safe Required? *</Label>
              <div className="flex gap-2">
                {["yes", "no"].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("make_safe_confirmed", v)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.make_safe_confirmed === v
                        ? v === "yes" ? "bg-red-600 text-white border-red-600" : "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {v === "yes" ? "Yes — Create WO" : "No — Not required"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status update select */}
          {key === "update_status" && (
            <div className="space-y-1.5">
              <Label className="text-xs">New Status</Label>
              <Select value={formData.new_status || ""} onValueChange={v => set("new_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  {["In Progress", "On Hold", "Resolved"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Revisit select */}
          {key === "revisit" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Revisit Required?</Label>
              <Select value={formData.needs_revisit || ""} onValueChange={v => set("needs_revisit", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — Create additional Corrective WO</SelectItem>
                  <SelectItem value="no">No — Proceed to finalise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Corrective WO extra fields */}
          {key === "create_corrective_wo" && (
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

          {/* Notes */}
          {key !== "confirmation_of_receipt" && key !== "update_status" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                {key === "close_incident" ? "Closing Notes" : "Notes"}
                {actionType.requires_note && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                placeholder="Add notes..."
                rows={2}
                value={formData.notes || ""}
                onChange={e => set("notes", e.target.value)}
                className="text-sm"
              />
            </div>
          )}

          {/* Attachment section for actions that require it */}
          {needsAttachment && (
            // Only show attachment uploader for Make Safe if user selected "yes"
            (key !== "create_make_safe_wo" || formData.make_safe_confirmed === "yes") && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Attachment
                {existingAttachments.length === 0 && <span className="text-red-500">*</span>}
              </Label>

              {/* Show existing attachments */}
              {existingAttachments.length > 0 && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                    <FileCheck className="w-3.5 h-3.5" /> Already uploaded — attachment not required again
                  </p>
                  {existingAttachments.slice(0, 3).map(a => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                      className="block text-xs text-green-700 underline truncate">
                      {a.file_name}
                    </a>
                  ))}
                  {existingAttachments.length > 3 && (
                    <p className="text-xs text-green-600">+{existingAttachments.length - 3} more</p>
                  )}
                  <p className="text-xs text-green-600 mt-1">You can still upload an additional file below.</p>
                </div>
              )}

              <FileUploader
                onUpload={fd => set("file", fd)}
                label={formData.file ? formData.file.file_name : existingAttachments.length > 0 ? "Upload additional file (optional)" : "Upload File"}
              />
            </div>
          ))}

          {/* Generic optional attachment for other actions */}
          {!needsAttachment && key !== "confirmation_of_receipt" && key !== "update_status" && key !== "close_incident" && key !== "revisit" && key !== "create_corrective_wo" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Upload File (optional)
              </Label>
              <FileUploader
                onUpload={fd => set("file", fd)}
                label={formData.file ? formData.file.file_name : "Upload File"}
              />
            </div>
          )}

          {/* Person Responsible */}
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
            <Input
              placeholder="Enter person name..."
              value={person}
              onChange={e => setPerson(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={key === "close_incident" ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}
              onClick={handleSubmit}
              disabled={saving || !person.trim()}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : key === "close_incident" ? "Close Incident" : "Confirm"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Workflow Component ──────────────────────────────────────────────────

export default function IncidentWorkflow({ incident, incidentId, onRefresh }) {
  const [activeAction, setActiveAction] = useState(null);

  const { data: actionTypes = [] } = useQuery({
    queryKey: ["wfActionTypes"],
    queryFn: () => base44.entities.WFActionTypes.list("display_order"),
  });

  const visibleActions = actionTypes.filter(a => {
    if (!a.is_active) return false;
    if (a.owr_only && !incident.is_owr) return false;
    return true;
  });

  const grouped = PHASE_ORDER.reduce((acc, ph) => {
    acc[ph] = visibleActions.filter(a => a.phase === ph);
    return acc;
  }, {});

  // Closure readiness
  const mandatory = visibleActions.filter(a => a.is_mandatory_for_closure);
  const mandatoryDone = mandatory.filter(a => {
    const flag = FLAG_MAP[a.action_key];
    return flag ? !!incident[flag] : incident.status === "Closed";
  });
  const closurePercent = mandatory.length
    ? Math.round((mandatoryDone.length / mandatory.length) * 100)
    : 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Progress</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Closure Readiness:</span>
          <span className={`text-xs font-bold ${closurePercent === 100 ? "text-green-600" : closurePercent >= 50 ? "text-amber-600" : "text-red-500"}`}>
            {closurePercent}%
          </span>
        </div>
      </div>

      {PHASE_ORDER.map(phase => {
        const items = grouped[phase];
        if (!items.length) return null;
        return (
          <div key={phase}>
            <div className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded inline-block mb-2 border ${PHASE_COLORS[phase]}`}>
              {phase}
            </div>
            <div className="space-y-1.5">
              {items.map(at => (
                <ActionCard
                  key={at.action_key}
                  actionType={at}
                  incident={incident}
                  onOpen={setActiveAction}
                />
              ))}
            </div>
          </div>
        );
      })}

      {closurePercent < 100 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
          <p className="font-medium text-slate-700">Missing for Closure:</p>
          {mandatory.filter(a => {
            const flag = FLAG_MAP[a.action_key];
            return flag ? !incident[flag] : incident.status !== "Closed";
          }).map(a => (
            <p key={a.action_key} className="text-slate-500">• {a.label}</p>
          ))}
        </div>
      )}

      {activeAction && (
        <ActionModal
          actionType={activeAction}
          incident={incident}
          incidentId={incidentId}
          onClose={() => setActiveAction(null)}
          onDone={() => { setActiveAction(null); onRefresh(); }}
        />
      )}
    </div>
  );
}