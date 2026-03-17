import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Circle, ChevronRight, ClipboardList, Shield, AlertTriangle, FileCheck, Wrench, Upload, RefreshCw, Flag, CheckCircle, XCircle } from "lucide-react";

// Each step in the workflow
const STEPS = [
  { id: "ompi",         label: "Create OMPI / Confirmation of Receipt",  icon: ClipboardList },
  { id: "inspection",   label: "Inspection WO",                           icon: Shield },
  { id: "make_safe",    label: "Make Safe WO",                            icon: AlertTriangle },
  { id: "owr_fmpi",    label: "Create FMPI (OWR)",                       icon: FileCheck },
  { id: "corrective",   label: "Create Corrective WO",                    icon: Wrench },
  { id: "checklist",    label: "Upload WO Checklist",                     icon: Upload },
  { id: "status",       label: "Update Incident Status",                  icon: RefreshCw },
  { id: "revisit",      label: "Revisit / Additional WO",                 icon: RefreshCw },
  { id: "finalise",     label: "Finalise FMPI",                           icon: Flag },
  { id: "close",        label: "Close Incident",                          icon: CheckCircle },
];

function StepDot({ completed, active }) {
  if (completed) return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (active) return <div className="w-5 h-5 rounded-full border-2 border-indigo-500 bg-indigo-50 flex-shrink-0" />;
  return <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />;
}

// Generic modal for steps that need a simple form
function StepModal({ open, onOpenChange, title, onConfirm, children, showPersonSelect = true, personList = [] }) {
  const [personInputType, setPersonInputType] = useState("manual");
  const [person, setPerson] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          {children}
          
          {showPersonSelect && (
            <div className="space-y-2 border-t pt-4">
              <Label className="text-xs font-semibold">Person Responsible</Label>
              <Tabs value={personInputType} onValueChange={setPersonInputType}>
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
                  <TabsTrigger value="select" className="text-xs">From List</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="mt-2">
                  <Input
                    placeholder="Enter person name..."
                    value={person}
                    onChange={e => setPerson(e.target.value)}
                    className="text-sm"
                  />
                </TabsContent>
                <TabsContent value="select" className="mt-2">
                  <Select value={person} onValueChange={setPerson}>
                    <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                    <SelectContent>
                      {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { onOpenChange(false); setPerson(""); setPersonInputType("manual"); }}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700" 
              onClick={() => { onConfirm(person); setPerson(""); setPersonInputType("manual"); }}
              disabled={showPersonSelect && !person.trim()}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function IncidentWorkflow({ incident, incidentId, onRefresh }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch person names from config lists
  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(item => item.value);
    },
  });

  // workflow flags stored on incident
  const flags = {
    ompi_done:        !!incident.ompi_done,
    inspection_done:  !!incident.inspection_done,
    make_safe_done:   !!incident.make_safe_done,
    owr_fmpi_done:    !!incident.owr_fmpi_done,
    corrective_done:  !!incident.corrective_done,
    checklist_done:   !!incident.checklist_done,
    revisit_done:     !!incident.revisit_done,
    finalise_done:    !!incident.finalise_done,
    closed:           incident.status === "Closed",
  };

  // Modal states
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});

  const addAudit = async (action, details, extra = {}) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action, details, user: user?.email, ...extra });
  };

  const updateIncidentFlag = async (flagKey, auditAction, auditDetails, auditExtra = {}) => {
    await base44.entities.Incidents.update(incidentId, { [flagKey]: true });
    await addAudit(auditAction, auditDetails, auditExtra);
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    onRefresh();
    toast({ title: auditAction });
  };

  const handleAttachUpload = async (fileData) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAttachments.create({ ...fileData, incident_id: incidentId, uploaded_by: user?.email });
    queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
    return { file_url: fileData.file_url, file_name: fileData.file_name };
  };

  // ── Step handlers ──────────────────────────────────────────────────

  const handleOMPI = async () => {
    const sla = incident.initial_priority === "P1" ? "P1: 24h from next working day" : "P2: Same working day";
    await base44.entities.WorkOrders.create({
      work_order_id: `OMPI-${Date.now()}`,
      title: `OMPI - ${incident.incident_id}`,
      related_asset_id: incident.related_asset_id,
      related_asset_name: incident.related_asset_name,
      status: "Open",
      priority: incident.initial_priority === "P1" ? "High" : "Medium",
      description: `Response/Confirmation of Receipt. SLA: ${sla}. ${formData.notes || ""}`,
    });
    await updateIncidentFlag("ompi_done", "OMPI Created", `Confirmation of Receipt created. SLA: ${sla}`);
    setActiveModal(null);
    setFormData({});
  };

  const handleInspection = async () => {
    await base44.entities.WorkOrders.create({
      work_order_id: `INSP-${Date.now()}`,
      title: `Inspection WO - ${incident.incident_id}`,
      related_asset_id: incident.related_asset_id,
      related_asset_name: incident.related_asset_name,
      status: "Open",
      priority: "High",
      description: formData.notes || "Inspection required",
    });
    const extra = {};
    if (formData.inspectionFile) {
      await handleAttachUpload(formData.inspectionFile);
      extra.attachments = [formData.inspectionFile.file_url];
      extra.attachment_names = [formData.inspectionFile.file_name];
    }
    await updateIncidentFlag("inspection_done", "Inspection WO Created", "Inspection Work Order created", extra);
    setActiveModal(null);
    setFormData({});
  };

  const handleMakeSafe = async () => {
    await base44.entities.WorkOrders.create({
      work_order_id: `MSAFE-${Date.now()}`,
      title: `Make Safe WO - ${incident.incident_id}`,
      related_asset_id: incident.related_asset_id,
      related_asset_name: incident.related_asset_name,
      status: "Open",
      priority: "Critical",
      description: `Make Safe. SLA: 24h from Confirmation of Receipt. ${formData.notes || ""}`,
    });
    const extra = {};
    if (formData.makeSafeFile) {
      await handleAttachUpload(formData.makeSafeFile);
      extra.attachments = [formData.makeSafeFile.file_url];
      extra.attachment_names = [formData.makeSafeFile.file_name];
    }
    await updateIncidentFlag("make_safe_done", "Make Safe WO Created", "SLA: 24h from Confirmation of Receipt", extra);
    setActiveModal(null);
    setFormData({});
  };

  const handleOWRFMPI = async () => {
    await base44.entities.WorkOrders.create({
      work_order_id: `FMPI-${Date.now()}`,
      title: `FMPI - ${incident.incident_id}`,
      related_asset_id: incident.related_asset_id,
      related_asset_name: incident.related_asset_name,
      status: "Open",
      priority: "High",
      description: `FMPI created (OWR). CA Approval required. ${formData.notes || ""}`,
    });
    await updateIncidentFlag("owr_fmpi_done", "FMPI Created (OWR)", "CA Approval required");
    setActiveModal(null);
    setFormData({});
  };

  const handleCorrective = async () => {
    await base44.entities.WorkOrders.create({
      work_order_id: `CORR-${Date.now()}`,
      title: `Corrective WO - ${incident.incident_id}`,
      related_asset_id: incident.related_asset_id,
      related_asset_name: incident.related_asset_name,
      status: "Open",
      priority: incident.priority || "Medium",
      description: formData.notes || "Corrective maintenance",
      due_date: formData.due_date || "",
      assigned_to: formData.assigned_to || "",
    });
    await updateIncidentFlag("corrective_done", "Corrective WO Created", "Corrective Work Order created", { comment: formData.notes || "" });
    setActiveModal(null);
    setFormData({});
  };

  const handleUpdateStatus = async () => {
    const newStatus = formData.status || "In Progress";
    await base44.entities.Incidents.update(incidentId, { status: newStatus });
    await addAudit("Status Updated", `Status changed to ${newStatus}`);
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    onRefresh();
    setActiveModal(null);
    setFormData({});
    toast({ title: `Status updated to ${newStatus}` });
  };

  const handleRevisit = async () => {
    if (formData.needs_revisit === "yes") {
      await base44.entities.WorkOrders.create({
        work_order_id: `CORR2-${Date.now()}`,
        title: `Revisit Corrective WO - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: incident.priority || "Medium",
        description: formData.notes || "Revisit required",
      });
      await addAudit("Revisit WO Created", formData.notes || "Additional corrective WO created for revisit");
    } else {
      await addAudit("No Revisit Required", "Proceeding to finalise FMPI");
    }
    await base44.entities.Incidents.update(incidentId, { revisit_done: true });
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    onRefresh();
    setActiveModal(null);
    setFormData({});
    toast({ title: "Revisit step completed" });
  };

  const handleFinalise = async () => {
    await updateIncidentFlag("finalise_done", "FMPI Finalised", "FMPI finalised and ready for closure", { comment: formData.notes || "" });
    if (incident.is_owr) {
      await addAudit("CA Approval Required", "OWR incident — CA Approval needed before closure");
    }
    setActiveModal(null);
    setFormData({});
  };

  const handleClose = async () => {
    await base44.entities.Incidents.update(incidentId, { status: "Closed" });
    await addAudit("Incident Closed", "Incident closed", { comment: formData.notes || "" });
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    onRefresh();
    setActiveModal(null);
    setFormData({});
    toast({ title: "Incident closed" });
  };

  // ── Determine which steps are visible / completed / active ──────────

  // Conditional visibility rules from the flow:
  const visibleSteps = STEPS.filter(s => {
    if (s.id === "inspection") return !flags.inspection_done || true; // always show if not done
    if (s.id === "make_safe")  return !flags.make_safe_done || true;
    if (s.id === "owr_fmpi")   return incident.is_owr;
    if (s.id === "revisit")    return flags.checklist_done && !flags.revisit_done;
    if (s.id === "finalise")   return flags.checklist_done;
    return true;
  });

  const isCompleted = (id) => {
    switch (id) {
      case "ompi":       return flags.ompi_done;
      case "inspection": return flags.inspection_done;
      case "make_safe":  return flags.make_safe_done;
      case "owr_fmpi":   return flags.owr_fmpi_done;
      case "corrective": return flags.corrective_done;
      case "checklist":  return flags.checklist_done;
      case "status":     return flags.corrective_done;
      case "revisit":    return flags.revisit_done;
      case "finalise":   return flags.finalise_done;
      case "close":      return flags.closed;
      default:           return false;
    }
  };

  // First non-completed step is "active"
  const activeStepId = visibleSteps.find(s => !isCompleted(s.id))?.id;

  const handleStepClick = (stepId) => {
    setFormData({});
    setActiveModal(stepId);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Workflow Progress</p>

      <div className="space-y-1">
        {visibleSteps.map((step, idx) => {
          const completed = isCompleted(step.id);
          const active = step.id === activeStepId;
          const Icon = step.icon;

          return (
            <div key={step.id}>
              <button
                onClick={() => handleStepClick(step.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left cursor-pointer
                  ${active ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-slate-50"}
                `}
              >
                <StepDot completed={completed} active={active} />
                <Icon className={`w-4 h-4 flex-shrink-0 ${completed ? "text-green-500" : active ? "text-indigo-600" : "text-slate-400"}`} />
                <span className={`text-sm flex-1 ${completed ? "line-through text-slate-400" : active ? "text-indigo-700 font-medium" : "text-slate-500"}`}>
                  {step.label}
                </span>
                {active && <ChevronRight className="w-4 h-4 text-indigo-400" />}
              </button>
              {idx < visibleSteps.length - 1 && <div className="ml-5 w-px h-3 bg-slate-200" />}
            </div>
          );
        })}
      </div>

      {/* ── Modals ── */}

      {/* OMPI */}
      <StepModal open={activeModal === "ompi"} onOpenChange={(o) => !o && setActiveModal(null)} title="Create OMPI / Confirmation of Receipt" onConfirm={handleOMPI}>
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
          <strong>SLA:</strong> P1 — 24h from next working day &nbsp;|&nbsp; P2 — Same working day
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea placeholder="Additional notes..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </StepModal>

      {/* Inspection */}
      <StepModal open={activeModal === "inspection"} onOpenChange={(o) => !o && setActiveModal(null)} title="Create Inspection Work Order" onConfirm={handleInspection}>
        <div className="space-y-1.5">
          <Label className="text-xs">Inspection Notes / WO Field</Label>
          <Textarea placeholder="Describe inspection scope..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Upload Inspection Form</Label>
          <FileUploader onUpload={(fd) => setFormData(f => ({ ...f, inspectionFile: fd }))} label="Upload Form" />
        </div>
      </StepModal>

      {/* Make Safe */}
      <StepModal open={activeModal === "make_safe"} onOpenChange={(o) => !o && setActiveModal(null)} title="Create Make Safe Work Order" onConfirm={handleMakeSafe}>
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700">
          <strong>SLA:</strong> 24 hours from Confirmation of Receipt
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Make Safe Details / WO Field</Label>
          <Textarea placeholder="Describe make-safe actions required..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Upload Make Safe Form</Label>
          <FileUploader onUpload={(fd) => setFormData(f => ({ ...f, makeSafeFile: fd }))} label="Upload Form" />
        </div>
      </StepModal>

      {/* OWR FMPI */}
      <StepModal open={activeModal === "owr_fmpi"} onOpenChange={(o) => !o && setActiveModal(null)} title="Create FMPI (OWR)" onConfirm={handleOWRFMPI}>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-700">
          CA Approval will be required after FMPI creation.
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">FMPI Notes</Label>
          <Textarea placeholder="FMPI details..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </StepModal>

      {/* Corrective WO */}
      <StepModal open={activeModal === "corrective"} onOpenChange={(o) => !o && setActiveModal(null)} title="Create Corrective Work Order" onConfirm={handleCorrective}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Assigned To</Label>
            <Input placeholder="Technician name..." value={formData.assigned_to || ""} onChange={e => setFormData(f => ({ ...f, assigned_to: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Due Date</Label>
            <Input type="date" value={formData.due_date || ""} onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">WO Description</Label>
          <Textarea placeholder="Describe corrective work..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </StepModal>

      {/* Checklist Upload */}
      <Dialog open={activeModal === "checklist"} onOpenChange={(o) => !o && setActiveModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Upload WO Checklist</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <FileUploader onUpload={(fd) => setFormData(f => ({ ...f, checklistFile: fd }))} label="Upload Checklist" />
            {formData.checklistFile && (
              <p className="text-xs text-green-600 font-medium">✓ File ready: {formData.checklistFile.file_name}</p>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea placeholder="Checklist notes..." rows={2} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!formData.checklistFile}
                onClick={async () => {
                  if (formData.checklistFile) {
                    await handleAttachUpload(formData.checklistFile);
                    await base44.entities.Incidents.update(incidentId, { checklist_done: true });
                    await addAudit("WO Checklist Uploaded", formData.notes || `Checklist uploaded: ${formData.checklistFile?.file_name || ""}`, {
                      attachments: [formData.checklistFile.file_url],
                      attachment_names: [formData.checklistFile.file_name],
                    });
                    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
                    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
                    onRefresh();
                    toast({ title: "WO Checklist Uploaded" });
                  }
                  setActiveModal(null);
                  setFormData({});
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Status */}
      <StepModal open={activeModal === "status"} onOpenChange={(o) => !o && setActiveModal(null)} title="Update Incident Status" onConfirm={handleUpdateStatus}>
        <div className="space-y-1.5">
          <Label className="text-xs">New Status</Label>
          <Select value={formData.status || ""} onValueChange={v => setFormData(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              {["In Progress", "On Hold", "Resolved"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </StepModal>

      {/* Revisit */}
      <StepModal open={activeModal === "revisit"} onOpenChange={(o) => !o && setActiveModal(null)} title="Need Revisit?" onConfirm={handleRevisit}>
        <div className="space-y-1.5">
          <Label className="text-xs">Does this incident require a revisit?</Label>
          <Select value={formData.needs_revisit || ""} onValueChange={v => setFormData(f => ({ ...f, needs_revisit: v }))}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes — Create additional Corrective WO</SelectItem>
              <SelectItem value="no">No — Proceed to finalise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {formData.needs_revisit === "yes" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Revisit Notes</Label>
            <Textarea rows={2} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
          </div>
        )}
      </StepModal>

      {/* Finalise FMPI */}
      <StepModal open={activeModal === "finalise"} onOpenChange={(o) => !o && setActiveModal(null)} title="Finalise FMPI" onConfirm={handleFinalise}>
        {incident.is_owr && (
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-700">
            OWR Incident — CA Approval will be required before closure.
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Finalisation Notes</Label>
          <Textarea placeholder="Final notes..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </StepModal>

      {/* Close Incident */}
      <StepModal open={activeModal === "close"} onOpenChange={(o) => !o && setActiveModal(null)} title="Close Incident" onConfirm={handleClose}>
        {incident.is_owr && !flags.owr_fmpi_done && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
            ⚠ OWR Incident — ensure CA Approval has been obtained before closing.
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Closing Notes</Label>
          <Textarea placeholder="Closing notes..." rows={3} value={formData.notes || ""} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </StepModal>
    </div>
  );
}