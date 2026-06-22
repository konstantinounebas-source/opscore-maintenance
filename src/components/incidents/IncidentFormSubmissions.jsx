import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, Clock, Download, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import FormViewerModal from "@/components/incidents/FormViewerModal";

const FORM_TYPE_LABELS = {
  cr_ompi:                          "Confirmation of Receipt + OMPI",
  outline_management_incident_plan: "Outline Management Incident Plan (Legacy)",
  combined_fmpi_invoice:            "FMPI & Pricing Order",
  make_safe_checklist:              "MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ",
  corrective_wo_checklist:          "Corrective Work Order Checklist",
  inspection_wo_checklist:          "Inspection WO Checklist",
  work_order_form_f:                "Work Order Invoice",
};

// Map form_type to the woType expected by FormViewerModal
const FORM_TYPE_TO_WO_TYPE = {
  make_safe_checklist:     "make_safe",
  corrective_wo_checklist: "corrective",
  inspection_wo_checklist: "inspection",
};

const STATUS_COLORS = {
  Draft:      "bg-slate-100 text-slate-600 border-slate-200",
  Submitted:  "bg-blue-100 text-blue-700 border-blue-200",
  Approved:   "bg-green-100 text-green-700 border-green-200",
  Rejected:   "bg-red-100 text-red-700 border-red-200",
};

function DownloadPDFButton({ submissionId, formName, formType }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const handleClick = async () => {
    setLoading(true);
    try {
      let pdfFunc;
      if (formType === 'make_safe_checklist') {
        pdfFunc = 'generateMakeSafeChecklistPDF';
      } else if (formType === 'corrective_wo_checklist') {
        pdfFunc = 'generateCorrectiveWOChecklistPDF';
      } else {
        pdfFunc = 'generateFormPDF';
      }
      const res = await base44.functions.invoke(pdfFunc, { submissionId });
      const { html, fileName } = res.data;
      const { generatePDFFromHtml } = await import("@/lib/generatePDFFromHtml");
      await generatePDFFromHtml(html, fileName || `${formName || 'form'}.pdf`);
    } catch (err) {
      toast({ title: "PDF Error", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      PDF
    </Button>
  );
}

export default function IncidentFormSubmissions({ incidentId, incident, onApprove }) {
  const [viewingSub, setViewingSub] = useState(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["formSubmissions", incidentId],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  const approveMutation = useMutation({
    mutationFn: async (submission) => {
      const user = await base44.auth.me();
      await base44.entities.FormSubmissions.update(submission.id, { status: "Approved" });
      await base44.entities.IncidentAuditTrail.create({
        incident_id: incidentId,
        action: "Form Approved",
        details: `${submission.form_name || submission.form_type} approved by ${user?.email}`,
        user: user?.email,
        attachments: submission.form_data?.photo_urls || [],
        attachment_metadata: (submission.form_data?.photo_urls || []).map((url, i) => ({
          url,
          name: `Photo ${i + 1}`,
          author: user?.email,
          author_name: user?.full_name || user?.email,
          created_at: new Date().toISOString(),
        })),
      });
      return submission;
    },
    onSuccess: (sub) => {
      queryClient.invalidateQueries({ queryKey: ["formSubmissions", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
      toast({ title: "Form approved", description: "The work order can now be closed." });
      if (onApprove) onApprove(sub);
    },
  });

  if (isLoading) {
    return <p className="text-xs text-slate-400 py-4 text-center">Loading forms...</p>;
  }

  if (submissions.length === 0) {
    return (
      <div className="py-8 text-center">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No forms submitted for this incident.</p>
        <p className="text-xs text-slate-400 mt-1">Use the workflow steps above to fill OMPI, FMPI, Make Safe, and Work Order forms.</p>
      </div>
    );
  }

  const sorted = [...submissions].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const woType = viewingSub ? FORM_TYPE_TO_WO_TYPE[viewingSub.form_type] : null;

  return (
    <div className="space-y-2">
      {sorted.map(sub => (
        <div key={sub.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {FORM_TYPE_LABELS[sub.form_type] || sub.form_name || sub.form_type}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${STATUS_COLORS[sub.status] || STATUS_COLORS.Draft}`}>
                  {sub.status}
                </span>
                {sub.created_date && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {format(new Date(sub.created_date), "dd/MM/yyyy, HH:mm")}
                  </span>
                )}
                {sub.submitted_at && sub.status === "Submitted" && (
                  <span className="text-xs text-slate-400">
                    Submitted: {format(new Date(sub.submitted_at), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
              {sub.form_data?.total_cost > 0 && (
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Total Cost: €{Number(sub.form_data.total_cost).toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 flex gap-1.5 items-center">
            {sub.status === "Submitted" && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => approveMutation.mutate(sub)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve
              </Button>
            )}
            {sub.status === "Approved" && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </span>
            )}
            {FORM_TYPE_TO_WO_TYPE[sub.form_type] && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setViewingSub(sub)}
              >
                <ExternalLink className="w-3 h-3" />
                View
              </Button>
            )}
            <DownloadPDFButton
              submissionId={sub.id}
              formName={FORM_TYPE_LABELS[sub.form_type] || sub.form_name}
              formType={sub.form_type}
            />
          </div>
        </div>
      ))}

      {viewingSub && woType && (
        <FormViewerModal
          woType={woType}
          incident={incident}
          incidentId={incidentId}
          submission={viewingSub}
          onClose={() => setViewingSub(null)}
        />
      )}
    </div>
  );
}