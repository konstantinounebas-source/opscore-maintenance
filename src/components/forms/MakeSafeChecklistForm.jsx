import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Save, Send, Lock, AlertTriangle, CheckCircle2,
  Upload, X, ShieldAlert, ZapOff, Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// ── Reusable primitives ───────────────────────────────────────────────────────

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2 min-h-[36px] px-3 py-2 rounded-md bg-slate-50 border border-slate-200 text-sm text-slate-700">
        <Lock className="w-3 h-3 text-slate-300 flex-shrink-0" />
        <span className="flex-1">{value || <span className="text-slate-300 italic">—</span>}</span>
      </div>
    </div>
  );
}

function Section({ id, title, accent, children }) {
  return (
    <div id={id} className={`bg-white rounded-xl border ${accent || "border-slate-200"} overflow-hidden`}>
      <div className={`px-5 py-3.5 border-b ${accent ? "border-inherit bg-slate-50/60" : "border-slate-100 bg-slate-50/30"}`}>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function CbRow({ label, checked, onChange, className }) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer group ${className || ""}`}>
      <Checkbox
        checked={!!checked}
        onCheckedChange={v => onChange(!!v)}
        className="mt-0.5 w-5 h-5 flex-shrink-0"
      />
      <span className="text-sm text-slate-700 leading-snug group-hover:text-slate-900">{label}</span>
    </label>
  );
}

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

  const remove = (idx) => { const c = [...files]; c.splice(idx, 1); onChange(c); };

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
              <button type="button" onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Default state factory ─────────────────────────────────────────────────────
const defaultData = () => ({
  // A
  date: "",
  time_start: "",
  technician: "",
  vehicle: "",
  time_arrival: "",
  time_end: "",
  // B
  check_360: false,
  danger_electrical: false,
  danger_glass: false,
  danger_structural: false,
  danger_pv: false,
  danger_other: false,
  danger_other_text: "",
  immediate_danger: "",   // "yes" | "no"
  danger_description: "",
  // C
  ppe_vest: false, ppe_helmet: false, ppe_gloves: false, ppe_glasses: false,
  ppe_shoes: false, ppe_mask: false, ppe_extinguisher: false, ppe_all: false,
  eq_cones: false, eq_loto_kit: false, eq_all: false,
  eq_other: false, eq_other_text: "",
  // D
  tmp1: false, tmp2: false, tmp3: false, tmp4: false,
  tmr1: false, tmr2: false, tmr3: false,
  tmbs1: false, tmbs2: false,
  coord_police: false, coord_municipality: false, coord_other: false, coord_other_text: "",
  // E
  loto_ac: false, loto_pv: false, loto_battery: false, loto_other: false, loto_other_text: "",
  loto_isolation: false,
  loto_lock_tag: false, loto_lock_tag_name: "",
  loto_confirm: false,
  loto_notes: "",
  // F
  f1_cover: false, f1_panel_lock: false,
  f2_collect: false, f2_stabilize: false, f2_cover: false,
  f3_stabilize: false, f3_remove: false,
  f4_isolate: false, f4_thermal: "",   // "yes" | "no"
  f4_evacuate: false,
  f4_full_removal: false,
  f5_other: "",
  // G
  vehicle_none: false, vehicle_yes: false,
  veh_cherry: false, veh_crane: false, veh_other: false, veh_other_text: "",
  veh_justification: "",
  // H
  pending_corrective: "",
  // I
  doc_photo_before: false, doc_photo_after: false, doc_wm: false,
  doc_materials: false, doc_materials_text: "",
  doc_make_safe_completed: false,
  doc_hd_comments: "",
  // K
  sig_tech: "", sig_tech_upload: null,
  sig_hd: "", sig_hd_upload: null,
  sig_date: "",
  // photos
  photos_before: [],
  photos_after: [],
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function MakeSafeChecklistForm({ submission, incidents, assets, workOrders, onClose, defaultIncidentId }) {
  const { toast } = useToast();
  const isEditing = !!submission;

  const [linkedIncidentId, setLinkedIncidentId] = useState(submission?.incident_id || defaultIncidentId || "");
  const [linkedWOId, setLinkedWOId]             = useState(submission?.work_order_id || "");
  const [linkedAssetId, setLinkedAssetId]       = useState(submission?.asset_id || "");

  const [fd, setFd] = useState(() => ({
    ...defaultData(),
    ...(submission?.form_data || {}),
  }));

  const incident = useMemo(() => incidents.find(i => i.id === linkedIncidentId), [incidents, linkedIncidentId]);
  const workOrder = useMemo(() => workOrders.find(w => w.id === linkedWOId), [workOrders, linkedWOId]);
  const asset = useMemo(() => assets.find(a => a.id === linkedAssetId), [assets, linkedAssetId]);

  // Auto-fill asset from incident or WO
  useEffect(() => {
    if (!linkedAssetId) {
      const src = incident?.related_asset_id || workOrder?.related_asset_id;
      if (src) setLinkedAssetId(src);
    }
  }, [incident, workOrder]);

  // Auto-fill WO from incident
  useEffect(() => {
    if (!linkedWOId && incident?.work_order_reference) {
      const wo = workOrders.find(w => w.work_order_id === incident.work_order_reference);
      if (wo) setLinkedWOId(wo.id);
    }
  }, [incident]);

  const set = (key, val) => setFd(prev => ({ ...prev, [key]: val }));

  const sigTechRef = useRef();
  const sigHdRef   = useRef();

  const handleSigUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set(field, { name: file.name, url: file_url });
  };

  // ── Visual indicators ──────────────────────────────────────────────────────
  const isHighRisk = fd.immediate_danger === "yes";
  const hasLoto    = fd.loto_ac || fd.loto_pv || fd.loto_battery || fd.loto_other;
  const isCompleted = fd.doc_make_safe_completed;
  const photosAfterMissing = fd.doc_photo_after && fd.photos_after.length === 0;

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = isEditing
        ? await base44.entities.FormSubmissions.update(submission.id, data)
        : await base44.entities.FormSubmissions.create(data);
      
      // Mirror all uploaded photos/files to IncidentAttachments so they appear in the Documents tab
      const incId = data.incident_id;
      if (incId) {
        const allPhotos = [
          ...(data.form_data?.photos_before || []),
          ...(data.form_data?.photos_after || []),
        ];
        for (const f of allPhotos) {
          if (f?.url) {
            await base44.entities.IncidentAttachments.create({
              incident_id: incId,
              file_url: f.url,
              file_name: f.name || f.url.split("/").pop(),
              file_type: "Photo",
              uploaded_by: null,
            });
          }
        }
        // Also mirror signature uploads
        const sigs = [data.form_data?.sig_tech_upload, data.form_data?.sig_hd_upload].filter(Boolean);
        for (const s of sigs) {
          if (s?.url) {
            await base44.entities.IncidentAttachments.create({
              incident_id: incId,
              file_url: s.url,
              file_name: s.name || "Signature",
              file_type: "Document",
              uploaded_by: null,
            });
          }
        }
      }
      
      // Log to audit trail if submitted
      if (data.status === "Submitted") {
        const user = await base44.auth.me();
        const timestamp = getAthensTimestamp();
        await base44.entities.IncidentAuditTrail.create({
          incident_id: incId,
          action: "Form Submitted",
          details: `${data.form_name} submitted`,
          user: user?.email,
          attachment_metadata: [{
            url: result?.id ? `form:${result.id}:${data.form_type}` : "",
            name: `${data.form_name} (Submitted)`,
            author: user?.email,
            author_name: user?.full_name,
            created_at: timestamp,
          }],
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
    if (!fd.date)       { toast({ title: "Απαιτείται Ημερομηνία", variant: "destructive" }); return; }
    if (!fd.time_start) { toast({ title: "Απαιτείται Ώρα Έναρξης", variant: "destructive" }); return; }
    const hasRisk = fd.check_360 || fd.danger_electrical || fd.danger_glass || fd.danger_structural || fd.danger_pv || fd.danger_other;
    if (!hasRisk && status === "Submitted") {
      toast({ title: "Απαιτείται τουλάχιστον μια επιλογή στο STOP & ASSESS", variant: "destructive" }); return;
    }
    if (isHighRisk && !fd.danger_description) {
      toast({ title: "Απαιτείται Περιγραφή Κινδύνου (Άμεσος κίνδυνος ζωής)", variant: "destructive" }); return;
    }
    if (fd.vehicle_yes && !fd.veh_justification) {
      toast({ title: "Απαιτείται Αιτιολόγηση για Ειδικό Όχημα", variant: "destructive" }); return;
    }
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
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="MAKE-SAFE CHECKLIST ΠΕΔΙΟΥ"
        subtitle="Smart Bus Shelters – Άμεση ασφάλιση χώρου/κινδύνου (Make-Safe)"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Πίσω
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSave("Draft")} disabled={saveMutation.isPending} className="gap-1.5 text-xs">
              <Save className="w-3.5 h-3.5" /> Draft
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

          {/* ── Visual Indicators bar ── */}
          <div className="flex flex-wrap gap-2">
            {isHighRisk && (
              <div className="flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 shadow font-bold text-sm animate-pulse">
                <ShieldAlert className="w-5 h-5" />
                ΑΜΕΣΟΣ ΚΙΝΔΥΝΟΣ ΖΩΗΣ – ΚΑΛΕΣΤΕ 112 / ΑΠΟΜΑΚΡΥΝΣΗ
              </div>
            )}
            {hasLoto && (
              <div className="flex items-center gap-2 bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                <ZapOff className="w-4 h-4" /> LOTO – Ηλεκτρική Απομόνωση Ενεργή
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" /> MAKE SAFE ΟΛΟΚΛΗΡΩΘΗΚΕ
              </div>
            )}
            {photosAfterMissing && (
              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" /> Απαιτούνται φωτογραφίες ΜΕΤΑ
              </div>
            )}
          </div>

          {/* ── Linked records ── */}
          <div className="bg-white rounded-xl border border-indigo-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Info className="w-4 h-4" /> Σύνδεση Εγγραφών
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Incident</Label>
                <Select value={linkedIncidentId || "_none"} onValueChange={v => setLinkedIncidentId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή Incident..." /></SelectTrigger>
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
                <Label className="text-xs font-medium text-slate-600">Work Order</Label>
                <Select value={linkedWOId || "_none"} onValueChange={v => setLinkedWOId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή WO..." /></SelectTrigger>
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
              <div>
                <Label className="text-xs font-medium text-slate-600">Asset / Στάση</Label>
                <Select value={linkedAssetId || "_none"} onValueChange={v => setLinkedAssetId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή Asset..." /></SelectTrigger>
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

          {/* ══════════════════════════════════════════════════════════════════
              A. ΣΤΟΙΧΕΙΑ
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="A. ΣΤΟΙΧΕΙΑ">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Date – manual */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ημερομηνία *</Label>
                <Input type="date" value={fd.date} onChange={e => set("date", e.target.value)} className="text-sm" />
              </div>
              {/* Auto-fill readonly fields */}
              <ReadOnlyField label="Incident ID" value={incident?.incident_id} />
              <ReadOnlyField label="WO ID" value={workOrder?.work_order_id} />
              <ReadOnlyField label="Asset ID" value={asset?.asset_id} />
              <div className="col-span-2 md:col-span-2">
                <ReadOnlyField label="Τοποθεσία" value={asset?.location_address} />
              </div>
              {/* Manual fields */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ώρα Έναρξης *</Label>
                <Input type="time" value={fd.time_start} onChange={e => set("time_start", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Τεχνικός</Label>
                <Input value={fd.technician} onChange={e => set("technician", e.target.value)} placeholder="Τεχνικός..." className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Όχημα</Label>
                <Input value={fd.vehicle} onChange={e => set("vehicle", e.target.value)} placeholder="Αρ. κυκλοφορίας..." className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ώρα Άφιξης</Label>
                <Input type="time" value={fd.time_arrival} onChange={e => set("time_arrival", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ώρα ολοκλ.</Label>
                <Input type="time" value={fd.time_end} onChange={e => set("time_end", e.target.value)} className="text-sm" />
              </div>
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              B. STOP & ASSESS
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="B. STOP & ASSESS">
            <CbRow label="360° έλεγχος" checked={fd.check_360} onChange={v => set("check_360", v)} />

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Κίνδυνος:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <CbRow label="Ηλεκτρ."   checked={fd.danger_electrical} onChange={v => set("danger_electrical", v)} />
                <CbRow label="Γυαλί"     checked={fd.danger_glass}      onChange={v => set("danger_glass", v)} />
                <CbRow label="Δομικό"    checked={fd.danger_structural}  onChange={v => set("danger_structural", v)} />
                <CbRow label="PV/μπατ."  checked={fd.danger_pv}         onChange={v => set("danger_pv", v)} />
                <CbRow label="Άλλο"      checked={fd.danger_other}      onChange={v => set("danger_other", v)} />
              </div>
              {fd.danger_other && (
                <Input value={fd.danger_other_text} onChange={e => set("danger_other_text", e.target.value)}
                  placeholder="Περιγράψτε άλλο κίνδυνο..." className="text-sm mt-1" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Άμεσος κίνδυνος ζωής:</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="immediate_danger" value="yes"
                    checked={fd.immediate_danger === "yes"}
                    onChange={() => set("immediate_danger", "yes")}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className={`text-sm font-medium ${fd.immediate_danger === "yes" ? "text-red-700 font-bold" : "text-slate-700"}`}>
                    Ναι → 112 / απομάκρυνση
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="immediate_danger" value="no"
                    checked={fd.immediate_danger === "no"}
                    onChange={() => set("immediate_danger", "no")}
                    className="w-4 h-4 accent-slate-600"
                  />
                  <span className="text-sm text-slate-700">Όχι</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Περιγραφή κινδύνου {isHighRisk && <span className="text-red-600">*</span>}
              </Label>
              <Textarea
                value={fd.danger_description}
                onChange={e => set("danger_description", e.target.value)}
                placeholder="Περιγράψτε τον κίνδυνο..."
                rows={3} className="text-sm"
              />
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              C. PPE & ΕΞΟΠΛΙΣΜΟΣ
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="C. PPE & ΕΞΟΠΛΙΣΜΟΣ">
            <div>
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">PPE:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <CbRow label="Γιλέκο"       checked={fd.ppe_vest}         onChange={v => set("ppe_vest", v)} />
                <CbRow label="Κράνος"        checked={fd.ppe_helmet}       onChange={v => set("ppe_helmet", v)} />
                <CbRow label="Γάντια"        checked={fd.ppe_gloves}       onChange={v => set("ppe_gloves", v)} />
                <CbRow label="Γυαλιά"        checked={fd.ppe_glasses}      onChange={v => set("ppe_glasses", v)} />
                <CbRow label="Υποδήματα"     checked={fd.ppe_shoes}        onChange={v => set("ppe_shoes", v)} />
                <CbRow label="Μάσκα"         checked={fd.ppe_mask}         onChange={v => set("ppe_mask", v)} />
                <CbRow label="Πυροσβεστήρας" checked={fd.ppe_extinguisher} onChange={v => set("ppe_extinguisher", v)} />
                <CbRow label="Όλα τα παραπάνω" checked={fd.ppe_all}        onChange={v => set("ppe_all", v)} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">Εξοπλισμός:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CbRow label="Κιτ σήμανσης/αποκλεισμού (Κώνοι/κορδέλες κλπ.)" checked={fd.eq_cones}    onChange={v => set("eq_cones", v)} />
                <CbRow label="LOTO kit (Lock/Tag)"                               checked={fd.eq_loto_kit} onChange={v => set("eq_loto_kit", v)} />
                <CbRow label="Όλα τα παραπάνω"                                   checked={fd.eq_all}      onChange={v => set("eq_all", v)} />
                <CbRow label="Άλλο"                                               checked={fd.eq_other}    onChange={v => set("eq_other", v)} />
              </div>
              {fd.eq_other && (
                <Input value={fd.eq_other_text} onChange={e => set("eq_other_text", e.target.value)}
                  placeholder="Άλλος εξοπλισμός..." className="text-sm mt-2" />
              )}
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="D. ΑΣΦΑΛΙΣΗ ΠΕΡΙΟΧΗΣ">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT */}
              <div className="space-y-3">
                <CbRow label="TMP-1 Ασφάλιση της περιμέτρου στάσης λεωφορείου με διατήρηση διέλευσης πεζών." checked={fd.tmp1} onChange={v => set("tmp1", v)} />
                <CbRow label="TMP-2 Ασφάλιση της περιμέτρου στάσης λεωφορείου με εκτροπή πεζών." checked={fd.tmp2} onChange={v => set("tmp2", v)} />
                <CbRow label="TMP-3 Προσωρινά καλύμματα πάνω από εκσκαφές για πλευρές που παραμένουν χωρίς επίβλεψη." checked={fd.tmp3} onChange={v => set("tmp3", v)} />
                <CbRow label="TMP-4 Προσωρινές ξύλινες διαβάσεις πεζών (footway boards) πάνω από εκσκαφές για πλευρές που παραμένουν χωρίς επίβλεψη." checked={fd.tmp4} onChange={v => set("tmp4", v)} />
              </div>
              {/* RIGHT */}
              <div className="space-y-3">
                <CbRow label="TMR-1 Ασφάλιση της εσοχής στάσης λεωφορείου (bus stop bay)." checked={fd.tmr1} onChange={v => set("tmr1", v)} />
                <CbRow label="TMR-2 Προσωρινή στάθμευση οχήματος εργασιών μπροστά από την περιοχή εργασιών." checked={fd.tmr2} onChange={v => set("tmr2", v)} />
                <CbRow label="TMR-3 Ρύθμιση κυκλοφορίας με πινακίδες Stop/Go." checked={fd.tmr3} onChange={v => set("tmr3", v)} />
                <CbRow label="TMBS-1 Προσωρινή στάση λεωφορείου." checked={fd.tmbs1} onChange={v => set("tmbs1", v)} />
                <CbRow label="TMBS-2 Προσωρινά μη εξυπηρετούμενη στάση λεωφορείου." checked={fd.tmbs2} onChange={v => set("tmbs2", v)} />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Συντονισμός με:</Label>
              <div className="flex flex-wrap gap-6">
                <CbRow label="Αστυνομία"  checked={fd.coord_police}       onChange={v => set("coord_police", v)} />
                <CbRow label="Δήμος"      checked={fd.coord_municipality} onChange={v => set("coord_municipality", v)} />
                <CbRow label="Άλλο"       checked={fd.coord_other}        onChange={v => set("coord_other", v)} />
              </div>
              {fd.coord_other && (
                <Input value={fd.coord_other_text} onChange={e => set("coord_other_text", e.target.value)}
                  placeholder="Άλλος συντονισμός..." className="text-sm" />
              )}
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              E. LOTO
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="E. LOTO (όπου εφαρμόζεται)" accent={hasLoto ? "border-amber-300" : undefined}>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Πηγές:</Label>
              <div className="flex flex-wrap gap-6">
                <CbRow label="AC"         checked={fd.loto_ac}      onChange={v => set("loto_ac", v)} />
                <CbRow label="PV DC"      checked={fd.loto_pv}      onChange={v => set("loto_pv", v)} />
                <CbRow label="Μπαταρία"   checked={fd.loto_battery} onChange={v => set("loto_battery", v)} />
                <CbRow label="Άλλο"       checked={fd.loto_other}   onChange={v => set("loto_other", v)} />
              </div>
              {fd.loto_other && (
                <Input value={fd.loto_other_text} onChange={e => set("loto_other_text", e.target.value)}
                  placeholder="Άλλη πηγή..." className="text-sm" />
              )}
            </div>

            <CbRow label="Απομόνωση / απενεργοποίηση" checked={fd.loto_isolation} onChange={v => set("loto_isolation", v)} />

            <div className="flex items-start gap-3">
              <Checkbox checked={!!fd.loto_lock_tag} onCheckedChange={v => set("loto_lock_tag", !!v)} className="mt-1 w-5 h-5" />
              <div className="flex-1 space-y-1">
                <span className="text-sm text-slate-700">Lock + Tag (όνομα/ώρα):</span>
                {fd.loto_lock_tag && (
                  <Input value={fd.loto_lock_tag_name} onChange={e => set("loto_lock_tag_name", e.target.value)}
                    placeholder="Όνομα / Ώρα..." className="text-sm" />
                )}
              </div>
            </div>

            <CbRow label="Επιβεβαίωση ασφαλούς κατάστασης (όπου δυνατό)" checked={fd.loto_confirm} onChange={v => set("loto_confirm", v)} />

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Παρατηρήσεις:</Label>
              <Textarea value={fd.loto_notes} onChange={e => set("loto_notes", e.target.value)}
                placeholder="Παρατηρήσεις LOTO..." rows={3} className="text-sm" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="F. ΕΝΕΡΓΕΙΕΣ MAKE-SAFE">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">F1 Ηλεκτρ.:</p>
                  <CbRow label="Κάλυψη/απομόνωση"            checked={fd.f1_cover}      onChange={v => set("f1_cover", v)} />
                  <CbRow label="Κλείδωμα πίνακα / αποτροπή πρόσβασης" checked={fd.f1_panel_lock} onChange={v => set("f1_panel_lock", v)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">F2 Γυαλί:</p>
                  <CbRow label="Συλλογή"              checked={fd.f2_collect}   onChange={v => set("f2_collect", v)} />
                  <CbRow label="Σταθεροποίηση/αφαίρεση" checked={fd.f2_stabilize} onChange={v => set("f2_stabilize", v)} />
                  <CbRow label="Κάλυψη + αποκλεισμός"  checked={fd.f2_cover}    onChange={v => set("f2_cover", v)} />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">F3 Δομικό:</p>
                  <CbRow label="Σταθεροποίηση"           checked={fd.f3_stabilize} onChange={v => set("f3_stabilize", v)} />
                  <CbRow label="Αφαίρεση χαλαρών μερών"  checked={fd.f3_remove}   onChange={v => set("f3_remove", v)} />
                </div>
              </div>

              {/* RIGHT */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">F4 PV/Μπατ.:</p>
                  <CbRow label="Απομόνωση" checked={fd.f4_isolate} onChange={v => set("f4_isolate", v)} />
                  <div className="space-y-1 pl-1">
                    <span className="text-xs font-medium text-slate-600">Θερμικό/οσμές/φούσκωμα:</span>
                    <div className="flex gap-6 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="f4_thermal" value="yes"
                          checked={fd.f4_thermal === "yes"}
                          onChange={() => set("f4_thermal", "yes")}
                          className="w-4 h-4 accent-red-600" />
                        <span className={`text-sm ${fd.f4_thermal === "yes" ? "text-red-700 font-bold" : "text-slate-700"}`}>Ναι</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="f4_thermal" value="no"
                          checked={fd.f4_thermal === "no"}
                          onChange={() => set("f4_thermal", "no")}
                          className="w-4 h-4" />
                        <span className="text-sm text-slate-700">Όχι</span>
                      </label>
                    </div>
                  </div>
                  {fd.f4_thermal === "yes" && (
                    <div className="ml-2 p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                      <p className="text-xs font-semibold text-red-700">Αν ΝΑΙ:</p>
                      <CbRow label="Απομάκρυνση κοινού + ενημέρωση Help Desk/Maintenance Supervisor"
                        checked={fd.f4_evacuate} onChange={v => set("f4_evacuate", v)} />
                    </div>
                  )}
                </div>

                <CbRow label="Ολική αφαίρεση Στάσης" checked={fd.f4_full_removal} onChange={v => set("f4_full_removal", v)} />
              </div>
            </div>

            {/* BOTTOM */}
            <div className="border-t border-slate-100 pt-4 space-y-1">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">F5 Άλλο:</Label>
              <Textarea value={fd.f5_other} onChange={e => set("f5_other", e.target.value)}
                placeholder="Άλλες ενέργειες Make-Safe..." rows={3} className="text-sm" />
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              G. ΕΙΔΙΚΟ ΟΧΗΜΑ / ΕΞΟΠΛΙΣΜΟΣ
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="G. ΕΙΔΙΚΟ ΟΧΗΜΑ / ΕΞΟΠΛΙΣΜΟΣ (αν απαιτήθηκε)">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="special_vehicle" value="no"
                  checked={fd.vehicle_none}
                  onChange={() => { set("vehicle_none", true); set("vehicle_yes", false); }}
                  className="w-4 h-4" />
                <span className="text-sm text-slate-700">Όχι</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="special_vehicle" value="yes"
                  checked={fd.vehicle_yes}
                  onChange={() => { set("vehicle_yes", true); set("vehicle_none", false); }}
                  className="w-4 h-4" />
                <span className="text-sm text-slate-700">Ναι</span>
              </label>
            </div>

            {fd.vehicle_yes && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-6">
                  <CbRow label="Cherry picker" checked={fd.veh_cherry} onChange={v => set("veh_cherry", v)} />
                  <CbRow label="Crane"         checked={fd.veh_crane}  onChange={v => set("veh_crane", v)} />
                  <CbRow label="Άλλο"          checked={fd.veh_other}  onChange={v => set("veh_other", v)} />
                </div>
                {fd.veh_other && (
                  <Input value={fd.veh_other_text} onChange={e => set("veh_other_text", e.target.value)}
                    placeholder="Άλλο όχημα/εξοπλισμός..." className="text-sm" />
                )}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Αιτιολόγηση *</Label>
                  <Textarea value={fd.veh_justification} onChange={e => set("veh_justification", e.target.value)}
                    placeholder="Αιτιολόγηση χρήσης ειδικού οχήματος/εξοπλισμού..." rows={3} className="text-sm" />
                </div>
              </div>
            )}
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              H. Εκκρεμότητες / Corrective
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="H. Εκκρεμότητες / Corrective">
            <Textarea value={fd.pending_corrective} onChange={e => set("pending_corrective", e.target.value)}
              placeholder="Εκκρεμότητες / Απαιτούμενες διορθωτικές ενέργειες..." rows={4} className="text-sm" />
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              I. ΤΕΚΜΗΡΙΩΣΗ & WM / ΚΛΙΜΑΚΩΣΗ
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="I. ΤΕΚΜΗΡΙΩΣΗ & WM / ΚΛΙΜΑΚΩΣΗ">
            <div className="space-y-3">
              <CbRow label="Φωτο ΠΡΙΝ"                        checked={fd.doc_photo_before}    onChange={v => set("doc_photo_before", v)} />
              <CbRow label="Φωτο ΜΕΤΑ (με σήμανση)"           checked={fd.doc_photo_after}     onChange={v => set("doc_photo_after", v)} />
              <CbRow label="Καταχώρηση ενεργειών στο WM"      checked={fd.doc_wm}              onChange={v => set("doc_wm", v)} />

              <div className="flex items-start gap-3">
                <Checkbox checked={!!fd.doc_materials} onCheckedChange={v => set("doc_materials", !!v)} className="mt-1 w-5 h-5" />
                <div className="flex-1 space-y-1">
                  <span className="text-sm text-slate-700">Υλικά προσωρινής ασφάλειας:</span>
                  {fd.doc_materials && (
                    <Input value={fd.doc_materials_text} onChange={e => set("doc_materials_text", e.target.value)}
                      placeholder="Περιγράψτε υλικά..." className="text-sm" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 px-4 rounded-lg border-2 border-emerald-200 bg-emerald-50/60 w-fit">
                <Checkbox
                  checked={!!fd.doc_make_safe_completed}
                  onCheckedChange={v => set("doc_make_safe_completed", !!v)}
                  className="w-5 h-5"
                />
                <span className={`text-sm font-bold ${fd.doc_make_safe_completed ? "text-emerald-700" : "text-slate-600"}`}>
                  Make Safe WO COMPLETED (Make-Safe)
                </span>
                {fd.doc_make_safe_completed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ενημέρωση HD/IM – Σχόλια:</Label>
              <Textarea value={fd.doc_hd_comments} onChange={e => set("doc_hd_comments", e.target.value)}
                placeholder="Σχόλια προς HD/IM..." rows={3} className="text-sm" />
            </div>

            {/* Photo uploads */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <PhotoUploadArea
                label="Φωτο ΠΡΙΝ"
                files={fd.photos_before}
                onChange={v => set("photos_before", v)}
                required={false}
              />
              <PhotoUploadArea
                label="Φωτο ΜΕΤΑ (με σήμανση)"
                files={fd.photos_after}
                onChange={v => set("photos_after", v)}
                required={fd.doc_photo_after}
              />
            </div>
          </Section>

          {/* ══════════════════════════════════════════════════════════════════
              K. ΥΠΟΓΡΑΦΕΣ
          ══════════════════════════════════════════════════════════════════ */}
          <Section title="K. ΥΠΟΓΡΑΦΕΣ" accent="border-indigo-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Τεχνικός */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Τεχνικός</p>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ονοματεπώνυμο</Label>
                  <Input value={fd.sig_tech} onChange={e => set("sig_tech", e.target.value)}
                    placeholder="Τεχνικός..." className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Υπογρ.</Label>
                  {fd.sig_tech_upload ? (
                    <div className="relative inline-block group">
                      <img src={fd.sig_tech_upload.url} alt="Υπογραφή" className="h-16 border border-slate-200 rounded-lg object-contain bg-white px-2" />
                      <button type="button" onClick={() => set("sig_tech_upload", null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                        onClick={() => sigTechRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5" /> Μεταφόρτωση Υπογραφής
                      </Button>
                      <input ref={sigTechRef} type="file" accept="image/*" className="hidden"
                        onChange={e => handleSigUpload(e, "sig_tech_upload")} />
                    </div>
                  )}
                </div>
              </div>

              {/* HD / Maintenance Supervisor */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">HD / Maintenance Supervisor</p>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ονοματεπώνυμο</Label>
                  <Input value={fd.sig_hd} onChange={e => set("sig_hd", e.target.value)}
                    placeholder="HD / Supervisor..." className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Υπογρ.</Label>
                  {fd.sig_hd_upload ? (
                    <div className="relative inline-block group">
                      <img src={fd.sig_hd_upload.url} alt="Υπογραφή" className="h-16 border border-slate-200 rounded-lg object-contain bg-white px-2" />
                      <button type="button" onClick={() => set("sig_hd_upload", null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                        onClick={() => sigHdRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5" /> Μεταφόρτωση Υπογραφής
                      </Button>
                      <input ref={sigHdRef} type="file" accept="image/*" className="hidden"
                        onChange={e => handleSigUpload(e, "sig_hd_upload")} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="space-y-1 max-w-xs">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ημ/νία *</Label>
                <Input type="date" value={fd.sig_date} onChange={e => set("sig_date", e.target.value)} className="text-sm" />
              </div>
            </div>
          </Section>

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