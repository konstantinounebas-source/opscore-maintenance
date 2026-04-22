/**
 * IncidentWorkflow — State-driven workflow engine
 *
 * Replaces the old boolean-step ADMIN_STEPS model.
 * Renders available actions based on incident.workflow_state.
 * All state transitions write to incident.workflow_state + timestamps.
 */
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
import { useAuth } from "@/lib/AuthContext";
import WorkOrderPanel from "@/components/incidents/WorkOrderPanel";
import CROMPIForm from "@/components/incidents/CROMPIForm";
import OutlineManagementForm from "@/components/forms/OutlineManagementForm";
import CombinedFMPIandInvoiceForm from "@/components/forms/CombinedFMPIandInvoiceForm";
import { getAthensTimestamp } from "@/lib/timeSync";
import { computeRepairSLA, mergeRules, formatDeadline, deriveWorkflowStateFromLegacy } from "@/lib/slaEngine";
import {
  CheckCircle2, Circle, Loader2, ChevronRight,
  AlertTriangle, FileCheck, FileText, PenLine,
  Lock, ChevronDown, Trash2, XCircle
} from "lucide-react";

// ── Work Order panel types ───────────────────────────────────────────────────
const WO_PANELS = [
  { woType: "make_safe",  label: "Make Safe WO" },
  { woType: "inspection", label: "Inspection WO" },
  { woType: "corrective", label: "Corrective WO" },
];

// ── Workflow state metadata ──────────────────────────────────────────────────
const STATE_META = {
  Awaiting_CR_OMPI:        { label: "Awaiting CR + OMPI",          color: "bg-slate-100 text-slate-600 border-slate-200" },
  CR_OMPI_Submitted:       { label: "CR + OMPI Submitted",          color: "bg-blue-100 text-blue-700 border-blue-200" },
  Awaiting_Make_Safe:      { label: "Awaiting Make Safe",           color: "bg-orange-100 text-orange-700 border-orange-200" },
  Awaiting_Inspection:     { label: "Awaiting Inspection",          color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  FMPI_Draft:              { label: "FMPI Draft",                   color: "bg-purple-100 text-purple-700 border-purple-200" },
  FMPI_Submitted:          { label: "FMPI Submitted",               color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  Awaiting_CA_Approval:    { label: "Awaiting CA Approval",         color: "bg-amber-100 text-amber-700 border-amber-200" },
  CA_Rejected:             { label: "CA Rejected – Revise FMPI",    color: "bg-red-100 text-red-700 border-red-200" },
  Approved_For_Corrective: { label: "Approved for Corrective",      color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Corrective_In_Progress:  { label: "Corrective In Progress",       color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  Awaiting_Closure:        { label: "Awaiting Closure",             color: "bg-pink-100 text-pink-700 border-pink-200" },
  Closed:                  { label: "Closed",                       color: "bg-green-100 text-green-700 border-green-200" },
  Cancelled:               { label: "Cancelled",                    color: "bg-slate-100 text-slate-500 border-slate-200" },
};

// ── CA Approval Modal ────────────────────────────────────────────────────────
function CAApprovalModal({ incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: slaRulesData = [] } = useQuery({ queryKey: ["slaRules"], queryFn: () => base44.entities.SLARules.list() });
  const { data: fmpiSubmissions = [] } = useQuery({
    queryKey: ["caFmpiSubmissions", incidentId],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: "combined_fmpi_invoice" }),
  });

  const handleSubmit = async () => {
    if (!decision) { toast({ title: "Select a decision (Approved / Rejected)" }); return; }
    setSaving(true);
    try {
      const now = getAthensTimestamp();

      let nextState, corrective_allowed, newSLAUpdates = {};

      if (decision === "Approved") {
        nextState = "Approved_For_Corrective";
        corrective_allowed = true;
        // Start repair SLA
        const repairSLA = computeRepairSLA(now, incident.warranty_status || "OWR", slaRulesData);
        if (repairSLA) {
          newSLAUpdates = {
            active_sla_code: repairSLA.active_sla_code,
            active_sla_name: repairSLA.active_sla_name,
            sla_started_at: now,
            sla_deadline_at: repairSLA.sla_deadline_at,
            sla_status: repairSLA.sla_status,
            previous_sla_code: incident.active_sla_code,
            previous_sla_completed_at: now,
          };
        }
      } else {
        nextState = "CA_Rejected";
        corrective_allowed = false;
      }

      await base44.entities.Incidents.update(incidentId, {
        workflow_state: nextState,
        ca_decision: decision,
        ca_decision_at: now,
        ca_decision_comment: comment || null,
        corrective_allowed,
        // Legacy compat
        ca_status: decision === "Approved" ? "Approved" : "Not Approved",
        ...newSLAUpdates,
      });

      // Upload CA files
      for (const f of files) {
        await base44.entities.IncidentAttachments.create({
          incident_id: incidentId,
          file_url: f.file_url,
          file_name: f.file_name,
          file_type: "Document",
          uploaded_by: user?.email,
        });
      }

      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: `CA ${decision}`,
        details: `CA decision: ${decision}${comment ? ` — ${comment}` : ""}`,
        user: user?.email,
        ...(files.length > 0 ? {
          attachments: files.map(f => f.file_url),
          attachment_names: files.map(f => f.file_name),
        } : {}),
      });

      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      toast({ title: `CA decision: ${decision}` });
      onDone();
    } catch (err) {
      toast({ title: "Error", description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CA Approval Decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {fmpiSubmissions.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">FMPI Submissions to Review</p>
              {fmpiSubmissions.map(s => (
                <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-indigo-200 bg-indigo-50 text-xs text-indigo-700">
                  <FileCheck className="w-3 h-3 shrink-0" />
                  <span className="flex-1 truncate">{s.form_name || "FMPI & Pricing Order"}</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${s.status === "Submitted" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">CA Approval Decision *</Label>
            <div className="flex gap-3">
              {["Approved", "Rejected"].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDecision(opt)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    decision === opt
                      ? opt === "Approved"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {opt === "Approved" ? "✓ Approved" : "✗ Rejected"}
                </button>
              ))}
            </div>
            {decision === "Rejected" && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Workflow will return to FMPI revision state.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Decision Comment (optional)</Label>
            <Textarea
              placeholder="Add a comment for the audit trail..."
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">Signed Approval / Documents (optional)</Label>
            <FileUploader onUpload={fd => setFiles(prev => [...prev, fd])} label="Upload" />
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                <span className="truncate text-slate-600">{f.file_name}</span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-red-500 ml-2">Remove</button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={decision === "Rejected" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              onClick={handleSubmit}
              disabled={saving || !decision}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Confirm Decision
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Close Incident Modal ─────────────────────────────────────────────────────
function CloseIncidentModal({ incident, incidentId, workOrders, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  const openWOs = workOrders.filter(w => w.status !== "Completed" && w.status !== "Cancelled");
  const canClose = openWOs.length === 0 && photos.length > 0;

  const handleSubmit = async () => {
    if (!canClose) {
      if (openWOs.length > 0) {
        toast({ title: "Cannot close", description: `${openWOs.length} work order(s) still open.` });
        return;
      }
      if (photos.length === 0) {
        toast({ title: "Photos required", description: "Upload at least one closure photo." });
        return;
      }
      return;
    }

    setSaving(true);
    try {
      const now = getAthensTimestamp();

      for (const f of photos) {
        await base44.entities.IncidentAttachments.create({
          incident_id: incidentId,
          file_url: f.file_url,
          file_name: f.file_name,
          file_type: "Photo",
          uploaded_by: user?.email,
        });
      }

      await base44.entities.Incidents.update(incidentId, {
        status: "Closed",
        workflow_state: "Closed",
        closed_at: now,
        closure_notes: notes || null,
        closure_evidence_uploaded: true,
        sla_completed_at: now,
        sla_status: "Completed",
        // Legacy compat
        photos_after_fixing_done: true,
        finalise_done: true,
      });

      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "Incident Closed",
        details: notes ? `Closing notes: ${notes}` : "Incident closed and resolved.",
        user: user?.email,
        ...(photos.length > 0 ? {
          attachments: photos.map(f => f.file_url),
          attachment_names: photos.map(f => f.file_name),
        } : {}),
      });

      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      toast({ title: "Incident Closed" });
      onDone();
    } catch (err) {
      toast({ title: "Error", description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Close Incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {openWOs.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {openWOs.length} work order(s) still open. All must be Completed or Cancelled.
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Photos After Fixing *</Label>
            <FileUploader onUpload={fd => setPhotos(prev => [...prev, fd])} label="Upload Photos" multiple />
            {photos.length > 0 && (
              <p className="text-xs text-green-600">{photos.length} photo(s) selected</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Closing Notes</Label>
            <Textarea placeholder="Add closing notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
              disabled={saving || !canClose}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Close Incident
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Workflow Component ──────────────────────────────────────────────────
export default function IncidentWorkflow({ incident, incidentId, onRefresh }) {
  const [showCROMPI, setShowCROMPI] = useState(false);
  const [showFMPIForm, setShowFMPIForm] = useState(false);
  const [showCAModal, setShowCAModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allIncidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list(), enabled: showFMPIForm });
  const { data: allAssets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list(), enabled: showFMPIForm });
  const { data: allWorkOrders = [] } = useQuery({ queryKey: ["allWorkOrders"], queryFn: () => base44.entities.WorkOrders.list(), enabled: showFMPIForm });
  const { data: allChildAssets = [] } = useQuery({ queryKey: ["allChildAssets"], queryFn: () => base44.entities.ChildAssets.list(), enabled: showFMPIForm });
  const { data: incidentWorkOrders = [] } = useQuery({
    queryKey: ["workOrders", incidentId],
    queryFn: () => base44.entities.WorkOrders.filter({ incident_id: incidentId }),
  });
  const { data: slaRulesData = [] } = useQuery({ queryKey: ["slaRules"], queryFn: () => base44.entities.SLARules.list() });
  const { data: fmpiSubmissions = [] } = useQuery({
    queryKey: ["fmpiSubmissions", incidentId],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: "combined_fmpi_invoice" }),
  });

  // Derive effective workflow state (supports legacy incidents)
  const workflowState = deriveWorkflowStateFromLegacy(incident);
  const warrantyStatus = incident.warranty_status
    || (incident.is_owr === true ? "OWR" : incident.is_owr === false ? "In Warranty" : null);
  const fmpiApprovalRequired = incident.fmpi_approval_required ?? (warrantyStatus === "OWR");
  const corrective_allowed = incident.corrective_allowed
    ?? (!fmpiApprovalRequired && workflowState === "FMPI_Submitted")
    ?? (incident.ca_decision === "Approved");

  const stateMeta = STATE_META[workflowState] || { label: workflowState, color: "bg-slate-100 text-slate-600 border-slate-200" };

  const hasFMPISubmitted = fmpiSubmissions.some(s => s.status === "Submitted" || s.status === "Approved");

  // Can user proceed to closure?
  const requiredWOsMet = () => {
    const openWOs = incidentWorkOrders.filter(w => w.status !== "Completed" && w.status !== "Cancelled");
    if (openWOs.length > 0) return false;
    if (incident.make_safe_required && !incidentWorkOrders.some(w => w.title?.includes("Make Safe"))) return false;
    if (incident.inspection_required && !incidentWorkOrders.some(w => w.title?.includes("Inspection"))) return false;
    return true;
  };

  const advanceToClosureCheck = async () => {
    if (!hasFMPISubmitted) {
      toast({ title: "FMPI required", description: "Submit FMPI before proceeding to closure." });
      return;
    }
    if (fmpiApprovalRequired && incident.ca_decision !== "Approved") {
      toast({ title: "CA Approval required", description: "CA must approve FMPI before closure." });
      return;
    }
    if (!requiredWOsMet()) {
      toast({ title: "Work orders incomplete", description: "All required work orders must be completed." });
      return;
    }
    setShowCloseModal(true);
  };

  return (
    <div className="space-y-4">
      {/* ── State Banner ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow State</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${stateMeta.color}`}>
              {stateMeta.label}
            </span>
          </div>
          {workflowState !== "Closed" && workflowState !== "Cancelled" && (
            <span className="text-xs text-slate-400">
              Operational Priority: <span className="font-semibold text-slate-700">{incident.operational_priority || incident.initial_priority || "—"}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Administrative Actions ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrative Actions</p>

        {/* CR + OMPI */}
        <div className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
          workflowState !== "Awaiting_CR_OMPI" ? "bg-green-50 border-green-200" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-2">
            {workflowState !== "Awaiting_CR_OMPI"
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            }
            <div>
              <p className={`text-sm font-medium ${workflowState !== "Awaiting_CR_OMPI" ? "text-slate-600" : "text-slate-800"}`}>
                Confirmation of Receipt + OMPI
              </p>
              {incident.cr_ompi_submitted_at && (
                <p className="text-xs text-slate-400">Submitted: {formatDeadline(incident.cr_ompi_submitted_at)}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant={workflowState === "Awaiting_CR_OMPI" ? "default" : "outline"}
            className={`text-xs h-8 ${workflowState === "Awaiting_CR_OMPI" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
            onClick={() => setShowCROMPI(true)}
          >
            {workflowState === "Awaiting_CR_OMPI" ? "Submit CR + OMPI" : "View / Resubmit"}
          </Button>
        </div>

        {/* FMPI */}
        {workflowState !== "Awaiting_CR_OMPI" && (
          <div className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
            hasFMPISubmitted ? "bg-green-50 border-green-200" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center gap-2">
              {hasFMPISubmitted
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${hasFMPISubmitted ? "text-slate-600" : "text-slate-800"}`}>
                  Full Management Plan (FMPI)
                </p>
                {warrantyStatus && (
                  <p className="text-xs text-slate-400">
                    {fmpiApprovalRequired ? "CA Approval required (OWR)" : "No CA Approval required (In Warranty)"}
                  </p>
                )}
                {incident.fmpi_submitted_at && (
                  <p className="text-xs text-slate-400">Submitted: {formatDeadline(incident.fmpi_submitted_at)}</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={hasFMPISubmitted ? "outline" : "default"}
              className={`text-xs h-8 ${!hasFMPISubmitted ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
              onClick={() => setShowFMPIForm(true)}
            >
              {hasFMPISubmitted ? "View FMPI" : "Fill FMPI"}
            </Button>
          </div>
        )}

        {/* CA Approval — only shown when required */}
        {fmpiApprovalRequired && workflowState !== "Awaiting_CR_OMPI" && (
          <div className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
            incident.ca_decision === "Approved"
              ? "bg-green-50 border-green-200"
              : incident.ca_decision === "Rejected"
                ? "bg-red-50 border-red-200"
                : hasFMPISubmitted
                  ? "bg-white border-slate-200"
                  : "bg-slate-50 border-slate-100 opacity-60"
          }`}>
            <div className="flex items-center gap-2">
              {incident.ca_decision === "Approved"
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : incident.ca_decision === "Rejected"
                  ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  : hasFMPISubmitted
                    ? <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    : <Lock className="w-4 h-4 text-slate-300 shrink-0" />
              }
              <div>
                <p className={`text-sm font-medium ${incident.ca_decision ? "text-slate-600" : "text-slate-800"}`}>
                  CA Approval
                </p>
                {incident.ca_decision && (
                  <p className={`text-xs font-semibold ${incident.ca_decision === "Approved" ? "text-green-700" : "text-red-700"}`}>
                    {incident.ca_decision === "Approved" ? "✓ Approved" : "✗ Rejected"}
                    {incident.ca_decision_at ? ` — ${formatDeadline(incident.ca_decision_at)}` : ""}
                  </p>
                )}
                {!hasFMPISubmitted && !incident.ca_decision && (
                  <p className="text-xs text-slate-400">Submit FMPI first</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              disabled={!hasFMPISubmitted && !incident.ca_decision}
              onClick={() => setShowCAModal(true)}
            >
              {incident.ca_decision ? "Update Decision" : "Set CA Decision"}
            </Button>
          </div>
        )}

        {/* Close Incident */}
        {workflowState !== "Awaiting_CR_OMPI" && workflowState !== "Closed" && workflowState !== "Cancelled" && (
          <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {workflowState === "Closed"
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
              }
              <div>
                <p className="text-sm font-medium text-slate-800">Close Incident</p>
                <p className="text-xs text-slate-400">
                  Requires: FMPI submitted{fmpiApprovalRequired ? ", CA Approved" : ""}, all WOs completed, closure photos
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
              onClick={advanceToClosureCheck}
            >
              Close Incident
            </Button>
          </div>
        )}

        {workflowState === "Closed" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-sm font-medium text-green-800">
              Incident Closed — {incident.closed_at ? formatDeadline(incident.closed_at) : ""}
            </p>
          </div>
        )}
      </div>

      {/* ── Work Orders ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actions — Work Orders</p>
        <div className="space-y-2">
          {WO_PANELS.map(panel => {
            // Determine lock state for each WO type
            let lockedReason = null;
            if (workflowState === "Awaiting_CR_OMPI") {
              lockedReason = "Submit CR+OMPI first";
            } else if (panel.woType === "corrective") {
              if (fmpiApprovalRequired && incident.ca_decision !== "Approved") {
                lockedReason = "CA Approval required before corrective work";
              } else if (!fmpiApprovalRequired && !hasFMPISubmitted) {
                lockedReason = "Submit FMPI before corrective work";
              }
            }
            return (
              <WorkOrderPanel
                key={panel.woType}
                woType={panel.woType}
                incident={incident}
                incidentId={incidentId}
                lockedReason={lockedReason}
              />
            );
          })}
        </div>
      </div>

      {/* ── Modals ── */}
      {showCROMPI && (
        <Dialog open onOpenChange={() => setShowCROMPI(false)}>
          <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0">
            <CROMPIForm
              incident={incident}
              incidentId={incidentId}
              onClose={() => setShowCROMPI(false)}
              onDone={() => { setShowCROMPI(false); onRefresh(); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {showFMPIForm && (
        <Dialog open onOpenChange={() => setShowFMPIForm(false)}>
          <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0">
            <CombinedFMPIandInvoiceForm
              submission={null}
              incidents={allIncidents}
              assets={allAssets}
              workOrders={allWorkOrders}
              crews={[]}
              childAssets={allChildAssets}
              onClose={() => setShowFMPIForm(false)}
              defaultIncidentId={incidentId}
            />
          </DialogContent>
        </Dialog>
      )}

      {showCAModal && (
        <CAApprovalModal
          incident={incident}
          incidentId={incidentId}
          onClose={() => setShowCAModal(false)}
          onDone={() => { setShowCAModal(false); onRefresh(); }}
        />
      )}

      {showCloseModal && (
        <CloseIncidentModal
          incident={incident}
          incidentId={incidentId}
          workOrders={incidentWorkOrders}
          onClose={() => setShowCloseModal(false)}
          onDone={() => { setShowCloseModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}