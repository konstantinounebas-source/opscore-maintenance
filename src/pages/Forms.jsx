import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Clock, CheckCircle2, XCircle, Eye, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";
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
  {
    id: "outline_management_incident_plan",
    name: "Outline Management Incident Plan",
    description: "Structured incident management outline form with SLA tracking and decision logic.",
  },
  {
    id: "combined_fmpi_invoice",
    name: "Full Management Plan",
    description: "Combined FMPI & Work Order Invoice with tabs for management plan details and pricing order.",
  },
  {
    id: "make_safe_checklist",
    name: "MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ",
    description: "Smart Bus Shelters – Άμεση ασφάλιση χώρου/κινδύνου. Ελέγχος ασφαλείας, PPE, LOTO, ενέργειες Make-Safe, τεκμηρίωση και υπογραφές.",
  },
  {
    id: "incident_report",
    name: "Request for Corrective Maintenance – Incident Report",
    description: "Φόρμα Αναφοράς Συμβάντος. Καταγραφή βλαβών, κατάταξη προτεραιότητας, OWR, Make-Safe και εγκρίσεις.",
  },
];

async function downloadFormPDF(submissionId, formName) {
  console.log("[Forms.downloadFormPDF] Starting download for submission:", submissionId);
  
  try {
    const response = await base44.functions.invoke('generateFormPDF', { submissionId });
    
    if (!response.data || !response.data.html) {
      throw new Error("No HTML content returned");
    }
    
    const { html, fileName } = response.data;
    
    const element = document.createElement('div');
    element.innerHTML = html;
    
    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    await html2pdf().set(opt).from(element).save();
    console.log("[Forms.downloadFormPDF] Download completed successfully");
  } catch (err) {
    console.error("[Forms.downloadFormPDF] Error:", err);
    throw err;
  }
}

// Map form_type to component
const FORM_TYPE_COMPONENT = {
  outline_management_incident_plan: "OutlineManagementForm",
  combined_fmpi_invoice: "CombinedFMPIandInvoiceForm",
  make_safe_checklist: "MakeSafeChecklistForm",
  incident_report: "IncidentReportForm",
};

export default function Forms() {
  const urlParams = new URLSearchParams(window.location.search);
  // Support both ?submission= and ?submissionId= for backward compatibility
  const preloadSubmissionId = urlParams.get("submission") || urlParams.get("submissionId");

  const [view, setView] = useState("list"); // "list" | "new" | "edit"
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [preloaded, setPreloaded] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState(null);

  const { data: submissions = [], refetch } = useQuery({
    queryKey: ["formSubmissions"],
    queryFn: () => base44.entities.FormSubmissions.list("-created_date"),
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incidents.list(),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
  });
  const { data: workOrders = [] } = useQuery({
    queryKey: ["workOrders"],
    queryFn: () => base44.entities.WorkOrders.list(),
  });
  const { data: crews = [] } = useQuery({
    queryKey: ["crews"],
    queryFn: () => base44.entities.Crews.list(),
  });
  const { data: childAssets = [] } = useQuery({
    queryKey: ["childAssets"],
    queryFn: () => base44.entities.ChildAssets.list(),
  });

  // Auto-open submission from URL param or direct fetch
  useEffect(() => {
    if (preloaded || !preloadSubmissionId) return;

    const loadSubmission = async () => {
      try {
        const sub = submissions.find(s => s.id === preloadSubmissionId);
        if (sub) {
          console.log("[Forms] Preloading submission from list:", preloadSubmissionId, "form_type:", sub.form_type);
          handleEdit(sub);
        } else {
          // Fetch directly if not in list
          console.log("[Forms] Fetching submission by ID:", preloadSubmissionId);
          const fetchedSub = await base44.entities.FormSubmissions.get(preloadSubmissionId);
          if (fetchedSub) {
            console.log("[Forms] Fetched submission:", fetchedSub.id, "form_type:", fetchedSub.form_type);
            handleEdit(fetchedSub);
          } else {
            setError(`Submission ${preloadSubmissionId} not found`);
            console.error("[Forms] Submission not found:", preloadSubmissionId);
          }
        }
        setPreloaded(true);
      } catch (err) {
        setError(`Failed to load submission: ${err.message}`);
        console.error("[Forms] Error loading submission:", err);
        setPreloaded(true);
      }
    };

    loadSubmission();
  }, [preloadSubmissionId, submissions, preloaded]);

  const handleNew = (template) => {
    setSelectedTemplate(template);
    setEditingSubmission(null);
    setView("new");
  };

  const handleEdit = (submission) => {
    const template = FORM_TEMPLATES.find(t => t.id === submission.form_type);
    setSelectedTemplate(template);
    setEditingSubmission(submission);
    setView("edit");
  };

  const handleClose = () => {
    setView("list");
    setSelectedTemplate(null);
    setEditingSubmission(null);
    refetch();
  };

  const handleDownload = async (sub) => {
    setDownloadingId(sub.id);
    try {
      await downloadFormPDF(sub.id, sub.form_name);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error(err.message || "PDF download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  // Render the correct form component based on form_type
  const renderFormComponent = () => {
    const formType = editingSubmission?.form_type || selectedTemplate?.id;
    console.log("[Forms.renderFormComponent] Rendering form type:", formType);

    if (formType === "combined_fmpi_invoice") {
      return (
        <CombinedFMPIandInvoiceForm
          submission={editingSubmission}
          incidents={incidents}
          assets={assets}
          workOrders={workOrders}
          crews={crews}
          childAssets={childAssets}
          onClose={handleClose}
        />
      );
    }
    if (formType === "make_safe_checklist") {
      return (
        <MakeSafeChecklistForm
          submission={editingSubmission}
          incidents={incidents}
          assets={assets}
          workOrders={workOrders}
          onClose={handleClose}
        />
      );
    }
    if (formType === "incident_report") {
      return (
        <IncidentReportForm
          submission={editingSubmission}
          incidents={incidents}
          assets={assets}
          onClose={handleClose}
        />
      );
    }
    if (formType === "outline_management_incident_plan") {
      return (
        <OutlineManagementForm
          submission={editingSubmission}
          incidents={incidents}
          assets={assets}
          workOrders={workOrders}
          crews={crews}
          onClose={handleClose}
        />
      );
    }

    // Unknown form type
    console.error("[Forms.renderFormComponent] Unknown form type:", formType);
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <TopHeader title="Form" subtitle="Error" />
        <div className="p-6 max-w-2xl mx-auto w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Unknown Form Type</p>
            <p className="text-red-700 text-sm mt-2">Form type "{formType}" is not recognized.</p>
            <button
              onClick={handleClose}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  };

  const incidentMap = Object.fromEntries(incidents.map(i => [i.id, i]));
  const assetMap    = Object.fromEntries(assets.map(a => [a.id, a]));

  if (view === "new" || view === "edit") {
    return renderFormComponent();
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader title="Forms" subtitle="Structured Electronic Forms" />

      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <div className="text-red-700 flex-1">
              <p className="font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-lg"
            >
              ×
            </button>
          </div>
        )}
        {/* Templates */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Available Form Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORM_TEMPLATES.map(tmpl => (
              <div key={tmpl.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-800 leading-snug">{tmpl.name}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{tmpl.description}</div>
                  </div>
                </div>
                <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs mt-1"
                  onClick={() => handleNew(tmpl)}>
                  <Plus className="w-3.5 h-3.5" /> New Submission
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions list */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Submissions ({submissions.length})
          </h2>
          {submissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No form submissions yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {submissions.map(sub => {
                const incident = incidentMap[sub.incident_id];
                const asset    = assetMap[sub.asset_id];
                return (
                  <div key={sub.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-800 truncate">{sub.form_name || "Outline Management Incident Plan"}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                        {incident && <span>Incident: <span className="font-mono text-slate-600">{incident.incident_id}</span></span>}
                        {asset    && <span>Asset: <span className="font-mono text-slate-600">{asset.asset_id}</span></span>}
                        <span>{format(new Date(sub.created_date), "dd MMM yyyy, HH:mm")}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[sub.status] || STATUS_BADGE.Draft}`}>
                      {STATUS_ICON[sub.status] || STATUS_ICON.Draft}
                      {sub.status}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" onClick={() => handleEdit(sub)}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" onClick={() => handleDownload(sub)} disabled={downloadingId === sub.id}>
                      {downloadingId === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      PDF
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}