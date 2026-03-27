import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
  CheckCircle2, Upload, Image, X, Info, Euro, Calendar, Wrench, Clock
} from "lucide-react";
import { format, addBusinessDays, addDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; }
}

function fmtNum(n) {
  if (n == null || n === "" || isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

// ── SLA calculation ────────────────────────────────────────────────────────────
function calcConfirmationDeadline(reportDate, isHighPriority) {
  if (!reportDate) return null;
  const d = new Date(reportDate);
  return isHighPriority ? addBusinessDays(d, 1) : addBusinessDays(d, 2);
}

function calcFmpiDeadline(reportDate, owr) {
  if (!reportDate || owr !== "ΝΑΙ") return null;
  const confirmDate = addBusinessDays(new Date(reportDate), 2);
  return addDays(confirmDate, 7);
}

function calcRepairDeadline(outlineDate, owr, caApprovalDate) {
  if (!outlineDate) return null;
  if (owr === "ΟΧΙ") {
    return addDays(new Date(outlineDate), 28);
  }
  const base = caApprovalDate ? new Date(caApprovalDate) : new Date(outlineDate);
  return addDays(base, 21);
}

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

function PriorityBadge({ priority }) {
  if (priority === "P1") return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle className="w-3 h-3" /> P1 – Υψηλή
    </span>
  );
  if (priority === "P2") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      P2 – Μεσαία
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

// ── Photo upload area ─────────────────────────────────────────────────────────
function PhotoUploadArea({ label, files, onChange, required }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(fileList)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url });
    }
    onChange([...files, ...uploaded]);
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const remove = (idx) => {
    const copy = [...files];
    copy.splice(idx, 1);
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</Label>
        {required && files.length === 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <AlertTriangle className="w-3 h-3" /> Απαιτείται
          </span>
        )}
        {files.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" /> {files.length} αρχείο{files.length !== 1 ? "α" : ""}
          </span>
        )}
      </div>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <Upload className={`w-5 h-5 mx-auto mb-1 ${dragging ? "text-indigo-500" : "text-slate-400"}`} />
        {uploading ? (
          <p className="text-xs text-indigo-600 font-medium">Μεταφόρτωση...</p>
        ) : dragging ? (
          <p className="text-xs text-indigo-600 font-medium">Αφήστε εδώ...</p>
        ) : (
          <p className="text-xs text-slate-500">Σύρτε & αφήστε ή κλικ για μεταφόρτωση</p>
        )}
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              <img src={f.url} alt={f.name} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty work row ────────────────────────────────────────────────────────────
const emptyRow = () => ({
  _id: Math.random().toString(36).slice(2),
  child_id: "",
  qty: 1,
  unit_price: "",
  confirmed: false,
  comments: "",
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function CombinedFMPIandInvoiceForm({ submission, incidents, assets, workOrders, crews, childAssets, onClose, defaultIncidentId }) {
  const { toast } = useToast();
  const isEditing = !!submission;

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
  const [photosAfter, setPhotosAfter] = useState(submission?.form_data?.photos_after || []);

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

  const rawPriority = incident?.initial_priority || incident?.priority || "";
  const priority = ["P1", "P2"].includes(rawPriority) ? rawPriority : "";
  const isHighPriority = priority === "P1";

  const reportDate = incident?.reported_date || incident?.first_report_date;

  // ── SLA calculations ──
  const confirmationDeadline = useMemo(() =>
    calcConfirmationDeadline(reportDate, isHighPriority), [reportDate, isHighPriority]);
  const fmpiDeadline = useMemo(() =>
    calcFmpiDeadline(reportDate, owrValue), [reportDate, owrValue]);
  const repairDeadline = useMemo(() =>
    calcRepairDeadline(outlineDate, owrValue, null), [outlineDate, owrValue]);

  // ── Invoice calcs ──
  const childMap = useMemo(() => Object.fromEntries(childAssets.map(c => [c.id, c])), [childAssets]);
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
      if (patch.child_id !== undefined) {
        const child = childMap[patch.child_id];
        updated.unit_price = child?.unit_price ?? "";
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
      if (isEditing) return base44.entities.FormSubmissions.update(submission.id, data);
      return base44.entities.FormSubmissions.create(data);
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Φόρμα ενημερώθηκε" : "Φόρμα αποθηκεύτηκε" });
      onClose();
    },
    onError: (err) => toast({ title: err.message || "Σφάλμα αποθήκευσης", variant: "destructive" }),
  });

  const handleSave = (status = "Draft") => {
    if (!linkedIncidentId) { toast({ title: "Επιλέξτε περιστατικό", variant: "destructive" }); return; }
    if (!linkedAssetId) { toast({ title: "Επιλέξτε asset", variant: "destructive" }); return; }
    if (!linkedWOId) { toast({ title: "Επιλέξτε Work Order", variant: "destructive" }); return; }
    if (!outlineDate) { toast({ title: "Συμπληρώστε: Ημερομηνία Outline management plan", variant: "destructive" }); return; }
    if (!owrValue) { toast({ title: "Επιλέξτε: Εκτός Εγγύησης (OWR)", variant: "destructive" }); return; }

    const hasEmptyChild = rows.some(r => !r.child_id);
    if (hasEmptyChild) { toast({ title: "Επιλέξτε Child για κάθε γραμμή εργασίας", variant: "destructive" }); return; }
    const hasZeroQty = rows.some(r => !r.qty || Number(r.qty) <= 0);
    if (hasZeroQty) { toast({ title: "Η ποσότητα πρέπει να είναι > 0", variant: "destructive" }); return; }
    if (status === "Submitted" && photosAfter.length === 0) {
      toast({ title: "Απαιτούνται φωτογραφίες μετά την αποκατάσταση", variant: "destructive" }); return;
    }

    saveMutation.mutate({
      form_type: "combined_fmpi_invoice",
      form_name: "FMPI & Pricing Order",
      incident_id: linkedIncidentId,
      asset_id: linkedAssetId,
      work_order_id: linkedWOId,
      status,
      fmp_outline_date: outlineDate,
      ektos_eggyhshs: owrValue,
      apaiteitai_eggkrisi_ca: caValue,
      submitted_at: status === "Submitted" ? new Date().toISOString() : submission?.submitted_at,
      form_data: {
        rows,
        total_cost: totalCost,
        photos_before: photosBefore,
        photos_after: photosAfter,
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Περιστατικό (Incident) *</Label>
                <Select value={linkedIncidentId || "_none"} onValueChange={v => setLinkedIncidentId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {incidents.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        <span className="font-mono text-xs mr-1">{i.incident_id}</span>{i.title}
                      </SelectItem>
                    ))}
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
                        <span className="font-mono text-xs mr-1">{a.asset_id}</span>{a.active_shelter_id || a.location_address || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Work Order *</Label>
                <Select value={linkedWOId || "_none"} onValueChange={v => setLinkedWOId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {workOrders.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="font-mono text-xs mr-1">{w.work_order_id}</span>{w.title}
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
                  <ReadOnlyField label="Workorder Number" value={workOrder?.work_order_id} />
                  <ReadOnlyField label="Ημερομηνία Αναφοράς απο Α.Α.:" value={fmtDate(reportDate)} />
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Ημερομηνία Outline management plan: *</Label>
                    <Input type="date" value={outlineDate} onChange={e => setOutlineDate(e.target.value)} className="text-sm mt-1" />
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
                      Προθεσμία Επιβεβαίωσης Λήψης
                    </Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="flex-1">
                        {confirmationDeadline ? fmtDate(confirmationDeadline) : <span className="text-slate-300 italic">—</span>}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Outline Plan
                    </Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="flex-1">
                        {outlineDate ? fmtDate(outlineDate) : <span className="text-slate-300 italic">—</span>}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Προθεσμία FMPI (το παρόν)
                    </Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="flex-1">
                        {fmpiDeadline
                          ? fmtDate(fmpiDeadline)
                          : owrValue === "ΟΧΙ"
                            ? <span className="text-slate-400 italic text-xs">Δεν εφαρμόζεται (εντός εγγύησης)</span>
                            : <span className="text-slate-300 italic">—</span>
                        }
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Αναμενόμενη Προθεσμία Επισκευής
                    </Label>
                    <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                      <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      <span className="flex-1">
                        {repairDeadline ? fmtDate(repairDeadline) : <span className="text-slate-300 italic">—</span>}
                      </span>
                    </div>
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
                        const child = childMap[row.child_id];
                        const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
                        return (
                          <tr
                            key={row._id}
                            className={`text-sm transition-colors ${row.confirmed ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/60"}`}
                          >
                            <td className="px-2 py-1.5">
                              <Select value={row.child_id || "_none"} onValueChange={v => updateRow(idx, { child_id: v === "_none" ? "" : v })}>
                                <SelectTrigger className={`text-xs h-8 ${!row.child_id ? "border-amber-300" : ""}`}>
                                  <SelectValue placeholder="Επιλογή..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">— Επιλογή —</SelectItem>
                                  {childAssets.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                      <span className="font-mono text-xs mr-1">{c.child_id}</span>
                                      {c.description || c.child_type || c.category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {child?.description && (
                                <p className="text-xs text-slate-400 mt-0.5 pl-1 truncate">{child.description}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PhotoUploadArea
                    label="ΦΩΤΟΓΡΑΦΙΑ ΑΠΟ ΠΡΟΗΓΟΥΜΕΝΗ ΚΑΤΑΣΤΑΣΗ – 1Η ΕΠΙΘΕΩΡΗΣΗ"
                    files={photosBefore}
                    onChange={setPhotosBefore}
                    required={false}
                  />
                  <PhotoUploadArea
                    label="ΦΩΤΟΓΡΑΦΙΕΣ ΜΕΤΑ ΤΗΝ ΑΠΟΚΑΤΑΣΤΑΣΗ"
                    files={photosAfter}
                    onChange={setPhotosAfter}
                    required={true}
                  />
                </div>
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