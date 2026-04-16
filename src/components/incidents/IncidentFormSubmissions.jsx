import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Clock } from "lucide-react";
import { format } from "date-fns";

const FORM_TYPE_LABELS = {
  outline_management_incident_plan: "Outline Management Incident Plan",
  combined_fmpi_invoice:    "FMPI & Pricing Order",
  make_safe_checklist:      "MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ",
  work_order_form_f:        "Work Order Invoice",
};

const STATUS_COLORS = {
  Draft:      "bg-slate-100 text-slate-600 border-slate-200",
  Submitted:  "bg-blue-100 text-blue-700 border-blue-200",
  Approved:   "bg-green-100 text-green-700 border-green-200",
  Rejected:   "bg-red-100 text-red-700 border-red-200",
};

export default function IncidentFormSubmissions({ incidentId }) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["formSubmissions", incidentId],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
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
        </div>
      ))}
    </div>
  );
}