/**
 * Combined Confirmation of Receipt + OMPI Form
 *
 * Replaces the old split "Confirmation of Receipt" modal + "OutlineManagementForm".
 * Calculates SLA deadlines from the central engine — no manual deadline entry.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import {
  computeCROMPISLA, computeFMPISLA, computeRepairSLA,
  mergeRules, formatDeadline, deriveWorkflowStateFromLegacy
} from "@/lib/slaEngine";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Send, AlertTriangle, CheckCircle2,
  Lock, Paperclip, Clock, Info, Calendar
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import FileUploadArea from "@/components/shared/FileUploadArea";

function ReadOnlyField({ label, value, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <span className="flex-1">{value ?? children ?? <span className="text-slate-300 italic">—</span>}</span>
      </div>
    </div>
  );
}

function Section({ title, icon: SectionIcon, accent, children }) {
  return (
    <div className={`bg-white rounded-xl border ${accent || "border-slate-200"} overflow-hidden`}>
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${accent ? "border-inherit bg-slate-50/50" : "border-slate-100 bg-slate-50/30"}`}>
        {SectionIcon && <SectionIcon className="w-4 h-4 text-slate-500" />}
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function deriveSubsystem(incident) {
  const parts = [];
  if (incident?.subsystem_structural_selected) parts.push("Structural");
  if (incident?.subsystem_electrical_selected) parts.push("Electrical");
  if (incident?.subsystem_electronic_selected) parts.push("Electronic");
  if (incident?.subsystem_other_selected) parts.push("Other");
  return parts.join(", ") || "—";
}

export default function CROMPIForm({ incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!(incident?.cr_ompi_submitted_at);

  // Load SLA rules from config
  const { data: slaRulesData = [] } = useQuery({
    queryKey: ["slaRules"],
    queryFn: () => base44.entities.SLARules.list(),
  });

  // ── Form state ──
  const [operationalPriority, setOperationalPriority] = useState(
    incident?.operational_priority || incident?.initial_priority || ""
  );
  const [warrantyStatus, setWarrantyStatus] = useState(
    incident?.warranty_status ||
    (incident?.is_owr === true ? "OWR" : incident?.is_owr === false ? "In Warranty" : "")
  );
  const [makeSafeRequired, setMakeSafeRequired] = useState(
    incident?.make_safe_required ?? incident?.requires_make_safe ?? false
  );
  const [inspectionRequired, setInspectionRequired] = useState(
    incident?.inspection_required ?? false
  );
  const [ompiNotes, setOmpiNotes] = useState(incident?.description || "");
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);

  // ── SLA calculations (all derived, no manual entry) ──
  const startAt = incident?.incident_created_at || incident?.created_date;
  const slaRules = useMemo(() => mergeRules(slaRulesData), [slaRulesData]);

  const crOmpiSLA = useMemo(
    () => startAt ? computeCROMPISLA(startAt, operationalPriority, slaRulesData) : null,
    [startAt, operationalPriority, slaRulesData]
  );

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const fmpiSLA = useMemo(
    () => warrantyStatus ? computeFMPISLA(nowIso, warrantyStatus, slaRulesData) : null,
    [nowIso, warrantyStatus, slaRulesData]
  );

  const repairSLA = useMemo(
    () => warrantyStatus ? computeRepairSLA(nowIso, warrantyStatus, slaRulesData) : null,
    [nowIso, warrantyStatus, slaRulesData]
  );

  const subsystem = useMemo(() => deriveSubsystem(incident), [incident]);
  const assetId = incident?.related_asset_id;

  const { data: asset } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => assetId ? base44.entities.Assets.filter({ id: assetId }).then(r => r[0]) : null,
    enabled: !!assetId,
  });

  const handleSubmit = async (status = "Submitted") => {
    if (!operationalPriority) {
      toast({ title: "Select Operational Priority (P1/P2)", variant: "destructive" });
      return;
    }
    if (!warrantyStatus) {
      toast({ title: "Select Warranty Status", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const now = getAthensTimestamp();
      const fmpiApprovalRequired = warrantyStatus === "OWR";

      // Determine next workflow state
      let nextState = "CR_OMPI_Submitted";
      // If make safe required, we allow both FMPI and Make Safe simultaneously
      // If only inspection required, same approach
      // State transitions happen from UI actions, not form submission alone

      // Compute FMPI SLA (starts now)
      const newFmpiSLA = computeFMPISLA(now, warrantyStatus, slaRulesData);

      const incidentUpdates = {
        workflow_state: nextState,
        operational_priority: operationalPriority,
        warranty_status: warrantyStatus,
        make_safe_required: makeSafeRequired,
        inspection_required: inspectionRequired,
        fmpi_required: true,
        fmpi_approval_required: fmpiApprovalRequired,
        corrective_allowed: !fmpiApprovalRequired, // In Warranty can proceed after FMPI submit
        cr_ompi_submitted_at: now,
        // Advance SLA to FMPI
        active_sla_code: newFmpiSLA?.active_sla_code || null,
        active_sla_name: newFmpiSLA?.active_sla_name || null,
        sla_started_at: now,
        sla_deadline_at: newFmpiSLA?.sla_deadline_at || null,
        sla_status: newFmpiSLA?.sla_status || null,
        previous_sla_code: crOmpiSLA?.active_sla_code || incident?.active_sla_code || null,
        previous_sla_completed_at: now,
        // Legacy compat
        confirmation_done: true,
        ompi_done: true,
        out_of_warranty: warrantyStatus === "OWR" ? "Yes" : "No",
        is_owr: warrantyStatus === "OWR",
      };

      await base44.entities.Incidents.update(incidentId, incidentUpdates);

      // Create FormSubmissions record
      const allFiles = attachments.filter(f => f?.url);
      const formResult = await base44.entities.FormSubmissions.create({
        form_type: "cr_ompi",
        form_name: "Confirmation of Receipt + OMPI",
        incident_id: incidentId,
        asset_id: incident?.related_asset_id || "",
        status: "Submitted",
        ektos_eggyhshs: warrantyStatus === "OWR" ? "Yes" : "No",
        apaiteitai_eggkrisi_ca: fmpiApprovalRequired ? "Yes" : "No",
        submitted_at: now,
        submitted_by: user?.email,
        form_data: {
          operational_priority: operationalPriority,
          warranty_status: warrantyStatus,
          make_safe_required: makeSafeRequired,
          inspection_required: inspectionRequired,
          ompi_notes: ompiNotes,
          attachments,
          sla_cr_ompi_deadline: crOmpiSLA?.sla_deadline_at,
          sla_fmpi_deadline: newFmpiSLA?.sla_deadline_at,
          sla_repair_deadline: repairSLA?.sla_deadline_at,
        },
      });

      // Mirror attachments
      if (allFiles.length > 0) {
        await Promise.all(allFiles.map(f =>
          base44.entities.IncidentAttachments.create({
            incident_id: incidentId,
            file_url: f.url,
            file_name: f.name || f.url.split("/").pop(),
            file_type: /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || "") ? "Photo" : "Document",
            uploaded_by: user?.email,
          })
        ));
      }

      // Audit trail
      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "CR+OMPI Submitted",
        details: `CR+OMPI submitted. Priority: ${operationalPriority}. Warranty: ${warrantyStatus}. Make Safe: ${makeSafeRequired ? "Yes" : "No"}. Inspection: ${inspectionRequired ? "Yes" : "No"}. CA Approval Required: ${fmpiApprovalRequired ? "Yes" : "No"}.`,
        user: user?.email,
        ...(allFiles.length > 0 ? {
          attachment_metadata: allFiles.map(f => ({
            url: f.url,
            name: f.name,
            author: user?.email,
            author_name: user?.full_name,
            created_at: now,
          }))
        } : {}),
      });

      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["formSubmissions", incidentId] });
      toast({ title: "CR + OMPI Submitted" });
      onDone?.();
    } catch (err) {
      console.error("CROMPIForm error:", err);
      toast({ title: "Error", description: err?.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Confirmation of Receipt + OMPI"
        subtitle={isEditing ? "Re-submission" : "New Submission"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <Button size="sm" onClick={() => handleSubmit("Submitted")} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" /> {saving ? "Submitting..." : "Submit CR + OMPI"}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-5">

          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              This CR+OMPI was already submitted. Resubmitting will update the incident classification.
            </div>
          )}

          {/* Section 1: Incident Summary (read-only) */}
          <Section title="1. Incident Details" icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
              <ReadOnlyField label="Reported Date" value={incident?.reported_date || incident?.issue_date} />
              <ReadOnlyField label="Asset" value={incident?.related_asset_name || asset?.asset_id} />
              <ReadOnlyField label="Shelter Type" value={asset?.shelter_type || incident?.shelter_type} />
              <ReadOnlyField label="Province" value={asset?.city || incident?.province} />
              <ReadOnlyField label="Municipality" value={asset?.municipality || incident?.municipality} />
              <div className="col-span-2">
                <ReadOnlyField label="Affected Subsystems" value={subsystem} />
              </div>
              {incident?.damage_description && (
                <div className="col-span-2">
                  <ReadOnlyField label="Damage Description" value={incident.damage_description} />
                </div>
              )}
            </div>
          </Section>

          {/* Section 2: Classification Decisions */}
          <Section title="2. Classification & Decisions" accent="border-amber-200">
            <div className="grid grid-cols-2 gap-4">

              {/* Operational Priority */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Operational Priority *
                </Label>
                <div className="flex gap-2">
                  {["P1", "P2"].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOperationalPriority(p)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                        operationalPriority === p
                          ? p === "P1"
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {p === "P1" ? "P1 – High" : "P2 – Medium"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warranty Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Warranty Status *
                </Label>
                <div className="flex gap-2">
                  {[{ val: "In Warranty", label: "In Warranty", color: "bg-emerald-600 border-emerald-600" }, { val: "OWR", label: "Out of Warranty", color: "bg-amber-600 border-amber-600" }].map(({ val, label, color }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWarrantyStatus(val)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                        warrantyStatus === val
                          ? `${color} text-white`
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {warrantyStatus === "OWR" && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> CA Approval will be required before corrective work.
                  </p>
                )}
              </div>

              {/* Make Safe Required */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Make Safe Required?</Label>
                <div className="flex gap-2">
                  {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setMakeSafeRequired(val)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        makeSafeRequired === val
                          ? val ? "bg-orange-600 text-white border-orange-600" : "bg-slate-700 text-white border-slate-700"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspection Required */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Inspection Required?</Label>
                <div className="flex gap-2">
                  {[{ val: true, label: "Yes" }, { val: false, label: "No" }].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setInspectionRequired(val)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        inspectionRequired === val
                          ? val ? "bg-blue-600 text-white border-blue-600" : "bg-slate-700 text-white border-slate-700"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* OMPI Notes */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-semibold text-slate-700">Outline Plan / Notes</Label>
              <Textarea
                placeholder="Outline plan, initial assessment, and any relevant notes..."
                rows={4}
                value={ompiNotes}
                onChange={e => setOmpiNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </Section>

          {/* Section 3: SLA Deadlines (system-calculated, read-only) */}
          <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-blue-100 bg-blue-50/60">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">3. SLA Deadlines</h3>
              <span className="ml-auto text-xs text-blue-500 font-medium px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                System-Calculated
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> CR+OMPI Deadline
                </Label>
                <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm">
                  <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="text-slate-700 text-xs font-semibold">
                    {crOmpiSLA ? formatDeadline(crOmpiSLA.sla_deadline_at) : "Select priority"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {operationalPriority === "P1" ? "24h from creation" : operationalPriority === "P2" ? "48h from creation" : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> FMPI Deadline
                </Label>
                <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm">
                  <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="text-slate-700 text-xs font-semibold">
                    {fmpiSLA ? formatDeadline(fmpiSLA.sla_deadline_at) : "Select warranty status"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {warrantyStatus === "OWR" ? "7 calendar days from CR+OMPI" : warrantyStatus === "In Warranty" ? "14 calendar days from CR+OMPI" : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Repair Deadline
                </Label>
                <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm">
                  <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                  <span className="text-slate-700 text-xs font-semibold">
                    {repairSLA ? formatDeadline(repairSLA.sla_deadline_at) : "Select warranty status"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {warrantyStatus === "OWR" ? "21 days from CA approval" : warrantyStatus === "In Warranty" ? "28 days from FMPI submit" : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Attachments */}
          <Section title="4. Attachments" icon={Paperclip}>
            <FileUploadArea
              label="Upload CR+OMPI Documents"
              files={attachments}
              onChange={setAttachments}
            />
          </Section>

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pt-2 pb-8">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => handleSubmit("Submitted")} disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
              <Send className="w-4 h-4" /> {saving ? "Submitting..." : "Submit CR + OMPI"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}