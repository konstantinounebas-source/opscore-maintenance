import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useConfigLists } from "@/components/shared/useConfigLists";
import ConfirmCloseDialog from "@/components/shared/ConfirmCloseDialog";
import { Upload, Loader2, X, FileText, Image } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const generateIncidentId = (incidents) => {
  const nums = incidents
    .map(i => parseInt((i.incident_id || "").replace(/\D/g, ""), 10))
    .filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `INC-${String(next).padStart(3, "0")}`;
};

const SectionTitle = ({ children }) => (
  <div className="col-span-2 border-b pb-1 mb-1">
    <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">{children}</h3>
  </div>
);

const Field = ({ label, required, children, colSpan = 1 }) => (
  <div className={`space-y-1.5 ${colSpan === 2 ? "col-span-2" : ""}`}>
    <Label className="text-xs font-medium text-slate-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
  </div>
);

const YesNoSelect = ({ value, onChange }) => (
  <Select value={value === true ? "ΝΑΙ" : value === false ? "ΟΧΙ" : ""} onValueChange={v => onChange(v === "ΝΑΙ")}>
    <SelectTrigger><SelectValue placeholder="Επιλογή" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
      <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
    </SelectContent>
  </Select>
);

const emptyForm = () => ({
  incident_id: "", title: "", related_asset_id: "", related_asset_name: "",
  status: "Open", priority: "Medium", category: "", reported_date: "",
  assigned_to: "", description: "",
  issue_date: new Date().toISOString().split("T")[0],
  created_time: new Date().toTimeString().slice(0,5),
  reported_by_org: "", reported_by_name: "", phone_available: null, reported_by_phone: "",
  email_available: null, reported_by_email: "",
  incident_reporting_method: "",
  reporting_contact_info: "",
  province: "", municipality: "", shelter_type: "", active_shelter_id: "", location_address: "",
  detection_time: "",
  incident_source: "", work_order_reference: "", incident_source_other: "",
  subsystem_structural_selected: false, subsystem_structural_issue: "",
  subsystem_electrical_selected: false, subsystem_electrical_issue: "",
  subsystem_electronic_selected: false, subsystem_electronic_issue: "",
  subsystem_other_selected: false, subsystem_other_issue: "",
  damage_description: "", probable_cause: "", probable_cause_other: "",
  evidence_type: [], evidence_files: [],
  initial_priority: "", is_owr: null, requires_make_safe: false,
  approval_date: "", authority_representative: ""
});

export default function IncidentFormDialog({ open, onOpenChange, incident, onSave, defaultAssetId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // {name, url, type, preview}
  const incidentSources = useConfigLists("Incident Sources");
  const structuralIssues = useConfigLists("Structural Issues");
  const electricalIssues = useConfigLists("Electrical Issues");
  const electronicIssues = useConfigLists("Electronic Issues");
  const probableCauses = useConfigLists("Probable Causes");
  const evidenceTypes = useConfigLists("Evidence Types");
  const initialPriorities = useConfigLists("Priority");
  const provinces = useConfigLists("Provinces");
  const municipalities = useConfigLists("Municipalities");
  const reporterOrgs = useConfigLists("Reporter Organizations");
  const reportingMethods = useConfigLists("Τρόποι Αναφοράς");
  const reporterNames = useConfigLists("Reporter Names");
  const [dragOver, setDragOver] = useState(false);

  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });
  const { data: allIncidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });

  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (incident) {
      setForm({ ...emptyForm(), ...incident });
    } else {
      const f = emptyForm();
      f.reported_date = new Date().toISOString().split("T")[0];
      f.incident_id = generateIncidentId(allIncidents);
      if (defaultAssetId) {
      f.related_asset_id = defaultAssetId;
      const asset = assets.find(a => a.id === defaultAssetId);
      if (asset) {
        f.active_shelter_id = asset.asset_id || "";
        f.province = asset.city || "";
        f.municipality = asset.municipality || "";
        f.shelter_type = asset.shelter_type || "";
        f.location_address = asset.location_address || asset.location || "";
        f.title = `${asset.asset_id} - ${f.issue_date}`;
      }
      }
      setForm(f);
    }
    setErrors({});
    setPendingFiles([]);
  }, [incident, open, defaultAssetId, allIncidents.length]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleAssetChange = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    setForm(f => ({
      ...f,
      related_asset_id: assetId,
      related_asset_name: asset?.asset_id || "",
      active_shelter_id: asset?.asset_id || "",
      province: asset?.city || "",
      municipality: asset?.municipality || "",
      shelter_type: asset?.shelter_type || "",
      location_address: asset?.location_address || asset?.location || "",
      title: asset ? `${asset.asset_id} - ${f.issue_date}` : f.title,
    }));
  };

  const uploadFile = async (file) => {
    const isImage = file.type.startsWith("image/");
    const preview = isImage ? URL.createObjectURL(file) : null;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPendingFiles(pf => [...pf, { name: file.name, url: file_url, type: isImage ? "Photo" : "Document", preview }]);
    setForm(f => ({ ...f, evidence_files: [...f.evidence_files, file_url] }));
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) await uploadFile(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) await uploadFile(file);
    setUploading(false);
  };

  const removePendingFile = (url) => {
    setPendingFiles(pf => pf.filter(f => f.url !== url));
    setForm(f => ({ ...f, evidence_files: f.evidence_files.filter(u => u !== url) }));
  };

  const toggleEvidenceType = (val) => {
    setForm(f => ({
      ...f,
      evidence_type: f.evidence_type.includes(val)
        ? f.evidence_type.filter(v => v !== val)
        : [...f.evidence_type, val]
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.issue_date) e.issue_date = true;
    if (!form.reported_by_name) e.reported_by_name = true;
    if (form.phone_available && !form.reported_by_phone) e.reported_by_phone = true;
    if (form.email_available && !form.reported_by_email) e.reported_by_email = true;
    if (!form.incident_source) e.incident_source = true;
    if (form.incident_source === "Work Order" && !form.work_order_reference) e.work_order_reference = true;
    if (form.incident_source === "ΆΛΛΟ" && !form.incident_source_other) e.incident_source_other = true;
    if (!form.subsystem_structural_selected && !form.subsystem_electrical_selected && !form.subsystem_electronic_selected && !form.subsystem_other_selected) e.subsystems = true;
    if (form.subsystem_structural_selected && !form.subsystem_structural_issue) e.subsystem_structural_issue = true;
    if (form.subsystem_electrical_selected && !form.subsystem_electrical_issue) e.subsystem_electrical_issue = true;
    if (form.subsystem_electronic_selected && !form.subsystem_electronic_issue) e.subsystem_electronic_issue = true;
    if (!form.damage_description) e.damage_description = true;
    if (!form.probable_cause) e.probable_cause = true;
    if (form.probable_cause === "Άλλη αιτία" && !form.probable_cause_other) e.probable_cause_other = true;
    if (!form.initial_priority) e.initial_priority = true;
    if (form.is_owr === null) e.is_owr = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(form, pendingFiles);
      onOpenChange(false);
    }
  };

  const err = (key) => errors[key] ? "border-red-400" : "";

  return (
    <>
    <ConfirmCloseDialog
      open={confirmClose}
      onCancel={() => setConfirmClose(false)}
      onConfirm={() => { setConfirmClose(false); onOpenChange(false); }}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => { e.preventDefault(); setConfirmClose(true); }}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {incident ? "Επεξεργασία Συμβάντος" : "Νέο Συμβάν"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
              Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία που σημειώνονται με <span className="font-bold">*</span>
            </div>
          )}

          {/* ── 1. Βασικά Στοιχεία ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>1. Βασικά Στοιχεία</SectionTitle>

            <Field label="Ημερομηνία Έκδοσης" required colSpan={2}>
              <div className="flex gap-2">
                <Input type="date" className={`flex-1 ${err("issue_date")}`} value={form.issue_date} onChange={e => set("issue_date", e.target.value)} />
                <Input type="time" className="w-32" value={form.created_time} onChange={e => set("created_time", e.target.value)} />
              </div>
            </Field>

            <Field label="Αναφέρων - Οργανισμός" required colSpan={2}>
              <Select value={form.reported_by_org} onValueChange={v => { set("reported_by_org", v); set("reported_by_name", ""); }}>
                <SelectTrigger className={err("reported_by_name")}><SelectValue placeholder="Επιλογή οργανισμού..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contracting Authority">Contracting Authority</SelectItem>
                  <SelectItem value="Air Control">Air Control</SelectItem>
                  {reporterOrgs.filter(o => o !== "Contracting Authority" && o !== "Air Control").map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            {form.reported_by_org && (
              <Field label="Όνομα Αναφέροντος" required colSpan={2}>
                {reporterNames.length > 0 && (
                  <Select value={reporterNames.includes(form.reported_by_name) ? form.reported_by_name : "__manual__"}
                    onValueChange={v => { if (v !== "__manual__") set("reported_by_name", v); }}>
                    <SelectTrigger className="mb-1"><SelectValue placeholder="Επιλογή από λίστα..." /></SelectTrigger>
                    <SelectContent>
                      {reporterNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      <SelectItem value="__manual__">— Χειροκίνητη εισαγωγή —</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input className={err("reported_by_name")} value={form.reported_by_name} onChange={e => set("reported_by_name", e.target.value)} placeholder="Όνομα προσώπου..." />
              </Field>
            )}

            <Field label="Αρχική Προτεραιότητα" required>
              <Select value={form.initial_priority} onValueChange={v => set("initial_priority", v)}>
                <SelectTrigger className={err("initial_priority")}><SelectValue placeholder="P1 / P2" /></SelectTrigger>
                <SelectContent>{initialPriorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div />

            <Field label="Τρόπος Αναφοράς" colSpan={2}>
              <Select value={form.incident_reporting_method} onValueChange={v => { set("incident_reporting_method", v); set("reporting_contact_info", ""); }}>
                <SelectTrigger><SelectValue placeholder="Επιλογή τρόπου αναφοράς..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Web Maintenance">Web Maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  {reportingMethods.filter(m => m !== "Web Maintenance" && m !== "Other").map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            {form.incident_reporting_method === "Other" && (
              <>
                <Field label="Τηλέφωνο διαθέσιμο">
                  <YesNoSelect value={form.phone_available} onChange={v => set("phone_available", v)} />
                </Field>
                <Field label="Email διαθέσιμο">
                  <YesNoSelect value={form.email_available} onChange={v => set("email_available", v)} />
                </Field>
                {form.phone_available && (
                  <Field label="Τηλέφωνο" required colSpan={2}>
                    <Input type="tel" className={err("reported_by_phone")} value={form.reported_by_phone} onChange={e => set("reported_by_phone", e.target.value)} placeholder="π.χ. 6912345678" />
                  </Field>
                )}
                {form.email_available && (
                  <Field label="Email" required colSpan={2}>
                    <Input type="email" className={err("reported_by_email")} value={form.reported_by_email} onChange={e => set("reported_by_email", e.target.value)} placeholder="π.χ. name@example.com" />
                  </Field>
                )}
                <Field label="Βασικά Στοιχεία Επικοινωνίας" colSpan={2}>
                  <Textarea value={form.reporting_contact_info} onChange={e => set("reporting_contact_info", e.target.value)} placeholder="Ονοματεπώνυμο, email, τηλέφωνο κ.λπ." rows={2} />
                </Field>
              </>
            )}
          </div>

          {/* ── 2. Στοιχεία Στάσης ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>2. Στοιχεία Στάσης</SectionTitle>

            <Field label="Αριθμός Στάσης" required colSpan={2}>
              <Select value={form.related_asset_id} onValueChange={handleAssetChange}>
                <SelectTrigger><SelectValue placeholder="Επιλογή asset..." /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_id} {a.asset_name ? `- ${a.asset_name}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Επαρχία">
              {form.related_asset_id ? (
                <Input value={form.province} readOnly className="bg-slate-50 text-slate-600" />
              ) : (
                <Select value={form.province} onValueChange={v => set("province", v)}>
                  <SelectTrigger><SelectValue placeholder="Επιλογή επαρχίας..." /></SelectTrigger>
                  <SelectContent>{provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Δήμος">
              {form.related_asset_id ? (
                <Input value={form.municipality} readOnly className="bg-slate-50 text-slate-600" />
              ) : (
                <Select value={form.municipality} onValueChange={v => set("municipality", v)}>
                  <SelectTrigger><SelectValue placeholder="Επιλογή δήμου..." /></SelectTrigger>
                  <SelectContent>{municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </Field>

            <Field label="Τύπος Στάσης" colSpan={2}>
              <Input value={form.shelter_type} readOnly={!!form.related_asset_id} className={form.related_asset_id ? "bg-slate-50 text-slate-600" : ""} onChange={e => set("shelter_type", e.target.value)} placeholder="Τύπος..." />
            </Field>

            <Field label="Διεύθυνση Στάσης" colSpan={2}>
              <Input value={form.location_address} readOnly={!!form.related_asset_id} className={form.related_asset_id ? "bg-slate-50 text-slate-600" : ""} onChange={e => set("location_address", e.target.value)} />
            </Field>

          </div>

          {/* ── 3. Περιγραφή Συμβάντος ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>3. Περιγραφή Συμβάντος</SectionTitle>

            <Field label="Ώρα Εντοπισμού">
              <Input type="time" value={form.detection_time} onChange={e => set("detection_time", e.target.value)} />
            </Field>
            <div />

            <Field label="Προέλευση Αναφοράς Συμβάντος" required colSpan={2}>
              <Select value={form.incident_source} onValueChange={v => set("incident_source", v)}>
                <SelectTrigger className={err("incident_source")}><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                <SelectContent>{incidentSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            {form.incident_source === "Work Order" && (
              <Field label="Αναφορά Work Order" required colSpan={2}>
                <Select value={form.work_order_reference} onValueChange={v => set("work_order_reference", v)}>
                  <SelectTrigger className={err("work_order_reference")}><SelectValue placeholder="Επιλογή Work Order..." /></SelectTrigger>
                  <SelectContent>
                    {workOrders.map(wo => <SelectItem key={wo.id} value={wo.work_order_id}>{wo.work_order_id} — {wo.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {form.incident_source === "ΆΛΛΟ" && (
              <Field label="Αν άλλο, προσδιορίστε:" required colSpan={2}>
                <Input className={err("incident_source_other")} value={form.incident_source_other} onChange={e => set("incident_source_other", e.target.value)} />
              </Field>
            )}

            {/* Subsystems */}
            <div className="col-span-2 space-y-3">
              <Label className="text-xs font-semibold text-slate-700">
                Επηρεαζόμενα Υποσυστήματα <span className="text-red-500">*</span>
              </Label>
              {errors.subsystems && <p className="text-xs text-red-500">Επιλέξτε τουλάχιστον ένα υποσύστημα</p>}

              <div className="space-y-2 pl-1">
                {/* Structural */}
                <div className="flex items-center gap-2">
                  <Checkbox id="structural" checked={form.subsystem_structural_selected} onCheckedChange={v => set("subsystem_structural_selected", !!v)} />
                  <label htmlFor="structural" className="text-sm text-slate-700">Δομικό / Σκελετός</label>
                </div>
                {form.subsystem_structural_selected && (
                  <div className="ml-6">
                    <Select value={form.subsystem_structural_issue} onValueChange={v => set("subsystem_structural_issue", v)}>
                      <SelectTrigger className={`w-full ${err("subsystem_structural_issue")}`}><SelectValue placeholder="Υποκατηγορία..." /></SelectTrigger>
                      <SelectContent>{structuralIssues.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {/* Electrical */}
                <div className="flex items-center gap-2">
                  <Checkbox id="electrical" checked={form.subsystem_electrical_selected} onCheckedChange={v => set("subsystem_electrical_selected", !!v)} />
                  <label htmlFor="electrical" className="text-sm text-slate-700">Ηλεκτρολογικό</label>
                </div>
                {form.subsystem_electrical_selected && (
                  <div className="ml-6">
                    <Select value={form.subsystem_electrical_issue} onValueChange={v => set("subsystem_electrical_issue", v)}>
                      <SelectTrigger className={`w-full ${err("subsystem_electrical_issue")}`}><SelectValue placeholder="Υποκατηγορία..." /></SelectTrigger>
                      <SelectContent>{electricalIssues.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {/* Electronic */}
                <div className="flex items-center gap-2">
                  <Checkbox id="electronic" checked={form.subsystem_electronic_selected} onCheckedChange={v => set("subsystem_electronic_selected", !!v)} />
                  <label htmlFor="electronic" className="text-sm text-slate-700">Ηλεκτρονικό</label>
                </div>
                {form.subsystem_electronic_selected && (
                  <div className="ml-6">
                    <Select value={form.subsystem_electronic_issue} onValueChange={v => set("subsystem_electronic_issue", v)}>
                      <SelectTrigger className={`w-full ${err("subsystem_electronic_issue")}`}><SelectValue placeholder="Υποκατηγορία..." /></SelectTrigger>
                      <SelectContent>{electronicIssues.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                {/* Other */}
                <div className="flex items-center gap-2">
                  <Checkbox id="subsystem_other" checked={form.subsystem_other_selected} onCheckedChange={v => set("subsystem_other_selected", !!v)} />
                  <label htmlFor="subsystem_other" className="text-sm text-slate-700">Άλλο</label>
                </div>
                {form.subsystem_other_selected && (
                  <div className="ml-6">
                    <Input value={form.subsystem_other_issue} onChange={e => set("subsystem_other_issue", e.target.value)} placeholder="Περιγράψτε το υποσύστημα..." />
                  </div>
                )}
              </div>
            </div>

            <Field label="Περιγραφή Βλάβης / Ζημιάς" colSpan={2}>
              <Textarea className={err("damage_description")} value={form.damage_description} onChange={e => set("damage_description", e.target.value)} rows={3} />
            </Field>

            <Field label="Εκτός Εγγύησης (OWR)" required>
              <YesNoSelect value={form.is_owr} onChange={v => set("is_owr", v)} />
              {errors.is_owr && <p className="text-xs text-red-500">Υποχρεωτικό</p>}
            </Field>
            <div />

            <Field label="Πιθανή Αιτία" required>
              <Select value={form.probable_cause} onValueChange={v => set("probable_cause", v)}>
                <SelectTrigger className={err("probable_cause")}><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                <SelectContent>{probableCauses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {form.probable_cause === "Άλλη αιτία" && (
              <Field label="Αν άλλη αιτία, προσδιορίστε:" required>
                <Input className={err("probable_cause_other")} value={form.probable_cause_other} onChange={e => set("probable_cause_other", e.target.value)} />
              </Field>
            )}

            {/* Evidence */}
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Συνημμένα Αποδεικτικά</Label>
              <div className="flex flex-wrap gap-3">
                {evidenceTypes.map(et => (
                  <label key={et} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                    <Checkbox checked={form.evidence_type.includes(et)} onCheckedChange={() => toggleEvidenceType(et)} />
                    {et}
                  </label>
                ))}
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} multiple />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Ανέβασμα...
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <Upload className="w-5 h-5" />
                    <span className="text-xs">Σύρετε αρχεία εδώ ή <span className="text-indigo-600 underline">κάντε κλικ</span></span>
                    <span className="text-xs text-slate-400">Υποστηρίζονται πολλαπλά αρχεία</span>
                  </div>
                )}
              </div>
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {pendingFiles.map(f => (
                    <div key={f.url} className="relative border rounded-lg overflow-hidden w-24 h-24 bg-slate-50 flex flex-col items-center justify-center group">
                      {f.preview ? (
                        <img src={f.preview} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                          <FileText className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500 truncate w-full text-center px-1">{f.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingFile(f.url)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                      {f.preview && <span className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] truncate px-1">{f.name}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 4. Εγκρίσεις & Επαλήθευση ──────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>5. Εγκρίσεις & Επαλήθευση</SectionTitle>

            <Field label="Εκπρόσωπος Αναθέτουσας Αρχής" colSpan={2}>
              <Input value={form.authority_representative} onChange={e => set("authority_representative", e.target.value)} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setConfirmClose(true)}>Ακύρωση</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {incident ? "Ενημέρωση" : "Δημιουργία"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}