import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2, Circle, ChevronRight, ClipboardList,
  Wrench, Flag, CheckCircle, Loader2, XCircle
} from "lucide-react";

const STEPS = [
  { id: "response",   label: "Response & Assessment",   icon: ClipboardList, description: "OMPI · Inspection WO · Make Safe WO" },
  { id: "workorders", label: "Work Orders & Checklist", icon: Wrench,        description: "Corrective WO · OWR/FMPI · Checklist upload" },
  { id: "finalise",   label: "Finalise & Review",       icon: Flag,          description: "Status update · Revisit · Finalise FMPI" },
  { id: "close",      label: "Close Incident",          icon: CheckCircle,   description: "Close and resolve the incident" },
];

function StepDot({ completed, active }) {
  if (completed) return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (active)    return <div className="w-5 h-5 rounded-full border-2 border-indigo-500 bg-indigo-50 flex-shrink-0" />;
  return <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />;
}

function PersonSelect({ personList, person, setPerson, inputType, setInputType }) {
  return (
    <div className="space-y-2 border-t pt-4">
      <Label className="text-xs font-semibold">Person Responsible</Label>
      <Tabs value={inputType} onValueChange={setInputType}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
          <TabsTrigger value="select" className="text-xs">From List</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-2">
          <Input placeholder="Enter person name..." value={person} onChange={e => setPerson(e.target.value)} className="text-sm" />
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
  );
}

export default function IncidentWorkflow({ incident, incidentId, onRefresh }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(item => item.value);
    },
  });

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

  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState("");
  const [personInputType, setPersonInputType] = useState("manual");

  const resetModal = () => {
    setActiveModal(null);
    setFormData({});
    setPerson("");
    setPersonInputType("manual");
  };

  const addAudit = async (action, details, extra = {}, personOverride = "") => {
    const user = await base44.auth.me();
    const auditUser = personOverride || person || user?.email;
    await base44.entities.IncidentAuditTrail.create({ incident_id: incidentId, action, details, user: auditUser, ...extra });
  };

  const handleAttachUpload = async (fileData) => {
    const user = await base44.auth.me();
    await base44.entities.IncidentAttachments.create({ ...fileData, incident_id: incidentId, uploaded_by: user?.email });
    queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    onRefresh();
  };

  // ── Step 1: Response & Assessment ──────────────────────────────────
  const handleResponse = async () => {
    setSaving(true);
    const sla = incident.initial_priority === "P1" ? "P1: 24h from next working day" : "P2: Same working day";
    const updates = {};
    const auditLines = [];

    // OMPI
    if (formData.do_ompi) {
      await base44.entities.WorkOrders.create({
        work_order_id: `OMPI-${Date.now()}`,
        title: `OMPI - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: incident.initial_priority === "P1" ? "High" : "Medium",
        description: `Response/Confirmation of Receipt. SLA: ${sla}. ${formData.ompi_notes || ""}`,
      });
      updates.ompi_done = true;
      auditLines.push(`✔ OMPI created — SLA: ${sla}`);
    }

    // Inspection
    if (formData.do_inspection) {
      await base44.entities.WorkOrders.create({
        work_order_id: `INSP-${Date.now()}`,
        title: `Inspection WO - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: "High",
        description: formData.inspection_notes || "Inspection required",
      });
      updates.inspection_done = true;
      auditLines.push(`✔ Inspection WO created`);
      if (formData.inspectionFile) {
        await handleAttachUpload(formData.inspectionFile);
        auditLines.push(`  📎 Attached: ${formData.inspectionFile.file_name}`);
      }
    }

    // Make Safe
    if (formData.do_make_safe) {
      await base44.entities.WorkOrders.create({
        work_order_id: `MSAFE-${Date.now()}`,
        title: `Make Safe WO - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: "Critical",
        description: `Make Safe. SLA: 24h from Confirmation of Receipt. ${formData.make_safe_notes || ""}`,
      });
      updates.make_safe_done = true;
      auditLines.push(`✔ Make Safe WO created — SLA: 24h from Confirmation of Receipt`);
      if (formData.makeSafeFile) {
        await handleAttachUpload(formData.makeSafeFile);
        auditLines.push(`  📎 Attached: ${formData.makeSafeFile.file_name}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      await base44.entities.Incidents.update(incidentId, updates);
      await addAudit(
        "Response & Assessment",
        auditLines.join("\n"),
        {},
      );
      refreshAll();
      toast({ title: "Response & Assessment saved" });
    }

    // Handle close if requested
    if (formData.close_after) {
      await handleCloseIncident();
    }

    setSaving(false);
    resetModal();
  };

  // ── Step 2: Work Orders & Checklist ────────────────────────────────
  const handleWorkOrders = async () => {
    setSaving(true);
    const updates = {};
    const auditLines = [];

    if (formData.do_corrective) {
      await base44.entities.WorkOrders.create({
        work_order_id: `CORR-${Date.now()}`,
        title: `Corrective WO - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: incident.priority || "Medium",
        description: formData.corrective_notes || "Corrective maintenance",
        due_date: formData.due_date || "",
        assigned_to: formData.assigned_to || "",
      });
      updates.corrective_done = true;
      auditLines.push(`✔ Corrective WO created${formData.assigned_to ? ` — Assigned: ${formData.assigned_to}` : ""}${formData.due_date ? ` · Due: ${formData.due_date}` : ""}`);
      if (formData.corrective_notes) auditLines.push(`  Notes: ${formData.corrective_notes}`);
    }

    if (formData.do_owr_fmpi && incident.is_owr) {
      await base44.entities.WorkOrders.create({
        work_order_id: `FMPI-${Date.now()}`,
        title: `FMPI - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: "High",
        description: `FMPI created (OWR). CA Approval required. ${formData.fmpi_notes || ""}`,
      });
      updates.owr_fmpi_done = true;
      auditLines.push(`✔ FMPI (OWR) created — CA Approval required`);
    }

    if (formData.do_checklist && formData.checklistFile) {
      await handleAttachUpload(formData.checklistFile);
      updates.checklist_done = true;
      auditLines.push(`✔ WO Checklist uploaded — ${formData.checklistFile.file_name}`);
    }

    if (Object.keys(updates).length > 0) {
      await base44.entities.Incidents.update(incidentId, updates);
      const attachmentMeta = {};
      if (formData.do_checklist && formData.checklistFile) {
        attachmentMeta.attachments = [formData.checklistFile.file_url];
        attachmentMeta.attachment_names = [formData.checklistFile.file_name];
      }
      await addAudit("Work Orders & Checklist", auditLines.join("\n"), attachmentMeta);
      refreshAll();
      toast({ title: "Work Orders saved" });
    }

    if (formData.close_after) {
      await handleCloseIncident();
    }

    setSaving(false);
    resetModal();
  };

  // ── Step 3: Finalise & Review ──────────────────────────────────────
  const handleFinalise = async () => {
    setSaving(true);
    const updates = {};
    const auditLines = [];

    // Status update
    if (formData.new_status) {
      await base44.entities.Incidents.update(incidentId, { status: formData.new_status });
      auditLines.push(`✔ Status updated to: ${formData.new_status}`);
    }

    // Revisit
    if (formData.needs_revisit === "yes") {
      await base44.entities.WorkOrders.create({
        work_order_id: `CORR2-${Date.now()}`,
        title: `Revisit Corrective WO - ${incident.incident_id}`,
        related_asset_id: incident.related_asset_id,
        related_asset_name: incident.related_asset_name,
        status: "Open",
        priority: incident.priority || "Medium",
        description: formData.revisit_notes || "Revisit required",
      });
      auditLines.push(`✔ Revisit WO created`);
      if (formData.revisit_notes) auditLines.push(`  Notes: ${formData.revisit_notes}`);
      updates.revisit_done = true;
    } else if (formData.needs_revisit === "no") {
      auditLines.push(`✔ No revisit required`);
      updates.revisit_done = true;
    }

    // Finalise FMPI
    if (formData.do_finalise) {
      updates.finalise_done = true;
      auditLines.push(`✔ FMPI Finalised`);
      if (formData.finalise_notes) auditLines.push(`  Notes: ${formData.finalise_notes}`);
      if (incident.is_owr) auditLines.push(`  ⚠ OWR — CA Approval required before closure`);
    }

    if (Object.keys(updates).length > 0 || formData.new_status) {
      await base44.entities.Incidents.update(incidentId, updates);
      await addAudit("Finalise & Review", auditLines.join("\n"));
      refreshAll();
      toast({ title: "Finalise & Review saved" });
    }

    if (formData.close_after) {
      await handleCloseIncident();
    }

    setSaving(false);
    resetModal();
  };

  // ── Close Incident (shared) ─────────────────────────────────────────
  const handleCloseIncident = async () => {
    await base44.entities.Incidents.update(incidentId, { status: "Closed" });
    await addAudit("Incident Closed", formData.closing_notes ? `Closing notes: ${formData.closing_notes}` : "Incident closed and resolved.");
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    onRefresh();
    toast({ title: "Incident Closed" });
  };

  const handleCloseStep = async () => {
    setSaving(true);
    await handleCloseIncident();
    setSaving(false);
    resetModal();
  };

  // ── Completion logic ────────────────────────────────────────────────
  const isCompleted = (id) => {
    switch (id) {
      case "response":   return flags.ompi_done;
      case "workorders": return flags.corrective_done || flags.checklist_done;
      case "finalise":   return flags.finalise_done;
      case "close":      return flags.closed;
      default:           return false;
    }
  };

  const activeStepId = STEPS.find(s => !isCompleted(s.id))?.id;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Workflow Progress</p>

      <div className="space-y-1">
        {STEPS.map((step, idx) => {
          const completed = isCompleted(step.id);
          const active = step.id === activeStepId;
          const Icon = step.icon;
          return (
            <div key={step.id}>
              <button
                onClick={() => { setFormData({}); setPerson(""); setPersonInputType("manual"); setActiveModal(step.id); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left cursor-pointer
                  ${active ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-slate-50"}
                `}
              >
                <StepDot completed={completed} active={active} />
                <Icon className={`w-4 h-4 flex-shrink-0 ${completed ? "text-green-500" : active ? "text-indigo-600" : "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm block ${completed ? "line-through text-slate-400" : active ? "text-indigo-700 font-medium" : "text-slate-600"}`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-slate-400">{step.description}</span>
                </div>
                {active && <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />}
              </button>
              {idx < STEPS.length - 1 && <div className="ml-5 w-px h-3 bg-slate-200" />}
            </div>
          );
        })}
      </div>

      {/* ── Modal: Response & Assessment ── */}
      <Dialog open={activeModal === "response"} onOpenChange={(o) => !o && resetModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Response & Assessment</DialogTitle></DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
              <strong>SLA:</strong> P1 — 24h from next working day &nbsp;|&nbsp; P2 — Same working day
            </div>

            {/* OMPI */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="do_ompi" checked={!!formData.do_ompi} onCheckedChange={v => setFormData(f => ({ ...f, do_ompi: v }))} />
                <label htmlFor="do_ompi" className="text-sm font-medium cursor-pointer">Create OMPI / Confirmation of Receipt</label>
                {flags.ompi_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
              </div>
              {formData.do_ompi && (
                <Textarea placeholder="OMPI notes..." rows={2} value={formData.ompi_notes || ""} onChange={e => setFormData(f => ({ ...f, ompi_notes: e.target.value }))} className="text-sm" />
              )}
            </div>

            {/* Inspection */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="do_inspection" checked={!!formData.do_inspection} onCheckedChange={v => setFormData(f => ({ ...f, do_inspection: v }))} />
                <label htmlFor="do_inspection" className="text-sm font-medium cursor-pointer">Create Inspection WO</label>
                {flags.inspection_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
              </div>
              {formData.do_inspection && (
                <div className="space-y-2">
                  <Textarea placeholder="Describe inspection scope..." rows={2} value={formData.inspection_notes || ""} onChange={e => setFormData(f => ({ ...f, inspection_notes: e.target.value }))} className="text-sm" />
                  <div>
                    <Label className="text-xs mb-1 block">Upload Inspection Form</Label>
                    <FileUploader onUpload={(fd) => setFormData(f => ({ ...f, inspectionFile: fd }))} label={formData.inspectionFile ? formData.inspectionFile.file_name : "Upload Form"} />
                  </div>
                </div>
              )}
            </div>

            {/* Make Safe */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="do_make_safe" checked={!!formData.do_make_safe} onCheckedChange={v => setFormData(f => ({ ...f, do_make_safe: v }))} />
                <label htmlFor="do_make_safe" className="text-sm font-medium cursor-pointer">Create Make Safe WO</label>
                {flags.make_safe_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
              </div>
              {formData.do_make_safe && (
                <div className="space-y-2">
                  <div className="p-2 bg-red-50 rounded border border-red-200 text-xs text-red-700">SLA: 24h from Confirmation of Receipt</div>
                  <Textarea placeholder="Make safe actions required..." rows={2} value={formData.make_safe_notes || ""} onChange={e => setFormData(f => ({ ...f, make_safe_notes: e.target.value }))} className="text-sm" />
                  <div>
                    <Label className="text-xs mb-1 block">Upload Make Safe Form</Label>
                    <FileUploader onUpload={(fd) => setFormData(f => ({ ...f, makeSafeFile: fd }))} label={formData.makeSafeFile ? formData.makeSafeFile.file_name : "Upload Form"} />
                  </div>
                </div>
              )}
            </div>

            <PersonSelect personList={personList} person={person} setPerson={setPerson} inputType={personInputType} setInputType={setPersonInputType} />

            {/* Close option */}
            <div className="flex items-center gap-2 border-t pt-3">
              <Checkbox id="close_after_r" checked={!!formData.close_after} onCheckedChange={v => setFormData(f => ({ ...f, close_after: v }))} />
              <label htmlFor="close_after_r" className="text-sm text-slate-600 cursor-pointer">Close incident after saving</label>
            </div>
            {formData.close_after && (
              <Textarea placeholder="Closing notes..." rows={2} value={formData.closing_notes || ""} onChange={e => setFormData(f => ({ ...f, closing_notes: e.target.value }))} className="text-sm" />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetModal}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleResponse} disabled={saving || !person.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {saving ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Work Orders & Checklist ── */}
      <Dialog open={activeModal === "workorders"} onOpenChange={(o) => !o && resetModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Work Orders & Checklist</DialogTitle></DialogHeader>
          <div className="space-y-5 mt-2">

            {/* Corrective WO */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="do_corrective" checked={!!formData.do_corrective} onCheckedChange={v => setFormData(f => ({ ...f, do_corrective: v }))} />
                <label htmlFor="do_corrective" className="text-sm font-medium cursor-pointer">Create Corrective WO</label>
                {flags.corrective_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
              </div>
              {formData.do_corrective && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Assigned To</Label>
                      <Input placeholder="Technician..." value={formData.assigned_to || ""} onChange={e => setFormData(f => ({ ...f, assigned_to: e.target.value }))} className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={formData.due_date || ""} onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))} className="text-sm" />
                    </div>
                  </div>
                  <Textarea placeholder="Describe corrective work..." rows={2} value={formData.corrective_notes || ""} onChange={e => setFormData(f => ({ ...f, corrective_notes: e.target.value }))} className="text-sm" />
                </div>
              )}
            </div>

            {/* OWR FMPI — only for OWR incidents */}
            {incident.is_owr && (
              <div className="space-y-2 border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="do_owr_fmpi" checked={!!formData.do_owr_fmpi} onCheckedChange={v => setFormData(f => ({ ...f, do_owr_fmpi: v }))} />
                  <label htmlFor="do_owr_fmpi" className="text-sm font-medium cursor-pointer">Create FMPI (OWR)</label>
                  {flags.owr_fmpi_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
                </div>
                {formData.do_owr_fmpi && (
                  <div className="space-y-2">
                    <div className="p-2 bg-purple-50 rounded border border-purple-200 text-xs text-purple-700">CA Approval will be required after FMPI creation.</div>
                    <Textarea placeholder="FMPI details..." rows={2} value={formData.fmpi_notes || ""} onChange={e => setFormData(f => ({ ...f, fmpi_notes: e.target.value }))} className="text-sm" />
                  </div>
                )}
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="do_checklist" checked={!!formData.do_checklist} onCheckedChange={v => setFormData(f => ({ ...f, do_checklist: v }))} />
                <label htmlFor="do_checklist" className="text-sm font-medium cursor-pointer">Upload WO Checklist</label>
                {flags.checklist_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
              </div>
              {formData.do_checklist && (
                <FileUploader onUpload={(fd) => setFormData(f => ({ ...f, checklistFile: fd }))} label={formData.checklistFile ? formData.checklistFile.file_name : "Upload Checklist"} />
              )}
            </div>

            <PersonSelect personList={personList} person={person} setPerson={setPerson} inputType={personInputType} setInputType={setPersonInputType} />

            {/* Close option */}
            <div className="flex items-center gap-2 border-t pt-3">
              <Checkbox id="close_after_wo" checked={!!formData.close_after} onCheckedChange={v => setFormData(f => ({ ...f, close_after: v }))} />
              <label htmlFor="close_after_wo" className="text-sm text-slate-600 cursor-pointer">Close incident after saving</label>
            </div>
            {formData.close_after && (
              <Textarea placeholder="Closing notes..." rows={2} value={formData.closing_notes || ""} onChange={e => setFormData(f => ({ ...f, closing_notes: e.target.value }))} className="text-sm" />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetModal}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleWorkOrders} disabled={saving || !person.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {saving ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Finalise & Review ── */}
      <Dialog open={activeModal === "finalise"} onOpenChange={(o) => !o && resetModal()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Finalise & Review</DialogTitle></DialogHeader>
          <div className="space-y-5 mt-2">

            {/* Status Update */}
            <div className="space-y-2 border rounded-lg p-3">
              <Label className="text-sm font-medium">Update Incident Status</Label>
              <Select value={formData.new_status || ""} onValueChange={v => setFormData(f => ({ ...f, new_status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select new status (optional)" /></SelectTrigger>
                <SelectContent>
                  {["In Progress", "On Hold", "Resolved"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Revisit */}
            <div className="space-y-2 border rounded-lg p-3">
              <Label className="text-sm font-medium">Revisit Required?</Label>
              <Select value={formData.needs_revisit || ""} onValueChange={v => setFormData(f => ({ ...f, needs_revisit: v }))}>
                <SelectTrigger><SelectValue placeholder="Select (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — Create additional Corrective WO</SelectItem>
                  <SelectItem value="no">No — Proceed to finalise</SelectItem>
                </SelectContent>
              </Select>
              {formData.needs_revisit === "yes" && (
                <Textarea placeholder="Revisit notes..." rows={2} value={formData.revisit_notes || ""} onChange={e => setFormData(f => ({ ...f, revisit_notes: e.target.value }))} className="text-sm" />
              )}
            </div>

            {/* Finalise FMPI */}
            <div className="space-y-2 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Checkbox id="do_finalise" checked={!!formData.do_finalise} onCheckedChange={v => setFormData(f => ({ ...f, do_finalise: v }))} />
                <label htmlFor="do_finalise" className="text-sm font-medium cursor-pointer">Finalise FMPI</label>
                {flags.finalise_done && <span className="ml-auto text-xs text-green-600 font-medium">✓ Done</span>}
              </div>
              {formData.do_finalise && (
                <div className="space-y-2">
                  {incident.is_owr && (
                    <div className="p-2 bg-purple-50 rounded border border-purple-200 text-xs text-purple-700">OWR Incident — CA Approval required before closure.</div>
                  )}
                  <Textarea placeholder="Finalisation notes..." rows={2} value={formData.finalise_notes || ""} onChange={e => setFormData(f => ({ ...f, finalise_notes: e.target.value }))} className="text-sm" />
                </div>
              )}
            </div>

            <PersonSelect personList={personList} person={person} setPerson={setPerson} inputType={personInputType} setInputType={setPersonInputType} />

            {/* Close option */}
            <div className="flex items-center gap-2 border-t pt-3">
              <Checkbox id="close_after_f" checked={!!formData.close_after} onCheckedChange={v => setFormData(f => ({ ...f, close_after: v }))} />
              <label htmlFor="close_after_f" className="text-sm text-slate-600 cursor-pointer">Close incident after saving</label>
            </div>
            {formData.close_after && (
              <Textarea placeholder="Closing notes..." rows={2} value={formData.closing_notes || ""} onChange={e => setFormData(f => ({ ...f, closing_notes: e.target.value }))} className="text-sm" />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetModal}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleFinalise} disabled={saving || !person.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {saving ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Close Incident ── */}
      <Dialog open={activeModal === "close"} onOpenChange={(o) => !o && resetModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Close Incident</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {incident.is_owr && !flags.owr_fmpi_done && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
                ⚠ OWR Incident — ensure CA Approval has been obtained before closing.
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Closing Notes</Label>
              <Textarea placeholder="Closing notes..." rows={3} value={formData.closing_notes || ""} onChange={e => setFormData(f => ({ ...f, closing_notes: e.target.value }))} />
            </div>
            <PersonSelect personList={personList} person={person} setPerson={setPerson} inputType={personInputType} setInputType={setPersonInputType} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetModal}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCloseStep} disabled={saving || !person.trim()}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {saving ? "Closing..." : "Close Incident"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}