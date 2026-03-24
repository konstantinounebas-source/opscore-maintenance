import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Save, Send, AlertTriangle, CheckCircle2,
  ShieldAlert, ShieldCheck, Calendar, Info, Lock, Paperclip,
  Clock, Wrench
} from "lucide-react";
import { format, addBusinessDays, addDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; }
}
function fmtDateTime(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—"; } catch { return "—"; }
}

// ── SLA calculation (per contractual notes) ───────────────────────────────────
// isHighPriority: P1 = high, P2 = low
// reportDate: Date of Ημερομηνία Αναφοράς απο Α.Α.
// outlineDate: Date of Ημερομηνία Outline management plan
// owr: "ΝΑΙ" | "ΟΧΙ"
// caApprovalDate: when CA approved (not stored yet → null for now)

function calcConfirmationDeadline(reportDate, isHighPriority) {
  if (!reportDate) return null;
  const d = new Date(reportDate);
  // High priority: same business day
  // Low priority: 1 day after the next business day = addBusinessDays(d, 2)
  return isHighPriority ? addBusinessDays(d, 1) : addBusinessDays(d, 2);
}

function calcFmpiDeadline(reportDate, owr) {
  if (!reportDate || owr !== "ΝΑΙ") return null;
  // OWR = ΝΑΙ, Low priority: 7 days from confirmation of receipt
  const confirmDate = addBusinessDays(new Date(reportDate), 2); // low priority confirm
  return addDays(confirmDate, 7);
}

function calcRepairDeadline(outlineDate, owr, caApprovalDate) {
  if (!outlineDate) return null;
  if (owr === "ΟΧΙ") {
    // Εντός εγγύησης: 28 days from outline management plan date
    return addDays(new Date(outlineDate), 28);
  }
  // Εκτός εγγύησης: 21 days from CA approval date (use outline date as proxy if no CA date)
  const base = caApprovalDate ? new Date(caApprovalDate) : new Date(outlineDate);
  return addDays(base, 21);
}

// ── Shared sub-components ─────────────────────────────────────────────────────
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
      <ShieldAlert className="w-3 h-3" /> Απαιτείται Έγκριση
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="w-3 h-3" /> ΟΧΙ
    </span>
  );
}

function MakeSafeBadge({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
      <Wrench className="w-3 h-3" /> Make Safe Απαιτείται
    </span>
  );
}

function deriveSubsystem(incident) {
  const parts = [];
  if (incident?.subsystem_structural_selected) parts.push("Structural");
  if (incident?.subsystem_electrical_selected) parts.push("Electrical");
  if (incident?.subsystem_electronic_selected) parts.push("Electronic");
  if (incident?.subsystem_other_selected)      parts.push("Other");
  return parts.join(", ") || "—";
}
function deriveSubcategory(incident) {
  const parts = [];
  if (incident?.subsystem_structural_issue)  parts.push(incident.subsystem_structural_issue);
  if (incident?.subsystem_electrical_issue)  parts.push(incident.subsystem_electrical_issue);
  if (incident?.subsystem_electronic_issue)  parts.push(incident.subsystem_electronic_issue);
  if (incident?.subsystem_other_issue)       parts.push(incident.subsystem_other_issue);
  return parts.filter(Boolean).join(", ") || "—";
}

// ── Ειδικότερα block ──────────────────────────────────────────────────────────
const EIDIKOTERO_STEPS = [
  "Ανάλυση και τεχνική αξιολόγηση του περιστατικού, βάσει φωτογραφιών, αναφορών και ευρημάτων επιτόπιας επιθεώρησης.",
  "Καθορισμός απαιτούμενων ενεργειών / εργασιών για την αποκατάσταση του προβλήματος. (βλέπε επισυναπτόμενο workorder)",
  "Κατάρτιση κοστολογημένου Work Order (WO) με αναλυτικές ποσότητες, υλικά και τιμές, σύμφωνα με τη σύμβαση.",
  "Σύνταξη και αποστολή του Full Management Plan προς την Αναθέτουσα Αρχή (CA) μαζί με το Work Order για έγκριση πριν την εκτέλεση.",
  "Προγραμματισμός και υλοποίηση των εργασιών εντός των χρονικών ορίων που έχουμε ορίσει (SLA) μετά την έγκριση.",
  "Αποστολή Τελικής Αναφοράς με φωτογραφίες και στοιχεία αποκατάστασης, για την επιβεβαίωση ολοκλήρωσης και το κλείσιμο του Work Order.",
];

const SLA_NOTES = [
  "Χαμηλή Προτεραιότητα: Επιβεβαίωση 1 ημέρα μετά την επόμενη εργάσιμη από τη λήψη του αιτήματος (αποστολή Outline Plan μαζί με επιβεβαίωση).",
  "Υψηλή Προτεραιότητα: Επιβεβαίωση εντός της ίδιας εργάσιμης ημέρας (Make Safe εφόσον απαιτείται).",
  "FMPI σε περίπτωση Out of warranty μόνο για έγκριση απο την Α.Α: Χαμηλή → 7 ημέρες από την επιβεβαίωση λήψης της αναφοράς",
  "Επισκευή: 21 ημέρες απο την ημερομηνία έγκρισης της αναθέτουσας αρχής - εφόσον είναι εκτός εγγύησης / Αν είναι εντός εγγύησης 28 ημέρες απο την ημερομηνία αποστολής του outline management plan",
  "Θα γίνεται κάθε προσπάθεια από πλευράς του εργολάβου για διεκπεραίωση των εργασιών εντός των καθορισμένων συμβατικών χρονοδιαγραμμάτων – ανάλογα με την επίσπευση των εγκρίσεων και εξουσιοδοτήσεων των εργασιών από τρίτα μέρη",
];

function EidikoteraBlock() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-indigo-50/40">
        <Info className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-800">5. Ειδικότερα</h3>
        <span className="ml-auto text-xs text-indigo-400 font-medium px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full">Σταθερό</span>
      </div>
      <div className="p-5">
        <ol className="space-y-3">
          {EIDIKOTERO_STEPS.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SlaNotesBullet({ text }) {
  return (
    <li className="flex gap-2 text-sm text-slate-700 leading-relaxed">
      <span className="flex-shrink-0 text-slate-400 mt-0.5">•</span>
      <span>{text}</span>
    </li>
  );
}

function SlaNotesBlock() {
  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-blue-100 bg-blue-50/50">
        <Info className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-800">6. Σημειώσεις SLA:</h3>
        <span className="ml-auto text-xs text-blue-400 font-medium px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">Σταθερό</span>
      </div>
      <div className="p-5">
        <ul className="space-y-3">
          {SLA_NOTES.map((note, i) => (
            <SlaNotesBullet key={i} text={note} />
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FullManagementPlanForm({ submission, incidents, assets, workOrders, crews, onClose }) {
  const { toast } = useToast();
  const isEditing = !!submission;

  // ── Linked record selectors ──
  const [linkedIncidentId, setLinkedIncidentId] = useState(submission?.incident_id    || "");
  const [linkedAssetId,    setLinkedAssetId]    = useState(submission?.asset_id       || "");
  const [linkedWOId,       setLinkedWOId]       = useState(submission?.work_order_id  || "");

  // ── Manual fields ──
  const [outlineDate, setOutlineDate] = useState(submission?.fmp_outline_date || "");
  const [owrValue,    setOwrValue]    = useState(submission?.ektos_eggyhshs   || "");
  const [caValue,     setCaValue]     = useState(submission?.apaiteitai_eggkrisi_ca || "ΟΧΙ");

  // OWR → CA lock logic
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

  // ── Derived auto-fill ──
  const incident = useMemo(() => incidents.find(i => i.id === linkedIncidentId), [incidents, linkedIncidentId]);
  const asset    = useMemo(() => assets.find(a => a.id === linkedAssetId),       [assets, linkedAssetId]);
  const workOrder = useMemo(() => workOrders.find(w => w.id === linkedWOId),     [workOrders, linkedWOId]);

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

  const subsystem   = useMemo(() => deriveSubsystem(incident), [incident]);
  const subcategory = useMemo(() => deriveSubcategory(incident), [incident]);

  const rawPriority = incident?.initial_priority || incident?.priority || "";
  const priority = ["P1", "P2"].includes(rawPriority) ? rawPriority : "";
  const isHighPriority = priority === "P1";

  const makeSafe = incident?.requires_make_safe || false;
  const assetWOs = useMemo(() => workOrders.filter(w => w.related_asset_id === asset?.id), [workOrders, asset]);
  const responsibleTeam = workOrder?.assigned_to || assetWOs[0]?.assigned_to || "—";

  const reportDate = incident?.reported_date || incident?.first_report_date;

  // ── SLA auto-calculations ──
  const confirmationDeadline = useMemo(() =>
    calcConfirmationDeadline(reportDate, isHighPriority), [reportDate, isHighPriority]);
  const fmpiDeadline = useMemo(() =>
    calcFmpiDeadline(reportDate, owrValue), [reportDate, owrValue]);
  const repairDeadline = useMemo(() =>
    calcRepairDeadline(outlineDate, owrValue, null), [outlineDate, owrValue]);

  // ── Save mutation ──
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
    if (!linkedAssetId)    { toast({ title: "Επιλέξτε asset", variant: "destructive" }); return; }
    if (!linkedWOId)       { toast({ title: "Επιλέξτε Work Order", variant: "destructive" }); return; }
    if (!outlineDate)      { toast({ title: "Συμπληρώστε: Ημερομηνία Outline management plan", variant: "destructive" }); return; }
    if (!owrValue)         { toast({ title: "Επιλέξτε: Εκτός Εγγύησης (OWR)", variant: "destructive" }); return; }
    saveMutation.mutate({
      form_type: "full_management_plan",
      form_name: "Full Management Plan",
      incident_id: linkedIncidentId,
      asset_id: linkedAssetId,
      work_order_id: linkedWOId,
      status,
      fmp_outline_date: outlineDate,
      ektos_eggyhshs: owrValue,
      apaiteitai_eggkrisi_ca: caValue,
      submitted_at: status === "Submitted" ? new Date().toISOString() : submission?.submitted_at,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Full Management Plan"
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
        <div className="max-w-4xl mx-auto p-6 space-y-5">

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

          {/* ── SECTION 1: General / Incident / Work Order ── */}
          <Section title="1. General / Incident / Work Order Details" icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
              <ReadOnlyField label="Workorder Number" value={workOrder?.work_order_id} />
              <ReadOnlyField label="Ημερομηνία Αναφοράς απο Α.Α.:" value={fmtDate(reportDate)} />
              {/* Manual: Ημερομηνία Outline management plan */}
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
                        <Paperclip className="w-3 h-3" /> {att.file_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ── SECTION 2: Operational Details ── */}
          <Section title="2. Operational Details" icon={Wrench}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium text-slate-500">Απαιτείται Make Safe:</Label>
                <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                  <span className="flex-1">{makeSafe ? "ΝΑΙ" : incident ? "ΟΧΙ" : "—"}</span>
                  {incident && <MakeSafeBadge value={makeSafe} />}
                </div>
              </div>
              <ReadOnlyField label="Επαρχία:" value={asset?.city} />
              <ReadOnlyField label="Δήμος:" value={asset?.municipality} />
              <div className="col-span-2">
                <ReadOnlyField label="Διεύθυνση:" value={asset?.location_address} />
              </div>
              <div className="col-span-2">
                <ReadOnlyField label="Προέλευση Αναφοράς Συμβάντος:" value={incident?.incident_source} />
              </div>
              <div className="col-span-2">
                <ReadOnlyField label="Υπεύθυνη Ομάδα:" value={responsibleTeam} />
              </div>
            </div>
          </Section>

          {/* ── SECTION 3: Decision Logic ── */}
          <Section title="3. Decision Logic" accent="border-amber-200">
            <div className="space-y-4">
              {/* OWR */}
              <div className={`rounded-lg p-4 border transition-colors ${owrValue === "ΝΑΙ" ? "bg-amber-50 border-amber-200" : owrValue === "ΟΧΙ" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm font-semibold text-slate-700">Εκτός Εγγύησης (OWR): *</Label>
                  {owrValue && <OWRBadge value={owrValue} />}
                </div>
                <Select value={owrValue || "_none"} onValueChange={v => setOwrValue(v === "_none" ? "" : v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Επιλογή..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
                    <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* CA Approval */}
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

          {/* ── SECTION 4: SLA – Κύριες Ημερομηνίες (auto-calculated) ── */}
          <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-blue-100 bg-blue-50/60">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">4. SLA – Κύριες Ημερομηνίες</h3>
              <span className="ml-auto text-xs text-blue-500 font-medium px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                Αυτόματος Υπολογισμός
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {/* Confirmation deadline */}
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
                  {confirmationDeadline && priority && (
                    <span className="text-xs text-blue-500 italic">
                      {isHighPriority ? "Ίδια εργάσιμη" : "+2 εργάσιμες"}
                    </span>
                  )}
                </div>
              </div>

              {/* Outline Plan = outline date */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Outline Plan
                </Label>
                <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                  <span className="flex-1">
                    {outlineDate ? fmtDate(outlineDate) : <span className="text-slate-300 italic">— (από Ημερομηνία Outline)</span>}
                  </span>
                </div>
              </div>

              {/* FMPI deadline */}
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
                  {fmpiDeadline && <span className="text-xs text-blue-500 italic">+7 ημέρες</span>}
                </div>
              </div>

              {/* Repair deadline */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Αναμενόμενη Προθεσμία Επισκευής*
                </Label>
                <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                  <span className="flex-1">
                    {repairDeadline ? fmtDate(repairDeadline) : <span className="text-slate-300 italic">—</span>}
                  </span>
                  {repairDeadline && owrValue && (
                    <span className="text-xs text-blue-500 italic">
                      {owrValue === "ΟΧΙ" ? "+28 ημέρες (outline)" : "+21 ημέρες (έγκριση CA)"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 5: Ειδικότερα ── */}
          <EidikoteraBlock />

          {/* ── SECTION 6: Σημειώσεις SLA ── */}
          <SlaNotesBlock />

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