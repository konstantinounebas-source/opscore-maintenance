import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Eye, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import OutlineManagementForm from "@/components/forms/OutlineManagementForm";
import CombinedFMPIandInvoiceForm from "@/components/forms/CombinedFMPIandInvoiceForm";
import MakeSafeChecklistForm from "@/components/forms/MakeSafeChecklistForm";
import IncidentReportForm from "@/components/forms/IncidentReportForm";

const STATUS_BADGE = {
  Draft:     "bg-slate-100 text-slate-600",
  Submitted: "bg-blue-100 text-blue-700",
  Approved:  "bg-emerald-100 text-emerald-700",
  Rejected:  "bg-red-100 text-red-700",
};

const STATUS_ICON = {
  Draft:     <Clock className="w-3.5 h-3.5" />,
  Submitted: <FileText className="w-3.5 h-3.5" />,
  Approved:  <CheckCircle2 className="w-3.5 h-3.5" />,
  Rejected:  <XCircle className="w-3.5 h-3.5" />,
};

const FORM_TEMPLATES = [
  { id: "outline_management_incident_plan", name: "Outline Management Plan (OMPI)", shortName: "OMPI" },
  { id: "combined_fmpi_invoice",            name: "Full Management Plan (FMPI)",    shortName: "FMPI" },
  { id: "make_safe_checklist",              name: "Make-Safe Checklist",            shortName: "Make Safe" },
  { id: "incident_report",                  name: "Incident Report",                shortName: "Incident Report" },
];

export default function IncidentFormsTab({ incidentId, incident }) {
  const queryClient = useQueryClient();
  const [activeForm, setActiveForm] = useState(null); // { formType, submission }

  const { data: submissions = [], refetch } = useQuery({
    queryKey: ["formSubmissions", incidentId],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: assets = [] }    = useQuery({ queryKey: ["assets"],    queryFn: () => base44.entities.Assets.list() });
  const { data: workOrders = [] }= useQuery({ queryKey: ["workOrders"],queryFn: () => base44.entities.WorkOrders.list() });
  const { data: crews = [] }     = useQuery({ queryKey: ["crews"],     queryFn: () => base44.entities.Crews.list() });
  const { data: childAssets = [] }=useQuery({ queryKey: ["childAssets"],queryFn: () => base44.entities.ChildAssets.list() });

  const handleClose = () => {
    setActiveForm(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
  };

  // Render active form full-screen
  if (activeForm) {
    const { formType, submission } = activeForm;

    // Pre-build a fake submission to pre-link incident & asset
    const preLinked = submission || {
      incident_id: incidentId,
      asset_id: incident?.related_asset_id || "",
    };

    if (formType === "combined_fmpi_invoice") {
      return <CombinedFMPIandInvoiceForm submission={preLinked.id ? preLinked : null} incidents={incidents} assets={assets} workOrders={workOrders} crews={crews} childAssets={childAssets} onClose={handleClose} defaultIncidentId={!preLinked.id ? incidentId : undefined} />;
    }
    if (formType === "make_safe_checklist") {
      return <MakeSafeChecklistForm submission={preLinked.id ? preLinked : null} incidents={incidents} assets={assets} workOrders={workOrders} onClose={handleClose} defaultIncidentId={!preLinked.id ? incidentId : undefined} />;
    }
    if (formType === "incident_report") {
      return <IncidentReportForm submission={preLinked.id ? preLinked : null} incidents={incidents} assets={assets} onClose={handleClose} defaultIncidentId={!preLinked.id ? incidentId : undefined} />;
    }
    // Default: outline management
    return <OutlineManagementForm submission={preLinked.id ? preLinked : null} incidents={incidents} assets={assets} workOrders={workOrders} crews={crews} onClose={handleClose} defaultIncidentId={!preLinked.id ? incidentId : undefined} />;
  }

  return (
    <div className="space-y-5">
      {/* Quick-launch form buttons */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Fill a Form</p>
        <div className="grid grid-cols-2 gap-2">
          {FORM_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => setActiveForm({ formType: tmpl.id, submission: null })}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all text-left"
            >
              <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-700 truncate">{tmpl.shortName}</div>
                <div className="text-[10px] text-slate-400">New submission</div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Submitted forms for this incident */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Submissions ({submissions.length})
        </p>
        {submissions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
            <p className="text-xs">No forms submitted for this incident yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {submissions.map(sub => {
              const tmpl = FORM_TEMPLATES.find(t => t.id === sub.form_type);
              return (
                <div key={sub.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate">{sub.form_name || tmpl?.name || "Form"}</div>
                    <div className="text-[10px] text-slate-400">{format(new Date(sub.created_date), "dd MMM yyyy, HH:mm")}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[sub.status] || STATUS_BADGE.Draft}`}>
                    {STATUS_ICON[sub.status] || STATUS_ICON.Draft}
                    {sub.status}
                  </div>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2 shrink-0"
                    onClick={() => setActiveForm({ formType: sub.form_type, submission: sub })}>
                    <Eye className="w-3 h-3" /> View
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}