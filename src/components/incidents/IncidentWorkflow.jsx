import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import WorkOrderPanel from "@/components/incidents/WorkOrderPanel";
import {
  CheckCircle2, Circle, Loader2, ChevronRight,
  Paperclip, StickyNote, AlertTriangle, FileCheck, Lock
} from "lucide-react";

// ── Administrative steps in strict sequential order ──────────────────────────
const ADMIN_STEPS = [
  { key: "confirmation_of_receipt", label: "Confirmation of Receipt",       flag: "confirmation_done" },
  { key: "create_ompi",             label: "Outline Management Plan (OMPI)", flag: "ompi_done" },
  { key: "create_fmpi",             label: "Full Management Plan (FMPI)",    flag: "owr_fmpi_done" },
  { key: "ca_status",               label: "CA Status",                      flag: "ca_status_done" },
  { key: "close_incident",          label: "Close Incident",                 flag: null },
];

// ── Workorder action types ───────────────────────────────────────────────────
const WO_PANELS = [
  { woType: "make_safe",  label: "Make Safe WO" },
  { woType: "inspection", label: "Inspection WO" },
  { woType: "corrective", label: "Corrective WO" },
];

function isStepDone(step, incident) {
  if (step.key === "ca_status") return incident.ca_status === "Approved" || incident.ca_status === "Not Approved";
  if (step.flag) return !!incident[step.flag];
  return incident.status === "Closed";
}

function isStepLocked(stepIndex, incident) {
  if (stepIndex === 0) return false;
  const prev = ADMIN_STEPS[stepIndex - 1];
  return !isStepDone(prev, incident);
}

// ── Admin Step Card ──────────────────────────────────────────────────────────
function AdminStepCard({ step, stepIndex, incident, onOpen }) {
  const done = isStepDone(step, incident);
  const locked = isStepLocked(stepIndex, incident);

  return (
    <button
      disabled={locked}
      onClick={() => !locked && onOpen(step)}
      className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border transition-all
        ${done
          ? "bg-green-50 border-green-200"
          : locked
            ? "bg-slate-50 border-slate-100 cursor-not-allowed opacity-60"
            : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
        }`}
    >
      <div className="flex-shrink-0">
        {done
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : locked
            ? <Lock className="w-4 h-4 text-slate-300" />
            : <Circle className="w-4 h-4 text-slate-300" />
        }
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className={`text-sm font-medium ${done ? "text-slate-600" : locked ? "text-slate-400" : "text-slate-800"}`}>
          {step.label}
        </span>
        {done && step.key === "ca_status" && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${incident.ca_status === "Approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {incident.ca_status}
          </span>
        )}
        {done && step.key !== "ca_status" && <span className="text-xs text-green-600 font-medium">✓ Done</span>}
        {locked && <span className="text-xs text-slate-400">Locked</span>}
      </div>
      {!done && !locked && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
    </button>
  );
}

// ── Admin Action Modal ───────────────────────────────────────────────────────
function AdminActionModal({ step, incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState("");

  const key = step.key;

  const { data: existingAttachments = [] } = useQuery({
    queryKey: ["incidentAttachments", incidentId],
    queryFn: () => base44.entities.IncidentAttachments.filter({ incident_id: incidentId }),
  });

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(i => i.value);
    },
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const addAudit = async (action, details, extra = {}) => {
    await base44.entities.IncidentAuditTrail.create({
      incident_id: incidentId, action, details,
      user: person || user?.email,
      ...extra
    });
  };

  const uploadAttachment = async (fileData) => {
    await base44.entities.IncidentAttachments.create({
      file_url: fileData.file_url,
      file_name: fileData.file_name,
      file_type: fileData.file_type || "Document",
      incident_id: incidentId,
      uploaded_by: user?.email || person,
    });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["workOrders", incidentId] });
  };

  const handleSubmit = async () => {
    if (!person.trim()) {
      toast({ title: "Person required", description: "Please enter the responsible person." });
      return;
    }
    if (key === "create_ompi" && !formData.file && existingAttachments.length === 0) {
      toast({ title: "Attachment required", description: "Please upload the OMPI document." });
      return;
    }

    setSaving(true);
    try {
      const incidentUpdates = {};
      // user is available from useAuth() context

      if (key === "confirmation_of_receipt") {
        const msg = `Αγαπητοί/ες,\n\nΕπιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): ${incident.incident_id}.\n\nΤο περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης.\nΠαραμένουμε στην διάθεσή σας.\nΜε εκτίμηση,`;
        incidentUpdates.confirmation_done = true;
        await addAudit("Confirmation of Receipt", msg);
      }

      if (key === "create_ompi") {
        if (formData.file) await uploadAttachment(formData.file);
        incidentUpdates.ompi_done = true;
        await addAudit(
          "OMPI Created",
          `OMPI created${formData.notes ? `: ${formData.notes}` : ""}`,
          formData.file ? { attachments: [formData.file.file_url], attachment_names: [formData.file.file_name] } : {}
        );
      }

      if (key === "create_fmpi") {
        if (formData.file) await uploadAttachment(formData.file);
        incidentUpdates.owr_fmpi_done = true;
        const details = `FMPI created${formData.notes ? `: ${formData.notes}` : ""}${!incident.is_owr ? " — CA Approval required" : ""}`;
        await addAudit(
          "FMPI Created",
          details,
          formData.file ? { attachments: [formData.file.file_url], attachment_names: [formData.file.file_name] } : {}
        );
      }

      if (key === "close_incident") {
        await base44.entities.Incidents.update(incidentId, { status: "Closed" });
        await addAudit("Incident Closed", formData.notes ? `Closing notes: ${formData.notes}` : "Incident closed and resolved.");
      } else if (Object.keys(incidentUpdates).length > 0) {
        await base44.entities.Incidents.update(incidentId, incidentUpdates);
      }

      refreshAll();
      toast({ title: key === "close_incident" ? "Incident Closed" : `${step.label} completed` });
      onDone();
    } catch (err) {
      console.error("AdminActionModal error:", err);
      toast({ title: "Error", description: err?.message || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const isDone = isStepDone(step, incident);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{step.label}</span>
            {isDone && <Badge className="bg-green-100 text-green-700 border-green-200">Done</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isDone && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              ✓ This action has already been completed. You can perform it again if needed.
            </div>
          )}

          {key === "confirmation_of_receipt" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 leading-relaxed space-y-2">
              <p>Αγαπητοί/ες,</p>
              <p>Επιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): <strong>{incident.incident_id}</strong>.</p>
              <p>Το περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης.</p>
              <p>Παραμένουμε στην διάθεσή σας.<br />Με εκτίμηση,</p>
            </div>
          )}

          {key === "create_fmpi" && !incident.is_owr && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> CA Approval required for non-OWR incidents before closure.
            </div>
          )}
          {key === "create_fmpi" && incident.is_owr && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> OWR incident — CA Approval required.
            </div>
          )}

          {key === "create_ompi" && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> OMPI Document
                {existingAttachments.length === 0 && <span className="text-red-500">*</span>}
              </Label>
              {existingAttachments.length > 0 && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                    <FileCheck className="w-3.5 h-3.5" /> Already uploaded
                  </p>
                  {existingAttachments.slice(0, 3).map(a => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                      className="block text-xs text-green-700 underline truncate">{a.file_name}</a>
                  ))}
                  {existingAttachments.length > 3 && <p className="text-xs text-green-600">+{existingAttachments.length - 3} more</p>}
                </div>
              )}
              <FileUploader
                onUpload={fd => set("file", fd)}
                label={formData.file ? formData.file.file_name : existingAttachments.length > 0 ? "Upload additional (optional)" : "Upload OMPI Document"}
              />
            </div>
          )}

          {key === "create_fmpi" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachment (optional)</Label>
              <FileUploader onUpload={fd => set("file", fd)} label={formData.file ? formData.file.file_name : "Upload FMPI Document"} />
            </div>
          )}

          {key !== "confirmation_of_receipt" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <StickyNote className="w-3 h-3" />
                {key === "close_incident" ? "Closing Notes" : "Notes"}
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

          <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs font-semibold">Confirmed By *</Label>
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
  const [activeStep, setActiveStep] = useState(null);

  const adminDoneCount = ADMIN_STEPS.filter(s => isStepDone(s, incident)).length;

  return (
    <div className="space-y-4">
      {/* ── Administrative Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrative</p>
          <span className={`text-xs font-bold ${adminDoneCount === ADMIN_STEPS.length ? "text-green-600" : adminDoneCount >= 2 ? "text-amber-600" : "text-red-500"}`}>
            {adminDoneCount}/{ADMIN_STEPS.length} completed
          </span>
        </div>
        <div className="space-y-1.5">
          {ADMIN_STEPS.map((step, idx) => (
            <AdminStepCard
              key={step.key}
              step={step}
              stepIndex={idx}
              incident={incident}
              onOpen={setActiveStep}
            />
          ))}
        </div>
      </div>

      {/* ── Actions / Workorders Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actions — Work Orders</p>
        <div className="space-y-2">
          {WO_PANELS.map(panel => (
            <WorkOrderPanel
              key={panel.woType}
              woType={panel.woType}
              incident={incident}
              incidentId={incidentId}
            />
          ))}
        </div>
      </div>

      {activeStep && (
        <AdminActionModal
          step={activeStep}
          incident={incident}
          incidentId={incidentId}
          onClose={() => setActiveStep(null)}
          onDone={() => { setActiveStep(null); onRefresh(); }}
        />
      )}
    </div>
  );
}