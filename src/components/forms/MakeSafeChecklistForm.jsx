import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import { generateWorkOrderId } from "@/lib/workOrderIdGenerator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send, Printer, ShieldAlert, ZapOff, CheckCircle2, AlertTriangle, Upload, X } from "lucide-react";
import { openHtmlPrintWindow } from "@/lib/printFormAsPDF";
import { useToast } from "@/components/ui/use-toast";
import FileUploadArea from "@/components/shared/FileUploadArea";

// ── PDF-style primitives ──────────────────────────────────────────────────────

function PdfSection({ title, children, redTitle }) {
  return (
    <div className="border border-black">
      <div className={`px-2 py-1 font-bold text-xs uppercase tracking-wide border-b border-black ${redTitle ? "bg-red-50 text-red-800" : "bg-gray-200 text-gray-900"}`}>
        {title}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <span className="font-bold text-xs text-gray-800 whitespace-nowrap">{children}</span>;
}

function FieldValue({ children, className }) {
  return (
    <span className={`text-xs text-gray-900 border-b border-gray-400 min-w-[80px] inline-block px-1 ${className || ""}`}>
      {children || "\u00A0"}
    </span>
  );
}

function ChkBox({ checked, onChange, label, className }) {
  return (
    <label className={`flex items-center gap-1 cursor-pointer ${className || ""}`}>
      <span
        onClick={() => onChange(!checked)}
        className={`inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0 cursor-pointer text-xs font-bold select-none
          ${checked ? "bg-gray-800 border-gray-800 text-white" : "bg-white border-gray-500"}`}
      >
        {checked ? "✓" : ""}
      </span>
      {label && <span className="text-xs text-gray-800 leading-tight">{label}</span>}
    </label>
  );
}

function RadioOpt({ name, value, current, onChange, label }) {
  return (
    <label className="flex items-center gap-1 cursor-pointer">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(value)} className="w-3.5 h-3.5" />
      <span className="text-xs text-gray-800">{label}</span>
    </label>
  );
}

function EditableField({ value, onChange, placeholder, type = "text", className }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border-b border-gray-400 bg-transparent text-xs text-gray-900 outline-none focus:border-blue-500 px-1 min-w-[60px] ${className || ""}`}
    />
  );
}

function EditableTextarea({ value, onChange, placeholder, rows = 2, className }) {
  return (
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`border border-gray-300 bg-white text-xs text-gray-900 outline-none focus:border-blue-500 px-1 w-full resize-none ${className || ""}`}
    />
  );
}

// ── Default state (imported from shared schema) ───────────────────────────────
import { makeSafeDefaultData as defaultData } from "@/lib/formSchemas";

// ── Main Component ────────────────────────────────────────────────────────────
export default function MakeSafeChecklistForm({ submission, incidents, assets, workOrders, onClose, defaultIncidentId }) {
  const { toast } = useToast();
  const isEditing = !!submission;

  const [linkedIncidentId, setLinkedIncidentId] = useState(submission?.incident_id || defaultIncidentId || "");
  const [linkedWOId, setLinkedWOId]             = useState(submission?.work_order_id || "");
  const [linkedAssetId, setLinkedAssetId]       = useState(submission?.asset_id || "");

  const [fd, setFd] = useState(() => ({ ...defaultData(), ...(submission?.form_data || {}) }));

  const incident  = useMemo(() => incidents.find(i => i.id === linkedIncidentId), [incidents, linkedIncidentId]);
  const workOrder = useMemo(() => workOrders.find(w => w.id === linkedWOId), [workOrders, linkedWOId]);
  const asset     = useMemo(() => assets.find(a => a.id === linkedAssetId), [assets, linkedAssetId]);

  useEffect(() => {
    if (!linkedAssetId) {
      const src = incident?.related_asset_id || workOrder?.related_asset_id;
      if (src) setLinkedAssetId(src);
    }
  }, [incident, workOrder]);

  useEffect(() => {
    const resolveWO = async () => {
      if (!linkedIncidentId || !incident) return;
      // First try to find an existing Make-Safe WO for this incident
      const existingWOs = await base44.entities.WorkOrders.filter({ incident_id: linkedIncidentId });
      const makeSafeWO = existingWOs.find(w =>
        w.title?.toLowerCase().includes('make safe') || w.title?.toLowerCase().includes('make-safe')
      );
      if (makeSafeWO) {
        setLinkedWOId(makeSafeWO.id);
        return;
      }
      // None found — create one
      if (!linkedWOId) {
        try {
          const woId = await generateWorkOrderId("make_safe");
          const newWO = await base44.entities.WorkOrders.create({
            work_order_id: woId, incident_id: linkedIncidentId,
            title: `Make-Safe WO for ${incident.incident_id}`,
            related_asset_id: incident.related_asset_id, status: "Open", priority: incident.priority || "Medium",
          });
          setLinkedWOId(newWO.id);
        } catch (err) { console.error("Error creating work order:", err); }
      }
    };
    resolveWO();
  }, [linkedIncidentId, incident]);

  const set = (key, val) => setFd(prev => ({ ...prev, [key]: val }));

  const sigTechRef = useRef();
  const sigHdRef   = useRef();

  const handleSigUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field, { name: file.name, url: file_url });
  };

  const isHighRisk = fd.immediate_danger === "yes";
  const hasLoto    = fd.loto_ac || fd.loto_pv || fd.loto_battery || fd.loto_other;

  const [printingPDF, setPrintingPDF] = React.useState(false);
  const handlePrintPDF = async () => {
    setPrintingPDF(true);
    try {
      const res = await base44.functions.invoke('generateMakeSafeChecklistPDF', {
        incidentId: incident?.incident_id,
        workOrderId: workOrder?.work_order_id,
        formData: fd,
      });
      if (res.data?.html) { openHtmlPrintWindow(res.data.html, res.data.fileName); }
      else { toast({ title: "Σφάλμα δημιουργίας PDF", variant: "destructive" }); }
    } catch (err) { toast({ title: err.message || "Σφάλμα PDF", variant: "destructive" }); }
    finally { setPrintingPDF(false); }
  };

  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = isEditing
        ? await base44.entities.FormSubmissions.update(submission.id, data)
        : await base44.entities.FormSubmissions.create(data);

      const incId = data.incident_id;
      const user = await base44.auth.me();
      const timestamp = getAthensTimestamp();

      const allFiles = [
        ...(data.form_data?.photos_before || []),
        ...(data.form_data?.photos_after || []),
        ...[data.form_data?.sig_tech_upload, data.form_data?.sig_hd_upload].filter(Boolean),
      ].filter(f => f?.url);

      if (incId && allFiles.length > 0) {
        await Promise.all(allFiles.map(f =>
          base44.entities.IncidentAttachments.create({
            incident_id: incId, file_url: f.url,
            file_name: f.name || f.url.split("/").pop(),
            file_type: /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || "") ? "Photo" : "Document",
            uploaded_by: user?.email,
          })
        ));
      }

      if (data.status === "Submitted" && incId) {
        const existingWOs = await base44.entities.WorkOrders.filter({ incident_id: incId });
        const hasMakeSafeWO = existingWOs.some(w => w.title?.includes("Make Safe WO"));
        if (!hasMakeSafeWO) {
          const incidentList = await base44.entities.Incidents.filter({ id: incId });
          const inc = incidentList[0];
          const woId = await generateWorkOrderId("make_safe");
          await base44.entities.WorkOrders.create({
            work_order_id: woId, incident_id: incId,
            title: `Make Safe WO - ${inc?.incident_id || incId}`,
            related_asset_id: inc?.related_asset_id || data.asset_id,
            related_asset_name: inc?.related_asset_name || "",
            status: "Open", priority: "Critical",
            description: `Created via Make Safe Checklist form`,
            assigned_to: data.form_data?.technician || "",
          });
        }
        const incidentList2 = await base44.entities.Incidents.filter({ id: incId });
        if (incidentList2.length > 0) {
          await base44.entities.Incidents.update(incidentList2[0].id, { make_safe_done: true });
        }
      }

      const auditAttachments = [
        ...(data.status === "Submitted" && result?.id ? [{ url: `form:${result.id}:${data.form_type}`, name: `${data.form_name} (Submitted)`, author: user?.email, author_name: user?.full_name, created_at: timestamp }] : []),
        ...allFiles.map(f => ({ url: f.url, name: f.name || f.url.split("/").pop(), author: user?.email, author_name: user?.full_name, created_at: timestamp })),
      ];

      await base44.entities.IncidentAuditTrail.create({
        incident_id: incId,
        action: data.status === "Submitted" ? "Make Safe WO Created" : "Form Saved",
        details: data.status === "Submitted"
          ? `Make Safe Checklist submitted & WO created${data.form_data?.technician ? ` — Technician: ${data.form_data.technician}` : ""}`
          : `${data.form_name} – ${data.status}`,
        user: user?.email,
        ...(auditAttachments.length > 0 ? { attachment_metadata: auditAttachments } : {}),
      });

      return result;
    },
    onSuccess: (_, variables) => {
      if (variables.incident_id) {
        queryClient.invalidateQueries({ queryKey: ["workOrders", variables.incident_id] });
        queryClient.invalidateQueries({ queryKey: ["incidentAudit", variables.incident_id] });
        queryClient.invalidateQueries({ queryKey: ["incidentAttachments", variables.incident_id] });
        queryClient.invalidateQueries({ queryKey: ["incident", variables.incident_id] });
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
      }
      toast({ title: isEditing ? "Φόρμα ενημερώθηκε" : "Φόρμα αποθηκεύτηκε" });
      onClose();
    },
    onError: (err) => toast({ title: err.message || "Σφάλμα αποθήκευσης", variant: "destructive" }),
  });

  const handleSave = (status = "Draft") => {
    saveMutation.mutate({
      form_type: "make_safe_checklist",
      form_name: "MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ",
      incident_id: linkedIncidentId,
      asset_id: linkedAssetId,
      work_order_id: linkedWOId,
      status,
      submitted_at: status === "Submitted" ? getAthensTimestamp() : submission?.submitted_at,
      form_data: fd,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* ── Toolbar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-sm px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-red-800 uppercase tracking-wide">MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ</h1>
          <p className="text-xs text-gray-500">Smart Bus Shelters – Άμεση ασφάλιση χώρου/κινδύνου</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="gap-1 text-xs h-7">
            <ArrowLeft className="w-3 h-3" /> Πίσω
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintPDF} disabled={printingPDF} className="gap-1 text-xs h-7">
            <Printer className="w-3 h-3" /> {printingPDF ? "..." : "PDF / Εκτύπωση"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending} className="gap-1 text-xs h-7">
            <Save className="w-3 h-3" /> Draft
          </Button>
          <Button size="sm" onClick={() => handleSave("Submitted")} disabled={saveMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 gap-1 text-xs h-7">
            <Send className="w-3 h-3" /> Υποβολή
          </Button>
        </div>
      </div>

      {/* ── Alert banners ── */}
      {(isHighRisk || hasLoto) && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-red-50 border-b border-red-200">
          {isHighRisk && (
            <div className="flex items-center gap-2 bg-red-600 text-white rounded px-3 py-1.5 text-xs font-bold animate-pulse">
              <ShieldAlert className="w-4 h-4" /> ΑΜΕΣΟΣ ΚΙΝΔΥΝΟΣ ΖΩΗΣ – ΚΑΛΕΣΤΕ 112 / ΑΠΟΜΑΚΡΥΝΣΗ
            </div>
          )}
          {hasLoto && (
            <div className="flex items-center gap-2 bg-amber-500 text-white rounded px-3 py-1.5 text-xs font-semibold">
              <ZapOff className="w-3.5 h-3.5" /> LOTO – Ηλεκτρική Απομόνωση Ενεργή
            </div>
          )}
        </div>
      )}

      {/* ── Form body: print-style layout ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto space-y-1 bg-white border border-gray-300 shadow p-3 font-sans">

          {/* Title */}
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold underline text-red-800 uppercase tracking-wide">MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ</h2>
            <p className="text-xs text-gray-600">Smart Bus Shelters – Άμεση ασφάλιση χώρου/κινδύνου (Make-Safe)</p>
          </div>

          {/* Linked records selector */}
          <div className="border border-blue-200 rounded p-2 mb-2 bg-blue-50">
            <p className="text-xs font-semibold text-blue-800 mb-1.5">Σύνδεση Εγγραφών</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-gray-600 mb-0.5 block">Incident</Label>
                <Select value={linkedIncidentId || "_none"} onValueChange={v => setLinkedIncidentId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    {incidents.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        <span className="font-mono font-bold text-xs">{i.incident_id}</span>
                        <span className="mx-1 text-gray-300">|</span>
                        <span className="text-xs">{i.title?.replace(/\s*[-–]\s*\d{4}-\d{2}-\d{2}$/, "")}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-0.5 block">Work Order</Label>
                <div className="h-7 flex items-center px-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                  {workOrder?.work_order_id || <span className="text-gray-300 italic">Auto</span>}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600 mb-0.5 block">Asset / Στάση</Label>
                <Select value={linkedAssetId || "_none"} onValueChange={v => setLinkedAssetId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
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
            </div>
          </div>

          {/* ── A. ΣΤΟΙΧΕΙΑ ── */}
          <PdfSection title="A. ΣΤΟΙΧΕΙΑ">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr>
                  <td className="pr-2 py-0.5"><FieldLabel>Ημερομηνία:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><EditableField type="date" value={fd.date} onChange={v => set("date", v)} /></td>
                  <td className="pr-2 py-0.5"><FieldLabel className="text-red-700">Incident ID:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><FieldValue>{incident?.incident_id}</FieldValue></td>
                  <td className="pr-2 py-0.5"><FieldLabel className="text-red-700">WO ID:</FieldLabel></td>
                  <td className="py-0.5"><FieldValue>{workOrder?.work_order_id}</FieldValue></td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5"><FieldLabel>Asset ID:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><FieldValue>{asset?.asset_id}</FieldValue></td>
                  <td className="pr-2 py-0.5" colSpan={4}><FieldLabel>Τοποθεσία:</FieldLabel> <FieldValue className="min-w-[200px]">{asset?.location_address}</FieldValue></td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5"><FieldLabel>Ώρα Έναρξης:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><EditableField type="time" value={fd.time_start} onChange={v => set("time_start", v)} /></td>
                  <td className="pr-2 py-0.5"><FieldLabel>Τεχνικός:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><EditableField value={fd.technician} onChange={v => set("technician", v)} placeholder="Τεχνικός..." /></td>
                  <td colSpan={2}></td>
                </tr>
                <tr>
                  <td className="pr-2 py-0.5"><FieldLabel>Όχημα:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><EditableField value={fd.vehicle} onChange={v => set("vehicle", v)} placeholder="Αρ. κυκλοφορίας..." /></td>
                  <td className="pr-2 py-0.5"><FieldLabel>Ώρα Άφιξης:</FieldLabel></td>
                  <td className="pr-4 py-0.5"><EditableField type="time" value={fd.time_arrival} onChange={v => set("time_arrival", v)} /></td>
                  <td className="pr-2 py-0.5"><FieldLabel>Ώρα ολοκλ.:</FieldLabel></td>
                  <td className="py-0.5"><EditableField type="time" value={fd.time_end} onChange={v => set("time_end", v)} /></td>
                </tr>
              </tbody>
            </table>
          </PdfSection>

          {/* ── B. STOP & ASSESS ── */}
          <PdfSection title="B. STOP & ASSESS">
            <div className="space-y-1.5">
              <ChkBox checked={fd.check_360} onChange={v => set("check_360", v)} label="360° έλεγχος" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <FieldLabel>Κίνδυνος:</FieldLabel>
                <ChkBox checked={fd.danger_electrical} onChange={v => set("danger_electrical", v)} label="Ηλεκτρ." />
                <ChkBox checked={fd.danger_glass} onChange={v => set("danger_glass", v)} label="Γυαλί" />
                <ChkBox checked={fd.danger_structural} onChange={v => set("danger_structural", v)} label="Δομικό" />
                <ChkBox checked={fd.danger_pv} onChange={v => set("danger_pv", v)} label="PV/μπατ." />
                <ChkBox checked={fd.danger_other} onChange={v => set("danger_other", v)} label="Άλλο:" />
                {fd.danger_other && <EditableField value={fd.danger_other_text} onChange={v => set("danger_other_text", v)} placeholder="Περιγραφή..." className="w-40" />}
              </div>
              <div className="flex items-center gap-x-3 flex-wrap">
                <FieldLabel>Άμεσος κίνδυνος ζωής:</FieldLabel>
                <RadioOpt name="immediate_danger" value="yes" current={fd.immediate_danger} onChange={v => set("immediate_danger", v)} label={<span className={fd.immediate_danger === "yes" ? "text-red-700 font-bold" : ""}>Ναι → 112 / απομάκρυνση</span>} />
                <RadioOpt name="immediate_danger" value="no" current={fd.immediate_danger} onChange={v => set("immediate_danger", v)} label="Όχι" />
              </div>
              <div>
                <FieldLabel>Περιγραφή κινδύνου{isHighRisk && <span className="text-red-600 ml-0.5">*</span>}:</FieldLabel>
                <EditableTextarea value={fd.danger_description} onChange={v => set("danger_description", v)} placeholder="Περιγράψτε τον κίνδυνο..." rows={2} className="mt-0.5" />
              </div>
            </div>
          </PdfSection>

          {/* ── C. PPE & ΕΞΟΠΛΙΣΜΟΣ ── */}
          <PdfSection title="C. PPE & ΕΞΟΠΛΙΣΜΟΣ">
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5">
              <ChkBox checked={fd.ppe_vest} onChange={v => set("ppe_vest", v)} label="Γιλέκο" />
              <ChkBox checked={fd.ppe_helmet} onChange={v => set("ppe_helmet", v)} label="Κράνος" />
              <ChkBox checked={fd.ppe_gloves} onChange={v => set("ppe_gloves", v)} label="Γάντια" />
              <ChkBox checked={fd.ppe_glasses} onChange={v => set("ppe_glasses", v)} label="Γυαλιά" />
              <ChkBox checked={fd.ppe_shoes} onChange={v => set("ppe_shoes", v)} label="Υποδήματα" />
              <ChkBox checked={fd.ppe_mask} onChange={v => set("ppe_mask", v)} label="Μάσκα" />
              <ChkBox checked={fd.ppe_extinguisher} onChange={v => set("ppe_extinguisher", v)} label="Πυροσβεστήρας" />
              <ChkBox checked={fd.ppe_all} onChange={v => set("ppe_all", v)} label="Όλα τα παραπάνω" />
            </div>
            <div className="border-t border-gray-200 pt-1 flex flex-wrap gap-x-3 gap-y-1">
              <ChkBox checked={fd.eq_cones} onChange={v => set("eq_cones", v)} label="Κιτ σήμανσης/αποκλεισμού (Κώνοι/κορδέλες κλπ.)" />
              <ChkBox checked={fd.eq_loto_kit} onChange={v => set("eq_loto_kit", v)} label="LOTO kit (Lock/Tag)" />
              <ChkBox checked={fd.eq_all} onChange={v => set("eq_all", v)} label="Όλα τα παραπάνω" />
              <ChkBox checked={fd.eq_other} onChange={v => set("eq_other", v)} label="Άλλο:" />
              {fd.eq_other && <EditableField value={fd.eq_other_text} onChange={v => set("eq_other_text", v)} placeholder="Άλλος εξοπλισμός..." className="w-40" />}
            </div>
          </PdfSection>

          {/* ── D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ ── */}
          <PdfSection title="D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-1.5">
              <div className="space-y-1">
                <ChkBox checked={fd.tmp1} onChange={v => set("tmp1", v)} label="TMP-1 Ασφάλιση της περιμέτρου στάσης λεωφορείου με διατήρηση διέλευσης πεζών." />
                <ChkBox checked={fd.tmp2} onChange={v => set("tmp2", v)} label="TMP-2 Ασφάλιση της περιμέτρου στάσης λεωφορείου με εκτροπή πεζών." />
                <ChkBox checked={fd.tmp3} onChange={v => set("tmp3", v)} label="TMP-3 Προσωρινά καλύμματα πάνω από εκσκαφές για πλευρές που παραμένουν χωρίς επίβλεψη." />
                <ChkBox checked={fd.tmp4} onChange={v => set("tmp4", v)} label="TMP-4 Προσωρινές ξύλινες διαβάσεις πεζών (footway boards) πάνω από εκσκαφές." />
              </div>
              <div className="space-y-1">
                <ChkBox checked={fd.tmr1} onChange={v => set("tmr1", v)} label="TMR-1 Ασφάλιση της εσοχής στάσης λεωφορείου (bus stop bay)." />
                <ChkBox checked={fd.tmr2} onChange={v => set("tmr2", v)} label="TMR-2 Προσωρινή στάθμευση οχήματος εργασιών μπροστά από την περιοχή εργασιών." />
                <ChkBox checked={fd.tmr3} onChange={v => set("tmr3", v)} label="TMR-3 Ρύθμιση κυκλοφορίας με πινακίδες Stop/Go." />
                <ChkBox checked={fd.tmbs1} onChange={v => set("tmbs1", v)} label="TMBS-1 Προσωρινή στάση λεωφορείου." />
                <ChkBox checked={fd.tmbs2} onChange={v => set("tmbs2", v)} label="TMBS-2 Προσωρινά μη εξυπηρετούμενη στάση λεωφορείου." />
              </div>
            </div>
            <div className="border-t border-gray-200 pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <FieldLabel>Συντονισμός με:</FieldLabel>
              <ChkBox checked={fd.coord_police} onChange={v => set("coord_police", v)} label="Αστυνομία" />
              <ChkBox checked={fd.coord_municipality} onChange={v => set("coord_municipality", v)} label="Δήμος" />
              <ChkBox checked={fd.coord_other} onChange={v => set("coord_other", v)} label="Άλλο:" />
              {fd.coord_other && <EditableField value={fd.coord_other_text} onChange={v => set("coord_other_text", v)} placeholder="Άλλος..." className="w-40" />}
            </div>
          </PdfSection>

          {/* ── E. LOTO ── */}
          <PdfSection title={`E. LOTO (όπου εφαρμόζεται)${hasLoto ? " ⚡" : ""}`}>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <FieldLabel>Πηγές:</FieldLabel>
                <ChkBox checked={fd.loto_ac} onChange={v => set("loto_ac", v)} label="AC" />
                <ChkBox checked={fd.loto_pv} onChange={v => set("loto_pv", v)} label="PV DC" />
                <ChkBox checked={fd.loto_battery} onChange={v => set("loto_battery", v)} label="Μπαταρία" />
                <ChkBox checked={fd.loto_other} onChange={v => set("loto_other", v)} label="Άλλο:" />
                {fd.loto_other && <EditableField value={fd.loto_other_text} onChange={v => set("loto_other_text", v)} placeholder="Άλλη πηγή..." className="w-32" />}
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <ChkBox checked={fd.loto_isolation} onChange={v => set("loto_isolation", v)} label="Απομόνωση / απενεργοποίηση." />
                <div className="flex items-center gap-1.5">
                  <ChkBox checked={fd.loto_lock_tag} onChange={v => set("loto_lock_tag", v)} label="Lock + Tag (όνομα/ώρα):" />
                  {fd.loto_lock_tag && <EditableField value={fd.loto_lock_tag_name} onChange={v => set("loto_lock_tag_name", v)} placeholder="Όνομα/Ώρα..." className="w-32" />}
                </div>
              </div>
              <ChkBox checked={fd.loto_confirm} onChange={v => set("loto_confirm", v)} label="Επιβεβαίωση ασφαλούς κατάστασης (όπου δυνατό)." />
              <div>
                <FieldLabel>Παρατηρήσεις:</FieldLabel>
                <EditableTextarea value={fd.loto_notes} onChange={v => set("loto_notes", v)} placeholder="Παρατηρήσεις LOTO..." rows={2} className="mt-0.5" />
              </div>
            </div>
          </PdfSection>

          {/* ── F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE ── */}
          <PdfSection title="F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE">
            <div className="grid grid-cols-2 gap-x-4 text-xs">
              <div className="space-y-2">
                <div>
                  <p className="font-bold text-xs mb-0.5">F1 Ηλεκτρ.:</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-2">
                    <ChkBox checked={fd.f1_cover} onChange={v => set("f1_cover", v)} label="Κάλυψη/απομόνωση" />
                    <ChkBox checked={fd.f1_panel_lock} onChange={v => set("f1_panel_lock", v)} label="Κλείδωμα πίνακα / αποτροπή πρόσβασης" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-xs mb-0.5">F2 Γυαλί:</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-2">
                    <ChkBox checked={fd.f2_collect} onChange={v => set("f2_collect", v)} label="Συλλογή" />
                    <ChkBox checked={fd.f2_stabilize} onChange={v => set("f2_stabilize", v)} label="Σταθεροποίηση/αφαίρεση" />
                    <ChkBox checked={fd.f2_cover} onChange={v => set("f2_cover", v)} label="Κάλυψη + αποκλεισμός" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-xs mb-0.5">F3 Δομικό:</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-2">
                    <ChkBox checked={fd.f3_stabilize} onChange={v => set("f3_stabilize", v)} label="Σταθεροποίηση" />
                    <ChkBox checked={fd.f3_remove} onChange={v => set("f3_remove", v)} label="Αφαίρεση χαλαρών μερών" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="font-bold text-xs mb-0.5">F4 PV/Μπατ.:</p>
                  <div className="pl-2 space-y-0.5">
                    <ChkBox checked={fd.f4_isolate} onChange={v => set("f4_isolate", v)} label="Απομόνωση" />
                    <div className="flex items-center gap-x-3">
                      <span className="text-xs text-gray-700">Θερμικό/οσμές/φούσκωμα:</span>
                      <RadioOpt name="f4_thermal" value="yes" current={fd.f4_thermal} onChange={v => set("f4_thermal", v)} label={<span className={fd.f4_thermal === "yes" ? "text-red-700 font-bold" : ""}>Ναι</span>} />
                      <RadioOpt name="f4_thermal" value="no" current={fd.f4_thermal} onChange={v => set("f4_thermal", v)} label="Όχι" />
                    </div>
                    {fd.f4_thermal === "yes" && (
                      <div className="ml-2 border border-red-300 bg-red-50 rounded p-1">
                        <ChkBox checked={fd.f4_evacuate} onChange={v => set("f4_evacuate", v)} label="Απομάκρυνση κοινού + ενημέρωση Help Desk/Maintenance Supervisor" />
                      </div>
                    )}
                    <ChkBox checked={fd.f4_full_removal} onChange={v => set("f4_full_removal", v)} label="Ολική αφαίρεση Στάσης" />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-1 mt-1">
              <FieldLabel>F5 Άλλο:</FieldLabel>
              <EditableTextarea value={fd.f5_other} onChange={v => set("f5_other", v)} placeholder="Άλλες ενέργειες Make-Safe..." rows={2} className="mt-0.5" />
            </div>
          </PdfSection>

          {/* ── G. ΕΙΔΙΚΟ ΟΧΗΜΑ ── */}
          <PdfSection title="G. ΕΙΔΙΚΟ ΟΧΗΜΑ / ΕΞΟΠΛΙΣΜΟΣ (αν απαιτήθηκε)">
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mb-1">
              <RadioOpt name="special_vehicle" value="no" current={fd.vehicle_none ? "no" : fd.vehicle_yes ? "yes" : ""}
                onChange={() => { set("vehicle_none", true); set("vehicle_yes", false); }} label="Όχι" />
              <RadioOpt name="special_vehicle" value="yes" current={fd.vehicle_none ? "no" : fd.vehicle_yes ? "yes" : ""}
                onChange={() => { set("vehicle_yes", true); set("vehicle_none", false); }} label="Ναι" />
              {fd.vehicle_yes && (
                <>
                  <FieldLabel>Τύπος:</FieldLabel>
                  <ChkBox checked={fd.veh_cherry} onChange={v => set("veh_cherry", v)} label="Cherry picker" />
                  <ChkBox checked={fd.veh_crane} onChange={v => set("veh_crane", v)} label="Crane" />
                  <ChkBox checked={fd.veh_other} onChange={v => set("veh_other", v)} label="Άλλο:" />
                  {fd.veh_other && <EditableField value={fd.veh_other_text} onChange={v => set("veh_other_text", v)} placeholder="Άλλο..." className="w-32" />}
                </>
              )}
            </div>
            {fd.vehicle_yes && (
              <div>
                <FieldLabel>Αιτιολόγηση:</FieldLabel>
                <EditableTextarea value={fd.veh_justification} onChange={v => set("veh_justification", v)} placeholder="Αιτιολόγηση χρήσης..." rows={2} className="mt-0.5" />
              </div>
            )}
          </PdfSection>

          {/* ── H. Εκκρεμότητες ── */}
          <PdfSection title="H. Εκκρεμότητες / Corrective">
            <FieldLabel>Εκκρεμότητες / Απαιτούμενες διορθωτικές ενέργειες:</FieldLabel>
            <EditableTextarea value={fd.pending_corrective} onChange={v => set("pending_corrective", v)} placeholder="Εκκρεμότητες..." rows={3} className="mt-0.5" />
          </PdfSection>

          {/* ── I. ΤΕΚΜΗΡΙΩΣΗ ── */}
          <PdfSection title="I. ΤΕΚΜΗΡΙΩΣΗ & WM / ΚΛΙΜΑΚΩΣΗ">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <ChkBox checked={fd.doc_photo_before} onChange={v => set("doc_photo_before", v)} label="Φωτο ΠΡΙΝ" />
                <ChkBox checked={fd.doc_photo_after} onChange={v => set("doc_photo_after", v)} label="Φωτο ΜΕΤΑ (με σήμανση)" />
                <ChkBox checked={fd.doc_wm} onChange={v => set("doc_wm", v)} label="Καταχώρηση ενεργειών στο WM" />
              </div>
              <div className="flex items-center gap-1.5">
                <ChkBox checked={fd.doc_materials} onChange={v => set("doc_materials", v)} label="Υλικά προσωρινής ασφάλειας:" />
                {fd.doc_materials && <EditableField value={fd.doc_materials_text} onChange={v => set("doc_materials_text", v)} placeholder="Περιγράψτε υλικά..." className="w-48" />}
              </div>
              <div className={`flex items-center gap-2 px-2 py-1 rounded border-2 w-fit ${fd.doc_make_safe_completed ? "border-emerald-400 bg-emerald-50" : "border-gray-300"}`}>
                <ChkBox checked={fd.doc_make_safe_completed} onChange={v => set("doc_make_safe_completed", v)} />
                <span className={`text-xs font-bold ${fd.doc_make_safe_completed ? "text-emerald-700" : "text-gray-600"}`}>
                  Make Safe WO COMPLETED (Make-Safe)
                </span>
                {fd.doc_make_safe_completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div>
                <FieldLabel>Ενημέρωση HD/IM – Σχόλια:</FieldLabel>
                <EditableTextarea value={fd.doc_hd_comments} onChange={v => set("doc_hd_comments", v)} placeholder="Σχόλια προς HD/IM..." rows={2} className="mt-0.5" />
              </div>
              <div className="border-t border-gray-200 pt-2 grid grid-cols-2 gap-4">
                <FileUploadArea label="Φωτο ΠΡΙΝ" files={fd.photos_before} onChange={v => set("photos_before", v)} accept="image/*" />
                <FileUploadArea label="Φωτο ΜΕΤΑ (με σήμανση)" files={fd.photos_after} onChange={v => set("photos_after", v)} required={fd.doc_photo_after} accept="image/*" />
              </div>
            </div>
          </PdfSection>

          {/* ── K. ΥΠΟΓΡΑΦΕΣ ── */}
          <PdfSection title="K. ΥΠΟΓΡΑΦΕΣ">
            <div className="grid grid-cols-2 gap-6 mb-2">
              {/* Τεχνικός */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-700 uppercase">Τεχνικός</p>
                <div className="flex items-center gap-2">
                  <FieldLabel>Ονοματεπώνυμο:</FieldLabel>
                  <EditableField value={fd.sig_tech} onChange={v => set("sig_tech", v)} placeholder="Τεχνικός..." className="flex-1 min-w-0" />
                </div>
                <div>
                  <FieldLabel>Υπογρ.:</FieldLabel>
                  {fd.sig_tech_upload ? (
                    <div className="relative inline-block group ml-2">
                      <img src={fd.sig_tech_upload.url} alt="Υπογραφή" className="h-12 border border-gray-300 rounded object-contain bg-white px-1" />
                      <button type="button" onClick={() => set("sig_tech_upload", null)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="ml-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-6 px-2"
                        onClick={() => sigTechRef.current?.click()}>
                        <Upload className="w-3 h-3" /> Μεταφόρτωση
                      </Button>
                      <input ref={sigTechRef} type="file" accept="image/*" className="hidden"
                        onChange={e => handleSigUpload(e, "sig_tech_upload")} />
                    </span>
                  )}
                </div>
              </div>
              {/* HD */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-700 uppercase">HD / Maintenance Supervisor</p>
                <div className="flex items-center gap-2">
                  <FieldLabel>Ονοματεπώνυμο:</FieldLabel>
                  <EditableField value={fd.sig_hd} onChange={v => set("sig_hd", v)} placeholder="HD / Supervisor..." className="flex-1 min-w-0" />
                </div>
                <div>
                  <FieldLabel>Υπογρ.:</FieldLabel>
                  {fd.sig_hd_upload ? (
                    <div className="relative inline-block group ml-2">
                      <img src={fd.sig_hd_upload.url} alt="Υπογραφή" className="h-12 border border-gray-300 rounded object-contain bg-white px-1" />
                      <button type="button" onClick={() => set("sig_hd_upload", null)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="ml-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1 text-xs h-6 px-2"
                        onClick={() => sigHdRef.current?.click()}>
                        <Upload className="w-3 h-3" /> Μεταφόρτωση
                      </Button>
                      <input ref={sigHdRef} type="file" accept="image/*" className="hidden"
                        onChange={e => handleSigUpload(e, "sig_hd_upload")} />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-1.5 flex items-center gap-2">
              <FieldLabel>Ημ/νία:</FieldLabel>
              <EditableField type="date" value={fd.sig_date} onChange={v => set("sig_date", v)} />
            </div>
          </PdfSection>

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pt-3 pb-2">
            <Button variant="outline" onClick={onClose} className="text-xs h-8">Άκυρο</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={printingPDF} className="gap-1.5 text-xs h-8">
              <Printer className="w-3.5 h-3.5" /> {printingPDF ? "..." : "PDF / Εκτύπωση"}
            </Button>
            <Button variant="outline" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending} className="gap-1.5 text-xs h-8">
              <Save className="w-3.5 h-3.5" /> Αποθήκευση Draft
            </Button>
            <Button onClick={() => handleSave("Submitted")} disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 text-xs h-8">
              <Send className="w-3.5 h-3.5" /> Υποβολή Φόρμας
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}