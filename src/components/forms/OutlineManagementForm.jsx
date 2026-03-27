import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Send, AlertTriangle, CheckCircle2,
  ShieldAlert, ShieldCheck, Calendar, Info, Lock, Paperclip,
  Clock, Wrench
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// ── Read-only field display ────────────────────────────────────────────────────
function ReadOnlyField({ label, value, badge, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <span className="flex-1">{value || <span className="text-slate-300 italic">—</span>}</span>
        {badge}
        {children}
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
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

// ── Priority badge ─────────────────────────────────────────────────────────
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

// ── OWR badge ─────────────────────────────────────────────────────────────
function OWRBadge({ value }) {
  if (value === "YES") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <AlertTriangle className="w-3 h-3" /> Εκτός Εγγύησης
    </span>
  );
  if (value === "NO") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Εντός Εγγύησης
    </span>
  );
  return null;
}

// ── CA Approval badge ─────────────────────────────────────────────────────
function CABadge({ value, autoLocked }) {
  if (autoLocked) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <Lock className="w-3 h-3" /> Αυτόματο: NO
    </span>
  );
  if (value === "YES") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
      <ShieldAlert className="w-3 h-3" /> Απαιτείται Έγκριση
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="w-3 h-3" /> NO
    </span>
  );
}

// ── Make Safe badge ────────────────────────────────────────────────────────
function MakeSafeBadge({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
      <Wrench className="w-3 h-3" /> Make Safe Απαιτείται
    </span>
  );
}

// ── Static Process Block ──────────────────────────────────────────────────
const PROCESS_STEPS = [
  "Καταχώρηση περιστατικού στο Help Desk και έκδοση κωδικού αναφοράς (Incident No.).",
  "Επιβεβαίωση λήψης περιστατικού και αποστολή σχετικής ενημέρωσης προς την ΑΑ (CA).",
  "Άμεση τεχνική διερεύνηση και εκτίμηση απαιτούμενων εργασιών. Αξιολόγηση του προβλήματος βάσει των στοιχείων που υποβλήθηκαν (φωτογραφίες, βίντεο, αναφορές).",
  "Εφόσον απαιτείται, επίσκεψη στον χώρο για περαιτέρω διερεύνηση και τεκμηρίωση.",
  "Επισκευή / επιδιόρθωση των προβλημάτων εντός των χρονικών ορίων του SLA, όπου αυτό είναι άμεσα εφικτό.",
  "Αποστολή τελικής φόρμας αναφοράς με φωτογραφίες μετά την επισκευή / επιδιόρθωση, για ενημέρωση της ΑΑ.",
];

function StaticProcessBlock() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-indigo-50/40">
        <Info className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-800">Διαδικασία Διαχείρισης Περιστατικού</h3>
        <span className="ml-auto text-xs text-indigo-400 font-medium px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full">Σταθερό</span>
      </div>
      <div className="p-5">
        <ol className="space-y-3">
          {PROCESS_STEPS.map((step, i) => (
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

// ── Derive subsystem from incident ────────────────────────────────────────
function deriveSubsystem(incident) {
  const parts = [];
  if (incident?.subsystem_structural_selected) parts.push("Structural");
  if (incident?.subsystem_electrical_selected) parts.push("Electrical");
  if (incident?.subsystem_electronic_selected) parts.push("Electronic");
  if (incident?.subsystem_other_selected)       parts.push("Other");
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

// ── Main Form Component ────────────────────────────────────────────────────
export default function OutlineManagementForm({ submission, incidents, assets, workOrders, crews, onClose }) {
  const { toast } = useToast();
  const isEditing = !!submission;

  // ── Linked record selectors ──
  const [linkedIncidentId, setLinkedIncidentId] = useState(submission?.incident_id || "");
  const [linkedAssetId, setLinkedAssetId]       = useState(submission?.asset_id    || "");

  // ── Manual fields ──
  const [proxEpivevaioshs, setProxEpivevaioshs] = useState(submission?.proxthesmia_epivevaioshs_lhpsis || "");
  const [outlinePlan, setOutlinePlan]           = useState(submission?.outline_plan || "");
  const [proxFmpi, setProxFmpi]                 = useState(submission?.proxthesmia_fmpi || "");
  const [proxEpiskeuhs, setProxEpiskeuhs]       = useState(submission?.anammenomeni_proxthesmia_episkeuhs || "");
  const [owrValue, setOwrValue]                 = useState(submission?.ektos_eggyhshs || "");
  const [caValue, setCaValue]                   = useState(submission?.apaiteitai_eggkrisi_ca || "NO");
  const [formStatus, setFormStatus]             = useState(submission?.status || "Draft");

  // ── Attachments from Incident ──
  const { data: incidentAttachments = [] } = useQuery({
    queryKey: ["incidentAttachments", linkedIncidentId],
    queryFn: () => linkedIncidentId
      ? base44.entities.IncidentAttachments.filter({ incident_id: linkedIncidentId })
      : Promise.resolve([]),
    enabled: !!linkedIncidentId,
  });

  // OWR logic: if NO → lock CA to NO
  const caAutoLocked = owrValue === "NO";
  useEffect(() => {
    if (owrValue === "NO") setCaValue("NO");
  }, [owrValue]);

  // ── Derived auto-fill values ──
  const incident = useMemo(() => incidents.find(i => i.id === linkedIncidentId), [incidents, linkedIncidentId]);
  const asset    = useMemo(() => assets.find(a => a.id === linkedAssetId),       [assets, linkedAssetId]);

  // Auto-fill asset from incident if not manually set
  useEffect(() => {
    if (incident?.related_asset_id && !linkedAssetId) {
      setLinkedAssetId(incident.related_asset_id);
    }
  }, [incident]);

  const subsystem  = useMemo(() => deriveSubsystem(incident), [incident]);
  const subcategory = useMemo(() => deriveSubcategory(incident), [incident]);

  // Priority — only P1/P2
  const rawPriority = incident?.initial_priority || incident?.priority || "";
  const priority = ["P1", "P2"].includes(rawPriority) ? rawPriority : rawPriority?.startsWith("P") ? rawPriority : "";

  // Responsible crew/team from work orders or assignments
  const assetWOs = useMemo(() => workOrders.filter(w => w.related_asset_id === asset?.id), [workOrders, asset]);
  const responsibleTeam = assetWOs[0]?.assigned_to || asset?.assigned_to || "—";

  // Make safe
  const makeSafe = incident?.requires_make_safe || false;

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

  const handleSave = (status = formStatus) => {
    if (!linkedIncidentId) { toast({ title: "Επιλέξτε περιστατικό", variant: "destructive" }); return; }
    if (!linkedAssetId)    { toast({ title: "Επιλέξτε asset", variant: "destructive" }); return; }
    if (!proxEpivevaioshs) { toast({ title: "Συμπληρώστε: Προθεσμία Επιβεβαίωσης Λήψης", variant: "destructive" }); return; }
    if (!outlinePlan)      { toast({ title: "Συμπληρώστε: Outline Plan", variant: "destructive" }); return; }
    if (!proxFmpi)         { toast({ title: "Συμπληρώστε: Προθεσμία FMPI", variant: "destructive" }); return; }
    if (!proxEpiskeuhs)    { toast({ title: "Συμπληρώστε: Αναμενόμενη Προθεσμία Επισκευής", variant: "destructive" }); return; }
    if (!owrValue)         { toast({ title: "Επιλέξτε: Εκτός Εγγύησης (OWR)", variant: "destructive" }); return; }
    saveMutation.mutate({
      form_type: "outline_management_incident_plan",
      form_name: "Outline Management Incident Plan",
      incident_id: linkedIncidentId,
      asset_id: linkedAssetId,
      status,
      proxthesmia_epivevaioshs_lhpsis: proxEpivevaioshs,
      outline_plan: outlinePlan,
      proxthesmia_fmpi: proxFmpi,
      anammenomeni_proxthesmia_episkeuhs: proxEpiskeuhs,
      ektos_eggyhshs: owrValue,
      apaiteitai_eggkrisi_ca: caValue,
      submitted_at: status === "Submitted" ? new Date().toISOString() : submission?.submitted_at,
    });
  };

  const fmtDate = (d) => { try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; } };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Outline Management Incident Plan"
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

          {/* Linked record selectors */}
          <div className="bg-white rounded-xl border border-indigo-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Info className="w-4 h-4" /> Σύνδεση Εγγραφών
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Περιστατικό (Incident) *</Label>
                <Select value={linkedIncidentId || "_none"} onValueChange={v => setLinkedIncidentId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="Επιλογή περιστατικού..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {incidents.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        <span className="font-mono text-xs mr-2">{i.incident_id}</span>{i.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600">Asset *</Label>
                <Select value={linkedAssetId || "_none"} onValueChange={v => setLinkedAssetId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="Επιλογή asset..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="font-mono text-xs mr-2">{a.asset_id}</span>{a.active_shelter_id || a.location_address || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 1: General / Incident Details */}
          <Section title="1. General / Incident Details" icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
              <ReadOnlyField label="Ημερομηνία Αναφοράς απο Α.Α.:" value={fmtDate(incident?.reported_date || incident?.first_report_date)} />
              <ReadOnlyField label="Ημερομηνία Έκδοσης:" value={fmtDate(incident?.issue_date || new Date().toISOString())} />
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

          {/* Section 2: SLA – Κύριες Ημερομηνίες */}
          <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-blue-100 bg-blue-50/60">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">2. SLA – Κύριες Ημερομηνίες</h3>
              <span className="ml-auto text-xs text-blue-500 font-medium px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                Χειροκίνητη εισαγωγή
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Προθεσμία Επιβεβαίωσης Λήψης *
                </Label>
                <Input type="datetime-local" value={proxEpivevaioshs} onChange={e => setProxEpivevaioshs(e.target.value)}
                  className="text-sm mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Προθεσμία FMPI (Αν απαιτείται) *
                </Label>
                <Input type="datetime-local" value={proxFmpi} onChange={e => setProxFmpi(e.target.value)}
                  className="text-sm mt-1" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Αναμενόμενη Προθεσμία Επισκευής *
                </Label>
                <Input type="datetime-local" value={proxEpiskeuhs} onChange={e => setProxEpiskeuhs(e.target.value)}
                  className="text-sm mt-1" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Outline Plan (το παρόν) *</Label>
                <Textarea placeholder="Περιγράψτε το σχέδιο..." value={outlinePlan} onChange={e => setOutlinePlan(e.target.value)}
                  className="text-sm mt-1" rows={3} />
              </div>
            </div>
          </div>

          {/* Section 3: Operational Details */}
          <Section title="3. Operational Details" icon={Wrench}>
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

          {/* Section 4: Decision Logic */}
          <Section title="4. Decision Logic" accent="border-amber-200">
            <div className="space-y-4">
              {/* OWR */}
              <div className={`rounded-lg p-4 border transition-colors ${owrValue === "YES" ? "bg-amber-50 border-amber-200" : owrValue === "NO" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
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
                    <SelectItem value="YES">YES</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CA Approval */}
              <div className={`rounded-lg p-4 border transition-colors ${caValue === "YES" && !caAutoLocked ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-sm font-semibold text-slate-700">Απαιτείται Έγκριση απο CA:</Label>
                  <CABadge value={caValue} autoLocked={caAutoLocked} />
                </div>
                {caAutoLocked ? (
                  <div className="text-xs text-slate-500 italic mt-1 flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    Αυτόματο: NO λόγω εντός εγγύησης
                  </div>
                ) : (
                  <Select value={caValue || "NO"} onValueChange={v => setCaValue(v)} disabled={caAutoLocked}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">YES</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Section>

          {/* Section 5: Static Process Block */}
          <StaticProcessBlock />

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