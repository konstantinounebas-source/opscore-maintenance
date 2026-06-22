import React, { useState } from "react";
import { format } from "date-fns";
import { FileText, ImageIcon, Eye, Download, Paperclip, Loader2, X, FileCheck2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const FORM_TYPE_LABELS = {
  cr_ompi:                          "Confirmation of Receipt + OMPI",
  outline_management_incident_plan: "Outline Management Incident Plan (Legacy)",
  combined_fmpi_invoice:            "FMPI & Pricing Order",
  make_safe_checklist:              "MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ",
  corrective_wo_checklist:          "Corrective Work Order Checklist",
  inspection_wo_checklist:          "Inspection WO Checklist",
  work_order_form_f:                "Work Order Invoice",
};

function getPDFFunc(formType) {
  if (formType === "make_safe_checklist") return "generateMakeSafeChecklistPDF";
  if (formType === "corrective_wo_checklist") return "generateCorrectiveWOChecklistPDF";
  return "generateFormPDF";
}

function FormDocItem({ sub }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const name = FORM_TYPE_LABELS[sub.form_type] || sub.form_name || sub.form_type;
  const date = sub.submitted_at || sub.created_date;

  const handlePDF = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke(getPDFFunc(sub.form_type), { submissionId: sub.id });
      const { html, fileName } = res.data;
      const { generatePDFFromHtml } = await import("@/lib/generatePDFFromHtml");
      await generatePDFFromHtml(html, fileName || `${name}.pdf`);
    } catch (err) {
      toast({ title: "PDF Error", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
        <FileCheck2 className="h-4 w-4 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
        <p className="text-xs text-slate-400">
          <span className="text-emerald-600 font-medium">Form</span>
          {sub.status && <span> · {sub.status}</span>}
          {date && <span> · {format(new Date(date), "MMM d, yyyy HH:mm")}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handlePDF}
          disabled={loading}
          title="Download PDF"
          className="p-1.5 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function DocItem({ url, name, uploadedBy, date }) {
  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name || url);
  const isPDF = /\.pdf$/i.test(name || url);
  const displayName = name || url?.split("/").pop() || "Attachment";

  const [loadingView, setLoadingView] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const getSignedUrl = async () => {
    // Base44 private files have a URI like "private://..." or contain no domain
    // Public uploads (via UploadFile integration) return full https:// URLs — open directly
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: url });
    return signed_url;
  };

  const handleView = async () => {
    setLoadingView(true);
    try {
      const signed = await getSignedUrl();
      if (isImage) {
        setPreviewUrl(signed);
      } else {
        window.open(signed, "_blank");
      }
    } finally {
      setLoadingView(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const signed = await getSignedUrl();
      const a = document.createElement("a");
      a.href = signed;
      a.download = displayName;
      a.target = "_blank";
      a.click();
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <>
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-700" />
            </button>
            <img src={previewUrl} alt={displayName} className="max-h-[85vh] max-w-full rounded-lg shadow-xl object-contain bg-white" />
            <p className="text-center text-xs text-white/80 mt-2">{displayName}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          {isImage
            ? <ImageIcon className="h-4 w-4 text-indigo-500" />
            : <FileText className="h-4 w-4 text-indigo-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
          <p className="text-xs text-slate-400">
            {uploadedBy && <span>{uploadedBy}</span>}
            {date && <span> · {format(new Date(date), "MMM d, yyyy HH:mm")}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleView}
            disabled={loadingView}
            title="View"
            className="p-1.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            {loadingView ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDownload}
            disabled={loadingDl}
            title="Download"
            className="p-1.5 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            {loadingDl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}

export default function IncidentDocuments({ attachments = [], auditTrail = [], formSubmissions = [] }) {
  const allDocs = [];
  const seen = new Set();

  const addDoc = (url, name, uploadedBy, date) => {
    if (!url || url.startsWith("data:") || seen.has(url)) return;
    seen.add(url);
    allDocs.push({ url, name, uploadedBy, date });
  };

  // Direct attachments
  attachments.forEach(a => addDoc(a.file_url, a.file_name, a.uploaded_by, a.created_date));

  // Audit trail metadata + legacy
  auditTrail.forEach(entry => {
    (entry.attachment_metadata || []).forEach(meta => addDoc(meta.url, meta.name, meta.author_name || meta.author, meta.created_at));
    (entry.attachments || []).forEach((url, i) => addDoc(url, entry.attachment_names?.[i], entry.user, entry.created_date));
  });

  // Form submissions (rendered as form document entries)
  formSubmissions.forEach(sub => {
    allDocs.push({ isForm: true, sub, date: sub.submitted_at || sub.created_date });
  });

  // Sort newest first
  allDocs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (allDocs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents attached yet.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
      {allDocs.map((doc, i) => (
        doc.isForm
          ? <FormDocItem key={`form-${doc.sub.id}`} sub={doc.sub} />
          : <DocItem key={i} url={doc.url} name={doc.name} uploadedBy={doc.uploadedBy} date={doc.date} />
      ))}
    </div>
  );
}