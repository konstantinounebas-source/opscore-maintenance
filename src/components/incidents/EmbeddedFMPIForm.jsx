import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Send, Lock, AlertTriangle, Clock, Paperclip } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { addBusinessDays, addDays, format } from "date-fns";

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

function fmtDate(d) {
  try { return d ? format(new Date(d), "dd/MM/yyyy") : "—"; } catch { return "—"; }
}

function deriveSubsystem(incident) {
  const parts = [];
  if (incident?.subsystem_structural_selected) parts.push("Structural");
  if (incident?.subsystem_electrical_selected) parts.push("Electrical");
  if (incident?.subsystem_electronic_selected) parts.push("Electronic");
  if (incident?.subsystem_other_selected) parts.push("Other");
  return parts.join(", ") || "—";
}

export default function EmbeddedFMPIForm({ incident, onSubmitted }) {
  const { toast } = useToast();
  const incidentId = incident?.id;

  const [outlineDate, setOutlineDate] = useState("");
  const [owrValue, setOwrValue] = useState("");
  const [caValue, setCaValue] = useState("ΟΧΙ");

  const caAutoLocked = owrValue === "ΟΧΙ";
  useEffect(() => { if (owrValue === "ΟΧΙ") setCaValue("ΟΧΙ"); }, [owrValue]);

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

  const { data: workOrders = [] } = useQuery({
    queryKey: ["workOrders", incidentId],
    queryFn: () => base44.entities.WorkOrders.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  const linkedWO = workOrders[0];

  // Check for existing draft
  const { data: existingSubmissions = [] } = useQuery({
    queryKey: ["formSubmissions", incidentId, "full_management_plan"],
    queryFn: () => base44.entities.FormSubmissions.filter({ incident_id: incidentId, form_type: "full_management_plan" }),
    enabled: !!incidentId,
  });

  const existingDraft = existingSubmissions.find(s => s.status === "Draft");

  useEffect(() => {
    if (existingDraft) {
      setOutlineDate(existingDraft.fmp_outline_date || "");
      setOwrValue(existingDraft.ektos_eggyhshs || "");
      setCaValue(existingDraft.apaiteitai_eggkrisi_ca || "ΟΧΙ");
    }
  }, [existingDraft?.id]);

  const subsystem = useMemo(() => deriveSubsystem(incident), [incident]);
  const rawPriority = incident?.initial_priority || incident?.priority || "";
  const priority = ["P1", "P2"].includes(rawPriority) ? rawPriority : "";
  const isHighPriority = priority === "P1";
  const reportDate = incident?.reported_date || incident?.first_report_date;

  // SLA calculations
  const confirmationDeadline = useMemo(() => {
    if (!reportDate) return null;
    return isHighPriority ? addBusinessDays(new Date(reportDate), 1) : addBusinessDays(new Date(reportDate), 2);
  }, [reportDate, isHighPriority]);

  const fmpiDeadline = useMemo(() => {
    if (!reportDate || owrValue !== "ΝΑΙ") return null;
    const confirmDate = addBusinessDays(new Date(reportDate), 2);
    return addDays(confirmDate, 7);
  }, [reportDate, owrValue]);

  const repairDeadline = useMemo(() => {
    if (!outlineDate) return null;
    if (owrValue === "ΟΧΙ") return addDays(new Date(outlineDate), 28);
    return addDays(new Date(outlineDate), 21);
  }, [outlineDate, owrValue]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingDraft) return base44.entities.FormSubmissions.update(existingDraft.id, data);
      return base44.entities.FormSubmissions.create(data);
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "Submitted" ? "FMPI Form Submitted" : "Draft saved" });
      if (vars.status === "Submitted") onSubmitted?.();
    },
    onError: (err) => toast({ title: err.message || "Save error", variant: "destructive" }),
  });

  const handleSave = (status = "Draft") => {
    if (status === "Submitted") {
      if (!outlineDate) { toast({ title: "Συμπληρώστε: Ημερομηνία Outline management plan", variant: "destructive" }); return; }
      if (!owrValue) { toast({ title: "Επιλέξτε: Εκτός Εγγύησης (OWR)", variant: "destructive" }); return; }
    }
    saveMutation.mutate({
      form_type: "full_management_plan",
      form_name: "Full Management Plan",
      incident_id: incidentId,
      asset_id: incident?.related_asset_id || "",
      work_order_id: linkedWO?.id || "",
      status,
      fmp_outline_date: outlineDate,
      ektos_eggyhshs: owrValue,
      apaiteitai_eggkrisi_ca: caValue,
      submitted_at: status === "Submitted" ? new Date().toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">FMPI Form</p>
        {existingDraft && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Draft saved</span>
        )}
        {existingSubmissions.some(s => s.status === "Submitted") && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Previously submitted</span>
        )}
      </div>

      {/* Read-only info */}
      <div className="grid grid-cols-2 gap-3">
        <ReadOnlyField label="Incident Number" value={incident?.incident_id} />
        <ReadOnlyField label="Work Order" value={linkedWO?.work_order_id || "—"} />
        <ReadOnlyField label="Κωδικός Στάσης" value={asset?.active_shelter_id || asset?.asset_id} />
        <ReadOnlyField label="Προτεραιότητα" value={priority} />
        <ReadOnlyField label="Τύπος Στεγάστρου" value={asset?.shelter_type} />
        <ReadOnlyField label="Υποσύστημα" value={subsystem} />
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

      {/* Outline date */}
      <div>
        <Label className="text-xs font-semibold text-slate-600">Ημερομηνία Outline management plan *</Label>
        <Input type="date" value={outlineDate} onChange={e => setOutlineDate(e.target.value)} className="text-sm mt-1 h-8" />
      </div>

      {/* OWR */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700">Εκτός Εγγύησης (OWR) *</Label>
        <Select value={owrValue || "_none"} onValueChange={v => setOwrValue(v === "_none" ? "" : v)}>
          <SelectTrigger className="text-sm h-8"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Επιλογή —</SelectItem>
            <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
            <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* CA */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700">Απαιτείται Έγκριση CA</Label>
        {caAutoLocked ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 italic px-3 py-2 bg-slate-50 border border-slate-200 rounded-md">
            <Lock className="w-3 h-3" /> Αυτόματο: ΟΧΙ λόγω εντός εγγύησης
          </div>
        ) : (
          <Select value={caValue} onValueChange={setCaValue}>
            <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
              <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* SLA auto-calc */}
      {(confirmationDeadline || fmpiDeadline || repairDeadline) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> SLA – Αυτόματος Υπολογισμός</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {confirmationDeadline && (
              <div><span className="text-slate-500">Επιβεβαίωση:</span> <span className="font-semibold text-slate-700">{fmtDate(confirmationDeadline)}</span></div>
            )}
            {fmpiDeadline && (
              <div><span className="text-slate-500">FMPI:</span> <span className="font-semibold text-slate-700">{fmtDate(fmpiDeadline)}</span></div>
            )}
            {repairDeadline && (
              <div className="col-span-2"><span className="text-slate-500">Επισκευή:</span> <span className="font-semibold text-slate-700">{fmtDate(repairDeadline)}</span>
                <span className="text-blue-500 ml-1 italic">{owrValue === "ΟΧΙ" ? "(+28 ημέρες)" : "(+21 ημέρες)"}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form action buttons */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending}>
          <Save className="w-3.5 h-3.5" /> Save Draft
        </Button>
        <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs gap-1.5" onClick={() => handleSave("Submitted")} disabled={saveMutation.isPending}>
          <Send className="w-3.5 h-3.5" /> Submit FMPI Form
        </Button>
      </div>
    </div>
  );
}