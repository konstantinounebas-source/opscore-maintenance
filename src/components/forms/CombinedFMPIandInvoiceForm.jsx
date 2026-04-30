import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import { logFormSubmission, buildAttachmentMetadata } from "@/lib/auditTrailHelper";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Send, Lock, Plus, Trash2, AlertTriangle,
  CheckCircle2, Upload, X, Info, Euro, Calendar, Wrench, Clock
} from "lucide-react";
import { format } from "date-fns";
import { computeFMPISLA, computeCROMPISLA, formatDeadline } from "@/lib/slaEngine";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import FileUploadArea from "@/components/shared/FileUploadArea";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; }
}

function fmtNum(n) {
  if (n == null || n === "" || isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

// SLA is now calculated centrally via lib/slaEngine.js — no hardcoded SLA math here.

// ── Sub-components ────────────────────────────────────────────────────────────
function ReadOnlyField({ label, value, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <span className="flex-1">{value || <span className="text-slate-300 italic">—</span>}</span>
        {children}
      </div>
    </div>
  );
}

function Section({ title, icon: SectionIcon, accent, children, rightSlot }) {
  return (
    <div className={`bg-white rounded-xl border ${accent || "border-slate-200"} overflow-hidden`}>
      <div className={`flex items-center justify-between gap-2.5 px-5 py-3.5 border-b ${accent ? "border-inherit bg-slate-50/50" : "border-slate-100 bg-slate-50/30"}`}>
        <div className="flex items-center gap-2.5">
          {SectionIcon && <SectionIcon className="w-4 h-4 text-slate-500" />}
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        {rightSlot}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// PRIORITY: P1 = Low, P2 = High/Urgent (contractual)
function PriorityBadge({ priority }) {
  if (priority === "P1") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
      P1 – Χαμηλή (Low)
    </span>
  );
  if (priority === "P2") return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="w-3 h-3" /> P2 – Υψηλή / Επείγον (High)
    </span>
  );
  return null;
}

function OWRBadge({ value }) {
  if (value === "ΝΑΙ") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> Εκτός Εγγύησης
    </span>
  );
  if (value === "ΟΧΙ") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Εντός Εγγύησης
    </span>
  );
  return null;
}

function CABadge({ value, autoLocked }) {
  if (autoLocked) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <Lock className="w-3 h-3" /> Αυτόματο: ΟΧΙ
    </span>
  );
  if (value === "ΝΑΙ") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="w-3 h-3" /> Απαιτείται Έγκριση
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> ΟΧΙ
    </span>
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

function deriveSubcategory(incident) {
  const parts = [];
  if (incident?.subsystem_structural_issue) parts.push(incident.subsystem_structural_issue);
  if (incident?.subsystem_electrical_issue) parts.push(incident.subsystem_electrical_issue);
  if (incident?.subsystem_electronic_issue) parts.push(incident.subsystem_electronic_issue);
  if (incident?.subsystem_other_issue) parts.push(incident.subsystem_other_issue);
  return parts.filter(Boolean).join(", ") || "—";
}



// ── Empty work row ────────────────────────────────────────────────────────────
const emptyRow = () => ({
  _id: Math.random().toString(36).slice(2),
  catalog_id: "",
  qty: 1,
  unit_price: "",
  confirmed: false,
  comments: "",
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function CombinedFMPIandInvoiceForm({ submission, incidents, assets, workOrders, crews, onClose, defaultIncidentId }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!submission;

  // ── Child Catalog from Configuration ──
  const { data: childCatalog = [] } = useQuery({
    queryKey: ["childCatalog"],
    queryFn: () => base44.entities.ChildCatalog.list(),
  });
  const activeCatalog = useMemo(() => childCatalog.filter(c => c.active !== false), [childCatalog]);
  const catalogMap = useMemo(() => Object.fromEntries(activeCatalog.map(c => [c.id, c])), [activeCatalog]);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState("fmpi");

  // ── FMPI state ──
  const [linkedIncidentId, setLinkedIncidentId] = useState(submission?.incident_id || defaultIncidentId || "");
  const [linkedAssetId, setLinkedAssetId] = useState(submission?.asset_id || "");
  const [linkedWOId, setLinkedWOId] = useState(submission?.work_order_id || "");
  const [outlineDate, setOutlineDate] = useState(submission?.fmp_outline_date || "");
  const [owrValue, setOwrValue] = useState(submission?.ektos_eggyhshs || "");
  const [caValue, setCaValue] = useState(submission?.apaiteitai_eggkrisi_ca || "ΟΧΙ");

  // ── Invoice state ──
  const [rows, setRows] = useState(() => {
    if (submission?.form_data?.rows?.length) return submission.form_data.rows;
    return [emptyRow()];
  });
  const [comments, setComments] = useState(submission?.form_data?.comments || "");
  const [sigName, setSigName] = useState(submission?.form_data?.sig_name || "");
  const [sigService, setSigService] = useState(submission?.form_data?.sig_service || "");
  const [sigDate, setSigDate] = useState(submission?.form_data?.sig_date || "");
  const [sigUpload, setSigUpload] = useState(submission?.form_data?.sig_upload || null);
  const [photosBefore, setPhotosBefore] = useState(submission?.form_data?.photos_before || []);

  // ── OWR → CA lock ──
  const caAutoLocked = owrValue === "ΟΧΙ";
  useEffect(() => {
    if (owrValue === "ΟΧΙ") setCaValue("ΟΧΙ");
  }, [owrValue]);

  // ── Attachments from Incident ──
  const { data: incidentAttachments = [] } = useQuery({
    queryKey: ["incidentAttachments", linkedIncidentId],
    queryFn: () => linkedIncidentId
      ? base44.entities.IncidentAttachments.filter({ incident_id: linkedIncidentId })
      : Promise.resolve([]),
    enabled: !!linkedIncidentId,
  });

  // ── Fetch submitted OMPI form for priority ──
  const { data: ompiSubmissions = [] } = useQuery({
    queryKey: ["ompiSubmissions", linkedIncidentId],
    queryFn: () => linkedIncidentId
      // Query both form_type values — CROMPIForm uses "cr_ompi"; OutlineManagementForm uses "outline_management_incident_plan"
      ? base44.entities.FormSubmissions.filter({ incident_id: linkedIncidentId, form_type: "cr_ompi" })
          .then(async rows => {
            if (rows.length > 0) return rows;
            return base44.entities.FormSubmissions.filter({ incident_id: linkedIncidentId, form_type: "outline_management_incident_plan" });
          })
      : Promise.resolve([]),
    enabled: !!linkedIncidentId,
  });

  // ── Derived ──
  const incident = useMemo(() => incidents.find(i => i.id === linkedIncidentId), [incidents, linkedIncidentId]);
  const asset = useMemo(() => assets.find(a => a.id === linkedAssetId), [assets, linkedAssetId]);
  const workOrder = useMemo(() => workOrders.find(w => w.id === linkedWOId), [workOrders, linkedWOId]);

  // Auto-fill asset from incident
  useEffect(() => {
    if (incident?.related_asset_id && !linkedAssetId) setLinkedAssetId(incident.related_asset_id);
  }, [incident]);

  // Auto-fill WO from incident
  useEffect(() => {
    if (!linkedWOId) {
      const match = workOrders.find(w => w.incident_id === linkedIncidentId);
      if (match) setLinkedWOId(match.id);
    }
  }, [linkedIncidentId, workOrders]);

  const subsystem = useMemo(() => deriveSubsystem(incident), [incident]);
  const subcategory = useMemo(() => deriveSubcategory(incident), [incident]);

  // Priority: prefer OMPI form value, fall back to incident
  const ompiForm = useMemo(() => {
    if (!ompiSubmissions.length) return null;
    // prefer Submitted, otherwise latest Draft
    return ompiSubmissions.find(s => s.status === "Submitted") || ompiSubmissions[ompiSubmissions.length - 1];
  }, [ompiSubmissions]);

  const rawPriority = ompiForm
    ? (ompiForm.form_data?.priority || incident?.operational_priority || incident?.initial_priority || incident?.priority || "")
    : (incident?.operational_priority || incident?.initial_priority || incident?.priority || "");
  const priority = ["P1", "P2"].includes(rawPriority) ? rawPriority : "";
  // CORRECTED: P2 = High/Urgent priority
  const isHighPriority = priority === "P2";

  const reportDate = incident?.reported_date || incident?.first_report_date;

  // Auto-fill OWR from OMPI form if not already set
  useEffect(() => {
    if (ompiForm && !owrValue && !submission) {
      // Support values from CROMPIForm (ektos_eggyhshs: "Yes"/"No") and
      // OutlineManagementForm (ektos_eggyhshs: "YES"/"NO") and raw incident warranty_status
      const ompiOwr = ompiForm.ektos_eggyhshs || (ompiForm.form_data?.warranty_status === "OWR" ? "Yes" : null);
      if (ompiOwr === "YES" || ompiOwr === "Yes") setOwrValue("ΝΑΙ");
      else if (ompiOwr === "NO" || ompiOwr === "No") setOwrValue("ΟΧΙ");
    }
  }, [ompiForm]);

  // Auto-fill outlineDate from OMPI submission date
  useEffect(() => {
    if (ompiForm && !outlineDate && !submission) {
      const ompiDate = ompiForm.submitted_at || ompiForm.updated_date || ompiForm.created_date;
      if (ompiDate) {
        // Extract just the date part (YYYY-MM-DD)
        setOutlineDate(ompiDate.split("T")[0]);
      }
    }
  }, [ompiForm]);

  // Auto-fill sigDate from incident creation date
  useEffect(() => {
    if (reportDate && !sigDate) {
      setSigDate(reportDate);
    }
  }, [reportDate, sigDate]);

  // ── SLA calculations (from central engine) ──
  const crOmpiBase = incident?.cr_ompi_submitted_at || incident?.created_date;
  const effectiveWarranty = owrValue === "ΝΑΙ" ? "OWR" : owrValue === "ΟΧΙ" ? "In Warranty" : (incident?.warranty_status || null);

  const fmpiSLAResult = useMemo(() => {
    if (!crOmpiBase || !effectiveWarranty) return null;
    return computeFMPISLA(crOmpiBase, effectiveWarranty, []);
  }, [crOmpiBase, effectiveWarranty]);

  const crOmpiSLAResult = useMemo(() => {
    if (!incident?.incident_created_at && !incident?.created_date) return null;
    return computeCROMPISLA(incident?.incident_created_at || incident?.created_date, priority || "P1", []);
  }, [incident, priority]);

  // ── Invoice calcs ──
  const rowAmounts = rows.map(r => {
    const up = parseFloat(r.unit_price) || 0;
    const qty = parseFloat(r.qty) || 0;
    return up * qty;
  });
  const totalCost = rowAmounts.reduce((s, v) => s + v, 0);

  // ── Row helpers ──
  const updateRow = (idx, patch) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, ...patch };
      if (patch.catalog_id !== undefined) {
        const item = catalogMap[patch.catalog_id];
        updated.unit_price = (item?.pricing_type === "Bundle" ? item?.bundle_price : item?.unit_price) ?? "";
      }
      return updated;
    }));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  // ── Signature upload ──
  const sigRef = useRef();
  const handleSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSigUpload({ name: file.name, url: file_url });
  };

  // ── Save ──
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = isEditing
        ? await base44.entities.FormSubmissions.update(submission.id, data)
        : await base44.entities.FormSubmissions.create(data);
      
      const incId = data.incident_id;
      const timestamp = getAthensTimestamp();

      const allFiles = [
         ...(data.form_data?.photos_before || []),
         ...(data.form_data?.sig_upload ? [data.form_data.sig_upload] : []),
       ].filter(f => f?.url);

       // Mirror attachments to IncidentAttachments — only if FormSubmissions create succeeds
       // Only mirror if this is a create operation (not an update)
       if (!isEditing && incId && allFiles.length > 0) {
         // Check for duplicates before mirroring
         const existingAttachments = await base44.entities.IncidentAttachments.filter({
           incident_id: incId,
         });
         const existingUrls = new Set(existingAttachments.map(a => a.file_url));

         const newFiles = allFiles.filter(f => !existingUrls.has(f.url));
         if (newFiles.length > 0) {
           await Promise.all(newFiles.map(f =>
             base44.entities.IncidentAttachments.create({
               incident_id: incId,
               file_url: f.url,
               file_name: f.name || f.url.split("/").pop(),
               file_type: /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || "") ? "Photo" : "Document",
               uploaded_by: user?.email,
             })
           ));
         }
       }

      // Log via audit trail helper for atomic grouping
      if (data.status === "Submitted") {
        await logFormSubmission(
          incId,
          data.form_type,
          data.form_name,
          buildAttachmentMetadata(allFiles),
          data.work_order_id
        );
      } else {
        // Draft save: use generic audit entry
        await base44.entities.IncidentAuditTrail.create({
          incident_id: incId,
          action: "Form Saved",
          details: `${data.form_name} – Draft`,
          user: user?.email,
        });
      }

      // Update incident workflow state when FMPI is submitted
      if (data.status === "Submitted" && incId) {
        const nowTs = getAthensTimestamp();
        // Normalise both fields — handleSave converts ΝΑΙ→Yes, but guard against raw Greek values too
        const normalise = v => (v === "ΝΑΙ" || v === "YES" || v === "Yes") ? "Yes" : v;
        const fmpiApprovalNeeded = normalise(data.apaiteitai_eggkrisi_ca) === "Yes" || normalise(data.ektos_eggyhshs) === "Yes";
        const nextWorkflowState = fmpiApprovalNeeded ? "Awaiting_CA_Approval" : "FMPI_Submitted";
        await base44.entities.Incidents.update(incId, {
          workflow_state: nextWorkflowState,
          fmpi_submitted_at: nowTs,
          fmpi_approval_required: fmpiApprovalNeeded,
          corrective_allowed: !fmpiApprovalNeeded,
          // Legacy compat
          owr_fmpi_done: true,
        });
      }

      return result;
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Φόρμα ενημερώθηκε" : "Φόρμα αποθηκεύτηκε" });
      onClose();
    },
    onError: (err) => toast({ title: err.message || "Σφάλμα αποθήκευσης", variant: "destructive" }),
  });

  const handleSave = (status = "Draft") => {
    if (status === "Submitted") {
      if (!linkedIncidentId) { toast({ title: "Επιλέξτε περιστατικό", variant: "destructive" }); return; }
      if (!linkedAssetId) { toast({ title: "Επιλέξτε asset", variant: "destructive" }); return; }

      if (!outlineDate) { toast({ title: "Συμπληρώστε: Ημερομηνία Outline management plan", variant: "destructive" }); return; }
      if (!owrValue) { toast({ title: "Επιλέξτε: Εκτός Εγγύησης (OWR)", variant: "destructive" }); return; }
      const hasEmptyChild = rows.some(r => !r.catalog_id);
      if (hasEmptyChild) { toast({ title: "Επιλέξτε Child για κάθε γραμμή εργασίας", variant: "destructive" }); return; }
      const hasZeroQty = rows.some(r => !r.qty || Number(r.qty) <= 0);
      if (hasZeroQty) { toast({ title: "Η ποσότητα πρέπει να είναι > 0", variant: "destructive" }); return; }
    }

    saveMutation.mutate({
      form_type: "combined_fmpi_invoice",
      form_name: "FMPI & Pricing Order",
      incident_id: linkedIncidentId,
      asset_id: linkedAssetId,
      work_order_id: linkedWOId,
      status,
      total_cost: totalCost,
      fmp_outline_date: outlineDate,
      ektos_eggyhshs: owrValue === "ΝΑΙ" ? "Yes" : owrValue === "ΟΧΙ" ? "No" : owrValue,
      apaiteitai_eggkrisi_ca: caValue === "ΝΑΙ" ? "Yes" : caValue === "ΟΧΙ" ? "No" : caValue,
      submitted_at: status === "Submitted" ? getAthensTimestamp() : submission?.submitted_at,
      form_data: {
         rows,
         total_cost: totalCost,
         photos_before: photosBefore,
         comments,
         sig_name: sigName,
         sig_service: sigService,
         sig_date: sigDate,
         sig_upload: sigUpload,
       },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="FMPI & Pricing Order"
        subtitle={isEditing ? `Επεξεργασία – ${submission?.status}` : "Νέα Υποβολή"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Πίσω
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending} className="gap-1.5 text-xs">
              <Save className="w-3.5 h-3.5" /> Αποθήκευση Draft
            </Button>
            <Button size="sm" onClick={() => handleSave("Submitted")} disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs">
              <Send className="w-3.5 h-3.5" /> Υποβολή
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-5">

          {/* ── Linked records ── */}
          <div className="bg-white rounded-xl border border-indigo-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Info className="w-4 h-4" /> Σύνδεση Εγγραφών
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Περιστατικό (Incident) *</Label>
                <Select value={linkedIncidentId || "_none"} onValueChange={v => setLinkedIncidentId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {incidents.map(i => {
                     const d = i.reported_date || i.first_report_date;
                     const dateFmt = d ? (() => { const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; })() : null;
                     return (
                       <SelectItem key={i.id} value={i.id}>
                         <span className="font-mono text-xs font-bold">{i.incident_id}</span>
                         <span className="mx-1 text-slate-300">|</span>
                         <span>{i.title.replace(/\s*[-–]\s*\d{4}-\d{2}-\d{2}$/, "")}</span>
                         {dateFmt && <><span className="mx-1 text-slate-300">|</span><span className="text-slate-500 text-xs">{dateFmt}</span></>}
                       </SelectItem>
                     );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Asset *</Label>
                <Select value={linkedAssetId || "_none"} onValueChange={v => setLinkedAssetId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-mono text-xs mr-1">{a.active_shelter_id || a.asset_id}</span>
                        {a.location_address || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fmpi">FMPI Details</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Order</TabsTrigger>
            </TabsList>

            {/* ── TAB 1: FMPI DETAILS ── */}
            <TabsContent value="fmpi" className="space-y-5">
              {/* SECTION 1: General / Incident / Work Order */}
              <Section title="1. General / Incident / Work Order Details" icon={AlertTriangle}>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
                  <ReadOnlyField label="Ημερομηνία Αναφοράς απο Α.Α.:" value={fmtDate(reportDate)} />
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Ημερομηνία Outline management plan: *</Label>
                    {ompiForm && outlineDate ? (
                      <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        <span className="flex-1">{fmtDate(outlineDate)}</span>
                        <span className="text-xs text-indigo-500 font-medium px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded">Από OMPI</span>
                      </div>
                    ) : (
                      <Input type="date" value={outlineDate} onChange={e => setOutlineDate(e.target.value)} className="text-sm mt-1" />
                    )}
                  </div>
                  <ReadOnlyField label="Ημερομηνία Έκδοσης:" value={fmtDate(new Date().toISOString())} />
                  <ReadOnlyField label="Κωδικός Στάσης:" value={asset?.active_shelter_id || asset?.asset_id} />
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-500">Προτεραιότητα:</Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="text-sm text-slate-700 flex-1">{priority || <span className="text-slate-300 italic">—</span>}</span>
                      {priority && <PriorityBadge priority={priority} />}
                    </div>
                  </div>
                  <ReadOnlyField label="Τύπος Στεγάστρου:" value={asset?.shelter_type} />
                  <ReadOnlyField label="Επηρεαζόμενο Υποσύστημα:" value={subsystem} />
                  <ReadOnlyField label="Υποκατηγορία:" value={subcategory} />
                </div>
                {/* Attachments */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500">Συννημένα αποδεικτικά:</Label>
                  <div className="px-3 py-2.5 rounded-md bg-slate-50 border border-slate-200 text-sm min-h-[36px]">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Lock className="w-3 h-3 flex-shrink-0" />
                      <span className="text-xs">Αρχεία από το συνδεδεμένο περιστατικό</span>
                    </div>
                    {incidentAttachments.length === 0 ? (
                      <span className="text-slate-300 italic text-xs">Δεν υπάρχουν συννημένα</span>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {incidentAttachments.map(att => (
                          <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 underline">
                            <span>📎</span> {att.file_name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              {/* SECTION 2: Operational Details */}
              <Section title="2. Operational Details" icon={Wrench}>
                <div className="grid grid-cols-2 gap-4">
                  <ReadOnlyField label="Επαρχία:" value={asset?.city} />
                  <ReadOnlyField label="Δήμος:" value={asset?.municipality} />
                  <div className="col-span-2">
                    <ReadOnlyField label="Διεύθυνση:" value={asset?.location_address} />
                  </div>
                  <div className="col-span-2">
                    <ReadOnlyField label="Προέλευση Αναφοράς Συμβάντος:" value={incident?.incident_source} />
                  </div>
                </div>
              </Section>

              {/* SECTION 3: Decision Logic */}
              <Section title="3. Decision Logic" accent="border-amber-200">
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 border transition-colors ${owrValue === "ΝΑΙ" ? "bg-amber-50 border-amber-200" : owrValue === "ΟΧΙ" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm font-semibold text-slate-700">Εκτός Εγγύησης (OWR): *</Label>
                      {owrValue && <OWRBadge value={owrValue} />}
                    </div>
                    <Select value={owrValue || "_none"} onValueChange={v => setOwrValue(v === "_none" ? "" : v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Επιλογή —</SelectItem>
                        <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
                        <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`rounded-lg p-4 border transition-colors ${caValue === "ΝΑΙ" && !caAutoLocked ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm font-semibold text-slate-700">Απαιτείται Έγκριση απο CA:</Label>
                      <CABadge value={caValue} autoLocked={caAutoLocked} />
                    </div>
                    {caAutoLocked ? (
                      <div className="text-xs text-slate-500 italic flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        Αυτόματο: ΟΧΙ λόγω εντός εγγύησης
                      </div>
                    ) : (
                      <Select value={caValue || "ΟΧΙ"} onValueChange={setCaValue}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
                          <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </Section>

              {/* SECTION 4: SLA Dates */}
              <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-blue-100 bg-blue-50/60">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-800">4. SLA – Κύριες Ημερομηνίες</h3>
                  <span className="ml-auto text-xs text-blue-500 font-medium px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                    Αυτόματος Υπολογισμός
                  </span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      CR+OMPI Deadline
                    </Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="flex-1 text-xs font-semibold">
                        {crOmpiSLAResult ? formatDeadline(crOmpiSLAResult.sla_deadline_at) : <span className="text-slate-300 italic">—</span>}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      FMPI Deadline
                    </Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="flex-1 text-xs font-semibold">
                        {fmpiSLAResult
                          ? formatDeadline(fmpiSLAResult.sla_deadline_at)
                          : <span className="text-slate-300 italic">Select warranty status</span>
                        }
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 p-2.5 rounded-md bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold">Repair Deadline</span> is set when CA Approval is granted (OWR: +21 days from approval date) or at FMPI submission (In Warranty: +28 days).
                      It is visible in the CA Approval step and the incident SLA card.
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: PRICING ORDER ── */}
            <TabsContent value="pricing" className="space-y-5">
              {/* SECTION 3: Work items table */}
              <Section
                title="Περιγραφή Εργασιών βάσει Συμβολαίου"
                accent="border-slate-200"
                rightSlot={
                  <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs h-7">
                    <Plus className="w-3.5 h-3.5" /> Προσθήκη Γραμμής
                  </Button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left font-semibold rounded-tl-md" style={{ minWidth: 200 }}>Περιγραφή Εργασίας / Child</th>
                        <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 100 }}>Ποσότητα που Τοποθετήθηκε</th>
                        <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 150 }}>Ανάλυση Τιμής Μονάδας χωρίς ΦΠΑ (€)</th>
                        <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 120 }}>Ποσό χωρίς ΦΠΑ (€)</th>
                        <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 80 }}>Επιβεβαίωση (√)</th>
                        <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 140 }}>Σχόλια</th>
                        <th className="px-2 py-2 rounded-tr-md" style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, idx) => {
                       const catalogItem = catalogMap[row.catalog_id];
                       const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
                        return (
                          <tr
                            key={row._id}
                            className={`text-sm transition-colors ${row.confirmed ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/60"}`}
                          >
                            <td className="px-2 py-1.5">
                              <Select value={row.catalog_id || "_none"} onValueChange={v => updateRow(idx, { catalog_id: v === "_none" ? "" : v })}>
                                <SelectTrigger className={`text-xs h-8 ${!row.catalog_id ? "border-amber-300" : ""}`}>
                                  <SelectValue placeholder="Επιλογή..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">— Επιλογή —</SelectItem>
                                  {activeCatalog.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                      <span className="font-mono text-xs mr-1">{c.child_code}</span>
                                      {c.display_name || c.child_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {catalogItem?.child_category && (
                                <p className="text-xs text-slate-400 mt-0.5 pl-1 truncate">{catalogItem.child_category}</p>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.qty}
                                onChange={e => updateRow(idx, { qty: e.target.value })}
                                className="text-xs h-8 text-center"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-center gap-1 h-8 px-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                                <Lock className="w-3 h-3 text-slate-300" />
                                <span>{row.unit_price !== "" ? fmtNum(row.unit_price) : <span className="text-slate-300 italic">—</span>}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-center gap-1 h-8 px-2 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
                                <Lock className="w-3 h-3 text-blue-300" />
                                <span>{fmtNum(amount)}</span>
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <div className="flex items-center justify-center">
                                <Checkbox
                                  checked={!!row.confirmed}
                                  onCheckedChange={v => updateRow(idx, { confirmed: !!v })}
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <Input
                                value={row.comments}
                                onChange={e => updateRow(idx, { comments: e.target.value })}
                                placeholder="Σχόλια..."
                                className="text-xs h-8"
                              />
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                disabled={rows.length === 1}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Total cost */}
                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <div className="bg-indigo-600 text-white rounded-xl px-6 py-3 flex items-center gap-3 shadow-sm">
                    <Euro className="w-5 h-5 text-indigo-200" />
                    <div>
                      <p className="text-xs text-indigo-200 font-medium uppercase tracking-wide">ΚΟΣΤΟΣ ΕΡΓΑΣΙΩΝ €</p>
                      <p className="text-2xl font-bold tabular-nums">{totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </Section>

              {/* SECTION 4: Photos */}
              <Section title="Φωτογραφικά Αποδεικτικά">
                <FileUploadArea
                  label="ΦΩΤΟΓΡΑΦΙΑ ΑΠΟ ΠΡΟΗΓΟΥΜΕΝΗ ΚΑΤΑΣΤΑΣΗ – 1Η ΕΠΙΘΕΩΡΗΣΗ"
                  files={photosBefore}
                  onChange={setPhotosBefore}
                />
              </Section>

              {/* SECTION 5: Comments */}
              <Section title="Σχόλια / Παρατηρήσεις">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    ΣΧΟΛΙΑ-ΠΑΡΑΤΗΡΗΣΕΙΣ ΑΠΟ ΕΠΙΤΡΟΠΗ ΠΑΡΑΛΑΒΗΣ
                  </Label>
                  <Textarea
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Σχόλια / παρατηρήσεις..."
                    rows={4}
                    className="text-sm mt-1"
                  />
                </div>
              </Section>

              {/* SECTION 6: Signature */}
              <Section title="Παραλαβή / Υπογραφή">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</Label>
                    <Input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Ονοματεπώνυμο..." className="text-sm mt-1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΥΠΗΡΕΣΙΑ-ΘΕΣΗ</Label>
                    <Input value={sigService} onChange={e => setSigService(e.target.value)} placeholder="Υπηρεσία / Θέση..." className="text-sm mt-1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΗΜΕΡ. ΠΑΡΑΛΑΒΗΣ</Label>
                    <Input type="date" value={sigDate} onChange={e => setSigDate(e.target.value)} className="text-sm mt-1" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      ΕΚΠΡΟΣΩΠΟΣ ΑΝΑΘΕΤΟΥΣΑΣ ΑΡΧΗΣ ΥΠΟΓΡΑΦΗ
                    </Label>
                    {sigUpload ? (
                      <div className="relative inline-block group">
                        <img src={sigUpload.url} alt="Υπογραφή" className="h-16 border border-slate-200 rounded-lg object-contain bg-white px-2" />
                        <button type="button" onClick={() => setSigUpload(null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                          onClick={() => sigRef.current?.click()}>
                          <Upload className="w-3.5 h-3.5" /> Μεταφόρτωση Υπογραφής
                        </Button>
                        <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={handleSigUpload} />
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </TabsContent>
          </Tabs>

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pt-2 pb-8">
            <Button variant="outline" onClick={onClose}>Άκυρο</Button>
            <Button variant="outline" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending} className="gap-1.5">
              <Save className="w-4 h-4" /> Αποθήκευση Draft
            </Button>
            <Button onClick={() => handleSave("Submitted")} disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
              <Send className="w-4 h-4" /> Υποβολή Φόρμας
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}