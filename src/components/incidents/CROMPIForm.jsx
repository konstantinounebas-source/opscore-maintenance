/**
 * Combined Confirmation of Receipt + OMPI Form
 *
 * PRIORITY CONVENTION: P1 = Low (48h SLA), P2 = High/Urgent (24h SLA)
 *
 * Restoration of original CR and OMPI wording/guidance blocks,
 * now combined into one step per the new workflow design.
 *
 * Repair Deadline has been REMOVED from this form — it belongs to the CA Approval step.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import {
  computeCROMPISLA, computeFMPISLA,
  mergeRules, formatDeadline, deriveWorkflowStateFromLegacy,
  computePriorityDeadlines
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
  Lock, Paperclip, Clock, Info, Calendar, FileText, ClipboardCheck
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

function Section({ title, icon: SectionIcon, accent, children, subtitle }) {
  return (
    <div className={`bg-white rounded-xl border ${accent || "border-slate-200"} overflow-hidden`}>
      <div className={`flex items-start gap-2.5 px-5 py-3.5 border-b ${accent ? "border-inherit bg-slate-50/50" : "border-slate-100 bg-slate-50/30"}`}>
        {SectionIcon && <SectionIcon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />}
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function GuidanceBlock({ label, children }) {
  return (
    <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-1">
      <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">{label}</p>
      <div className="text-xs text-blue-800 leading-relaxed space-y-1">{children}</div>
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

  // ── SLA calculations — no repair deadline here ──
  const startAt = incident?.incident_created_at || incident?.created_date;

  const crOmpiSLA = useMemo(
    () => startAt ? computeCROMPISLA(startAt, operationalPriority, slaRulesData) : null,
    [startAt, operationalPriority, slaRulesData]
  );

  const nowIso = useMemo(() => new Date().toISOString(), []);

  const fmpiSLA = useMemo(
    () => warrantyStatus ? computeFMPISLA(nowIso, warrantyStatus, slaRulesData) : null,
    [nowIso, warrantyStatus, slaRulesData]
  );

  const subsystem = useMemo(() => deriveSubsystem(incident), [incident]);
  const assetId = incident?.related_asset_id;

  const { data: asset } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => assetId ? base44.entities.Assets.filter({ id: assetId }).then(r => r[0]) : null,
    enabled: !!assetId,
  });

  // Priority label helper — P1 = Low, P2 = High
  const priorityLabel = (p) => {
    if (p === "P1") return "P1 – Low Priority";
    if (p === "P2") return "P2 – High / Urgent";
    return p;
  };

  const handleSubmit = async (status = "Submitted") => {
    if (!operationalPriority) {
      toast({ title: "Select Operational Priority (P1 or P2)", variant: "destructive" });
      return;
    }
    if (!warrantyStatus) {
      toast({ title: "Select Warranty Status (In Warranty or OWR)", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const now = getAthensTimestamp();
      const fmpiApprovalRequired = warrantyStatus === "OWR";

      // Compute FMPI SLA (starts from CR+OMPI submission)
      const newFmpiSLA = computeFMPISLA(now, warrantyStatus, slaRulesData);

      // Recalculate SLA deadlines in case priority/owr changed at CR+OMPI
      const createdAt = incident?.incident_created_at || incident?.created_date || now;
      const isOWR = warrantyStatus === "OWR";
      const freshDeadlines = computePriorityDeadlines(createdAt, operationalPriority, isOWR, null);

      const incidentUpdates = {
        workflow_state: "CR_OMPI_Submitted",
        operational_priority: operationalPriority,
        warranty_status: warrantyStatus,
        make_safe_required: makeSafeRequired,
        inspection_required: inspectionRequired,
        fmpi_required: true,
        fmpi_approval_required: fmpiApprovalRequired,
        corrective_allowed: !fmpiApprovalRequired,
        cr_ompi_submitted_at: now,
        // Store/refresh the priority-based SLA deadlines
        ...freshDeadlines,
        // Advance SLA to FMPI phase
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
      await base44.entities.FormSubmissions.create({
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
        details: `CR+OMPI submitted. Priority: ${priorityLabel(operationalPriority)}. Warranty: ${warrantyStatus}. Make Safe Required: ${makeSafeRequired ? "Yes" : "No"}. Inspection Required: ${inspectionRequired ? "Yes" : "No"}. CA Approval Required: ${fmpiApprovalRequired ? "Yes" : "No"}.`,
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
      toast({ title: "CR + OMPI Submitted Successfully" });
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
              This CR+OMPI was already submitted on {formatDeadline(incident.cr_ompi_submitted_at)}. Resubmitting will update the incident classification.
            </div>
          )}

          {/* ── Section 1: Incident Details (read-only) ── */}
          <Section title="1. Incident Details" icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
              <ReadOnlyField label="Reported Date" value={incident?.reported_date || incident?.issue_date} />
              <ReadOnlyField label="Asset" value={incident?.related_asset_name || asset?.asset_id} />
              <ReadOnlyField label="Shelter Type" value={asset?.shelter_type || incident?.shelter_type} />
              <ReadOnlyField label="Province / City" value={asset?.city || incident?.province} />
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

          {/* ── Section 2: Confirmation of Receipt (restored wording block) ── */}
          <Section
            title="2. Confirmation of Receipt (CR)"
            icon={ClipboardCheck}
            accent="border-indigo-200"
            subtitle="Επιβεβαίωση λήψης και καταχώρησης του συμβάντος"
          >
            {/* Original CR guidance wording */}
            <GuidanceBlock label="Επιβεβαίωση Λήψης Αναφοράς">
              <p>
                Η παρούσα ενότητα αφορά την επιβεβαίωση λήψης (Confirmation of Receipt) της αναφοράς συμβάντος.
                Ο αρμόδιος επιβεβαιώνει ότι η αναφορά ελήφθη, καταχωρήθηκε στο σύστημα και αξιολογήθηκε
                αρχικά ώς προς την προτεραιότητα και τη φύση της βλάβης.
              </p>
              <p>
                Σε αυτό το στάδιο καθορίζεται:
              </p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Επιχειρησιακή Προτεραιότητα (P1 = Χαμηλή, P2 = Υψηλή/Επείγον)</li>
                <li>Κατάσταση Εγγύησης (Εντός / Εκτός Εγγύησης)</li>
                <li>Απαίτηση Make Safe (Άμεση ασφάλιση) εάν απαιτείται</li>
                <li>Απαίτηση Επιθεώρησης εάν απαιτείται</li>
              </ul>
              <p className="text-blue-700 font-semibold mt-1">
                Η επιβεβαίωση πρέπει να πραγματοποιηθεί εντός της προθεσμίας SLA:
                P2 (Επείγον): 24 ώρες · P1 (Κανονική): 48 ώρες από τη δημιουργία
              </p>
            </GuidanceBlock>

            {/* Priority selection — CORRECTED: P1 = Low, P2 = High */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Operational Priority * <span className="text-slate-400 font-normal">(P1 = Low · P2 = High/Urgent)</span>
              </Label>
              <div className="flex gap-2">
                {[
                  { val: "P1", label: "P1 – Low Priority", sublabel: "48h SLA", activeClass: "bg-blue-600 text-white border-blue-600" },
                  { val: "P2", label: "P2 – High / Urgent", sublabel: "24h SLA", activeClass: "bg-red-600 text-white border-red-600" },
                ].map(({ val, label, sublabel, activeClass }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setOperationalPriority(val)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      operationalPriority === val
                        ? activeClass
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div>{label}</div>
                    <div className={`text-[10px] font-normal mt-0.5 ${operationalPriority === val ? "opacity-80" : "text-slate-400"}`}>{sublabel}</div>
                  </button>
                ))}
              </div>
              {operationalPriority === "P2" && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> P2 High/Urgent: Make Safe consideration may apply. 24-hour SLA clock is active.
                </p>
              )}
            </div>

            {/* SLA deadline display (CR+OMPI only — no repair deadline) */}
            {crOmpiSLA && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-xs">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="font-semibold text-indigo-800">CR+OMPI Deadline: </span>
                  <span className="text-indigo-700 font-bold">{formatDeadline(crOmpiSLA.sla_deadline_at)}</span>
                  <span className="text-indigo-400 ml-2">
                    ({operationalPriority === "P2" ? "24h from creation (High/Urgent)" : "48h from creation (Low)"})
                  </span>
                </div>
              </div>
            )}
          </Section>

          {/* ── Section 3: OMPI — Outline Management Plan of Incident ── */}
          <Section
            title="3. OMPI – Outline Management Plan of Incident"
            icon={FileText}
            accent="border-amber-200"
            subtitle="Αρχικό Σχέδιο Διαχείρισης Περιστατικού"
          >
            {/* Original OMPI guidance wording */}
            <GuidanceBlock label="Outline Management Plan of Incident (OMPI)">
              <p>
                Το OMPI (Outline Management Plan of Incident) αποτελεί το αρχικό σχέδιο αντιμετώπισης
                του συμβάντος. Καταγράφει τις αρχικές αποφάσεις για τη διαχείριση της βλάβης,
                συμπεριλαμβανομένης της κατάστασης εγγύησης, των απαιτούμενων ενεργειών ασφάλισης
                και επιθεώρησης, καθώς και το αρχικό πλάνο διορθωτικής εργασίας.
              </p>
              <p>
                Οι αποφάσεις που λαμβάνονται εδώ:
              </p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Καθορίζουν το SLA για την υποβολή FMPI (7 ημέρες για OWR · 14 ημέρες για Εντός Εγγύησης)</li>
                <li>Καθορίζουν εάν απαιτείται έγκριση CA (μόνο για OWR)</li>
                <li>Ενεργοποιούν τυχόν Make Safe Work Order εάν επιλεγεί</li>
                <li>Ενεργοποιούν τυχόν Inspection Work Order εάν επιλεγεί</li>
              </ul>
            </GuidanceBlock>

            <div className="grid grid-cols-2 gap-4">

              {/* Warranty Status */}
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Warranty Status *</Label>
                <div className="flex gap-2">
                  {[
                    { val: "In Warranty", label: "Εντός Εγγύησης", sublabel: "In Warranty", color: "bg-emerald-600 border-emerald-600" },
                    { val: "OWR", label: "Εκτός Εγγύησης", sublabel: "Out of Warranty (OWR)", color: "bg-amber-600 border-amber-600" },
                  ].map(({ val, label, sublabel, color }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWarrantyStatus(val)}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                        warrantyStatus === val
                          ? `${color} text-white`
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <div>{label}</div>
                      <div className={`text-[10px] font-normal mt-0.5 ${warrantyStatus === val ? "opacity-80" : "text-slate-400"}`}>{sublabel}</div>
                    </button>
                  ))}
                </div>
                {warrantyStatus === "OWR" && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3" /> OWR: CA Approval will be required before corrective work. FMPI deadline: 7 calendar days.
                  </p>
                )}
                {warrantyStatus === "In Warranty" && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> In Warranty: No CA Approval required. FMPI deadline: 14 calendar days.
                  </p>
                )}
              </div>

              {/* Make Safe Required */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Make Safe Required?</Label>
                <div className="flex gap-2">
                  {[{ val: true, label: "Yes – Απαιτείται" }, { val: false, label: "No – Δεν Απαιτείται" }].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setMakeSafeRequired(val)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        makeSafeRequired === val
                          ? val ? "bg-orange-600 text-white border-orange-600" : "bg-slate-700 text-white border-slate-700"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {makeSafeRequired && (
                  <p className="text-[10px] text-orange-600">A Make Safe Work Order will be required.</p>
                )}
              </div>

              {/* Inspection Required */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Inspection Required?</Label>
                <div className="flex gap-2">
                  {[{ val: true, label: "Yes – Απαιτείται" }, { val: false, label: "No – Δεν Απαιτείται" }].map(({ val, label }) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setInspectionRequired(val)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        inspectionRequired === val
                          ? val ? "bg-blue-600 text-white border-blue-600" : "bg-slate-700 text-white border-slate-700"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {inspectionRequired && (
                  <p className="text-[10px] text-blue-600">An Inspection Work Order will be required.</p>
                )}
              </div>
            </div>

            {/* FMPI SLA preview (starts at submission) */}
            {fmpiSLA && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs">
                <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold text-amber-800">FMPI Deadline (after submission): </span>
                  <span className="text-amber-700 font-bold">{formatDeadline(fmpiSLA.sla_deadline_at)}</span>
                  <span className="text-amber-400 ml-2">
                    ({warrantyStatus === "OWR" ? "7 calendar days (OWR)" : "14 calendar days (In Warranty)"})
                  </span>
                </div>
              </div>
            )}

            {/* Outline Plan / Notes */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-slate-700">Outline Plan / Initial Assessment Notes</Label>
              <Textarea
                placeholder="Καταχωρήστε το αρχικό πλάνο αντιμετώπισης, αρχική εκτίμηση βλάβης, και οποιεσδήποτε σχετικές παρατηρήσεις..."
                rows={4}
                value={ompiNotes}
                onChange={e => setOmpiNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          </Section>

          {/* ── Section 4: Attachments ── */}
          <Section title="4. Attachments / Επισυναπτόμενα" icon={Paperclip}>
            <p className="text-xs text-slate-500">
              Επισυνάψτε φωτογραφικό υλικό, αναφορές ή οποιαδήποτε έγγραφα σχετικά με την αρχική επιθεώρηση.
            </p>
            <FileUploadArea
              label="Upload CR+OMPI Documents / Photos"
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