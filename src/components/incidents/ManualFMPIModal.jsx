/**
 * ManualFMPIModal
 *
 * Allows the user to upload a manually prepared FMPI document
 * as an alternative to filling the digital FMPI form.
 * Either path (digital or manual) is sufficient to advance the FMPI workflow step.
 */
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import { computeFMPISLA, computeRepairSLA } from "@/lib/slaEngine";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export default function ManualFMPIModal({ incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: slaRulesData = [] } = useQuery({
    queryKey: ["slaRules"],
    queryFn: () => base44.entities.SLARules.list(),
  });

  const warrantyStatus = incident?.warranty_status || "In Warranty";
  const fmpiApprovalRequired = incident?.fmpi_approval_required ?? (warrantyStatus === "OWR");

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({ title: "Upload required", description: "Please upload the manual FMPI document before submitting." });
      return;
    }

    setSaving(true);
    try {
      const now = getAthensTimestamp();

      // Mirror uploaded documents to IncidentAttachments
      for (const f of files) {
        await base44.entities.IncidentAttachments.create({
          incident_id: incidentId,
          file_url: f.file_url,
          file_name: f.file_name,
          file_type: "Document",
          uploaded_by: user?.email,
        });
      }

      // Create a FormSubmissions record to represent the manual FMPI
      await base44.entities.FormSubmissions.create({
        form_type: "combined_fmpi_invoice",
        form_name: "FMPI & Pricing Order (Manual Upload)",
        incident_id: incidentId,
        asset_id: incident?.related_asset_id || "",
        status: "Submitted",
        ektos_eggyhshs: warrantyStatus === "OWR" ? "Yes" : "No",
        apaiteitai_eggkrisi_ca: fmpiApprovalRequired ? "Yes" : "No",
        submitted_at: now,
        submitted_by: user?.email,
        form_data: {
          fmpi_submission_method: "Manual",
          manual_upload_notes: notes,
          manual_files: files.map(f => ({ url: f.file_url, name: f.file_name })),
        },
      });

      // Determine next workflow state — same logic as digital FMPI
      const nextWorkflowState = fmpiApprovalRequired ? "Awaiting_CA_Approval" : "FMPI_Submitted";

      // If In Warranty (no CA), start repair SLA from FMPI submission
      let repairSlaUpdates = {};
      if (!fmpiApprovalRequired) {
        const repairSLA = computeRepairSLA(now, warrantyStatus, slaRulesData);
        if (repairSLA) {
          repairSlaUpdates = {
            active_sla_code: repairSLA.active_sla_code,
            active_sla_name: repairSLA.active_sla_name,
            sla_started_at: now,
            sla_deadline_at: repairSLA.sla_deadline_at,
            sla_status: repairSLA.sla_status,
            repair_deadline_at: repairSLA.sla_deadline_at,
          };
        }
      }

      await base44.entities.Incidents.update(incidentId, {
        workflow_state: nextWorkflowState,
        fmpi_submitted_at: now,
        fmpi_approval_required: fmpiApprovalRequired,
        fmpi_submission_method: "Manual",
        corrective_allowed: !fmpiApprovalRequired,
        // Legacy compat
        owr_fmpi_done: true,
        ...repairSlaUpdates,
      });

      // Audit trail — clearly states manual FMPI was uploaded
      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "FMPI Submitted (Manual Upload)",
        details: `Manual FMPI document uploaded. ${files.length} file(s) attached. Warranty: ${warrantyStatus}. CA Approval Required: ${fmpiApprovalRequired ? "Yes" : "No"}. Workflow advanced to: ${nextWorkflowState}.${notes ? ` Notes: ${notes}` : ""}`,
        user: user?.email,
        attachments: files.map(f => f.file_url),
        attachment_names: files.map(f => f.file_name),
        attachment_metadata: files.map(f => ({
          url: f.file_url,
          name: f.file_name,
          author: user?.email,
          author_name: user?.full_name,
          created_at: now,
        })),
      });

      queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["fmpiSubmissions", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["formSubmissions", incidentId] });

      toast({ title: "Manual FMPI uploaded", description: `Workflow advanced to: ${nextWorkflowState}` });
      onDone?.();
    } catch (err) {
      toast({ title: "Error", description: err?.message || "Upload failed." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-600" />
            Upload Manual FMPI Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <p className="font-semibold mb-1">Manual FMPI Upload Path</p>
            <p>
              Upload the manually prepared FMPI document. This has the same workflow effect as
              submitting the digital form — the FMPI step will be marked as completed and the
              workflow will advance accordingly.
            </p>
            <p className="mt-1">
              <span className="font-semibold">Warranty:</span> {warrantyStatus} &nbsp;·&nbsp;
              <span className="font-semibold">CA Approval:</span> {fmpiApprovalRequired ? "Required" : "Not Required"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">FMPI Document(s) * <span className="text-red-500">(required)</span></Label>
            <FileUploader onUpload={fd => setFiles(prev => [...prev, fd])} label="Upload FMPI Document" multiple />
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                    <span className="truncate text-slate-700">{f.file_name}</span>
                    <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-red-500 ml-2 hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
            {files.length === 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> At least one FMPI document is required.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Add any notes about the manual FMPI submission..."
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleSubmit}
              disabled={saving || files.length === 0}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Submit Manual FMPI
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}