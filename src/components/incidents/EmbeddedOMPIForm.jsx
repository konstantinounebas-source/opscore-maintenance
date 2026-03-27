import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Send, Lock, AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, Paperclip, Clock, Wrench } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <div className="flex items-center gap-2 min-h-[34px] px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <span className="flex-1">{value || <span className="text-slate-300 italic">—</span>}</span>
      </div>
    </div>
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

export default function EmbeddedOMPIForm({ incident, onSubmitted }) {
  const { toast } = useToast();
  const incidentId = incident?.id;

  const [proxEpivevaioshs, setProxEpivevaioshs] = useState("");
  const [outlinePlan, setOutlinePlan] = useState("");
  const [proxFmpi, setProxFmpi] = useState("");
  const [proxEpiskeuhs, setProxEpiskeuhs] = useState("");
  const [owrValue, setOwrValue] = useState("");
  const [caValue, setCaValue] = useState("NO");

  const caAutoLocked = owrValue === "NO";
  useEffect(() => { if (owrValue === "NO") setCaValue("NO"); }, [owrValue]);

  const { data: incidentAttachments = [] } = useQuery({
    queryKey: ["incidentAttachments", incidentId],
    queryFn: () => base44.entities.IncidentAttachments.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  const { data: asset } = useQuery({
    queryKey: ["asset", incident?.related_asset_id],
    queryFn: () => base44.entities.Assets.filter({ id: incident.related_asset_id }).then(r => r[0]),
    enabled: !!incident?.related_asset_id,
  });

  // Check for existing draft
  const { data: existingSubmissions = [] } = useQuery({
    queryKey: ["formSubmissions", incidentId, "outline_management_incident_plan"],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: "outline_management_incident_plan" }),
    enabled: !!incidentId,
  });

  const existingDraft = existingSubmissions.find(s => s.status === "Draft");

  useEffect(() => {
    if (existingDraft) {
      setProxEpivevaioshs(existingDraft.proxthesmia_epivevaioshs_lhpsis || "");
      setOutlinePlan(existingDraft.outline_plan || "");
      setProxFmpi(existingDraft.proxthesmia_fmpi || "");
      setProxEpiskeuhs(existingDraft.anammenomeni_proxthesmia_episkeuhs || "");
      setOwrValue(existingDraft.ektos_eggyhshs || "");
      setCaValue(existingDraft.apaiteitai_eggkrisi_ca || "NO");
    }
  }, [existingDraft?.id]);

  const subsystem = useMemo(() => deriveSubsystem(incident), [incident]);
  const subcategory = useMemo(() => deriveSubcategory(incident), [incident]);
  const rawPriority = incident?.initial_priority || incident?.priority || "";
  const priority = ["P1", "P2"].includes(rawPriority) ? rawPriority : "";
  const makeSafe = incident?.requires_make_safe || false;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingDraft) return base44.entities.FormSubmissions.update(existingDraft.id, data);
      return base44.entities.FormSubmissions.create(data);
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "Submitted" ? "OMPI Form Submitted" : "Draft saved" });
      if (vars.status === "Submitted") onSubmitted?.();
    },
    onError: (err) => toast({ title: err.message || "Save error", variant: "destructive" }),
  });

  const handleSave = (status = "Draft") => {
    if (status === "Submitted") {
      if (!proxEpivevaioshs) { toast({ title: "Συμπληρώστε: Προθεσμία Επιβεβαίωσης Λήψης", variant: "destructive" }); return; }
      if (!outlinePlan) { toast({ title: "Συμπληρώστε: Outline Plan", variant: "destructive" }); return; }
      if (!proxFmpi) { toast({ title: "Συμπληρώστε: Προθεσμία FMPI", variant: "destructive" }); return; }
      if (!proxEpiskeuhs) { toast({ title: "Συμπληρώστε: Αναμενόμενη Προθεσμία Επισκευής", variant: "destructive" }); return; }
      if (!owrValue) { toast({ title: "Επιλέξτε: Εκτός Εγγύησης (OWR)", variant: "destructive" }); return; }
    }
    saveMutation.mutate({
      form_type: "outline_management_incident_plan",
      form_name: "Outline Management Incident Plan",
      incident_id: incidentId,
      asset_id: incident?.related_asset_id || "",
      status,
      proxthesmia_epivevaioshs_lhpsis: proxEpivevaioshs,
      outline_plan: outlinePlan,
      proxthesmia_fmpi: proxFmpi,
      anammenomeni_proxthesmia_episkeuhs: proxEpiskeuhs,
      ektos_eggyhshs: owrValue,
      apaiteitai_eggkrisi_ca: caValue,
      submitted_at: status === "Submitted" ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">OMPI Form</p>
        {existingDraft && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Draft saved</span>
        )}
        {existingSubmissions.some(s => s.status === "Submitted") && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Previously submitted</span>
        )}
      </div>

      {/* Read-only incident info */}
      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
        <ReadOnlyField label="Κωδικός Στάσης" value={asset?.active_shelter_id || asset?.asset_id} />
        <ReadOnlyField label="Προτεραιότητα" value={priority} />
        <ReadOnlyField label="Τύπος Στεγάστρου" value={asset?.shelter_type} />
        <ReadOnlyField label="Υποσύστημα" value={subsystem} />
        <ReadOnlyField label="Υποκατηγορία" value={subcategory} />
      </div>

      {incidentAttachments.length > 0 && (
        <div className="px-3 py-2 rounded-md bg-slate-50 border border-slate-200">
          <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1"><Paperclip className="w-3 h-3" /> Συννημένα αποδεικτικά</p>
          <div className="flex flex-wrap gap-2">
            {incidentAttachments.slice(0, 5).map(att => (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                <Paperclip className="w-3 h-3" /> {att.file_name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SLA dates */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
        <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> SLA – Κύριες Ημερομηνίες</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-600">Προθεσμία Επιβεβαίωσης Λήψης *</Label>
            <Input type="datetime-local" value={proxEpivevaioshs} onChange={e => setProxEpivevaioshs(e.target.value)} className="text-sm mt-1 h-8" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600">Προθεσμία FMPI *</Label>
            <Input type="datetime-local" value={proxFmpi} onChange={e => setProxFmpi(e.target.value)} className="text-sm mt-1 h-8" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-slate-600">Αναμενόμενη Προθεσμία Επισκευής *</Label>
            <Input type="datetime-local" value={proxEpiskeuhs} onChange={e => setProxEpiskeuhs(e.target.value)} className="text-sm mt-1 h-8" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-slate-600">Outline Plan *</Label>
            <Textarea placeholder="Περιγράψτε το σχέδιο..." value={outlinePlan} onChange={e => setOutlinePlan(e.target.value)} className="text-sm mt-1" rows={2} />
          </div>
        </div>
      </div>

      {/* Decision Logic */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700">Εκτός Εγγύησης (OWR) *</Label>
        <Select value={owrValue || "_none"} onValueChange={v => setOwrValue(v === "_none" ? "" : v)}>
          <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Επιλογή —</SelectItem>
            <SelectItem value="YES">YES</SelectItem>
            <SelectItem value="NO">NO</SelectItem>
          </SelectContent>
        </Select>
        {owrValue === "YES" && (
          <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> CA Approval will be required.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700">Απαιτείται Έγκριση CA</Label>
        {caAutoLocked ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 italic px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
            <Lock className="w-3 h-3" /> Αυτόματο: NO λόγω εντός εγγύησης
          </div>
        ) : (
          <Select value={caValue} onValueChange={setCaValue}>
            <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="YES">YES</SelectItem>
              <SelectItem value="NO">NO</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Make safe */}
      {makeSafe && (
        <div className="flex items-center gap-1.5 text-xs text-orange-700 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md">
          <Wrench className="w-3 h-3" /> Make Safe Απαιτείται
        </div>
      )}

      {/* Form action buttons */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending}>
          <Save className="w-3.5 h-3.5" /> Save Draft
        </Button>
        <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs gap-1.5" onClick={() => handleSave("Submitted")} disabled={saveMutation.isPending}>
          <Send className="w-3.5 h-3.5" /> Submit OMPI Form
        </Button>
      </div>
    </div>
  );
}