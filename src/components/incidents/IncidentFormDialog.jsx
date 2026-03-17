import React, { useState, useEffect } from "react";
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
import FileUploader from "@/components/shared/FileUploader";

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
  reported_by_name: "", phone_available: null, reported_by_phone: "",
  email_available: null, reported_by_email: "",
  incident_reporting_method: "",
  province: "", municipality: "", active_shelter_id: "", location_address: "",
  first_report_date: "", detection_time: "",
  incident_source: "", work_order_reference: "", incident_source_other: "",
  subsystem_structural_selected: false, subsystem_structural_issue: "",
  subsystem_electrical_selected: false, subsystem_electrical_issue: "",
  subsystem_electronic_selected: false, subsystem_electronic_issue: "",
  damage_description: "", probable_cause: "", probable_cause_other: "",
  evidence_type: [], evidence_files: [],
  initial_priority: "", is_owr: null, requires_make_safe: null,
  approval_date: "", authority_representative: ""
});

export default function IncidentFormDialog({ open, onOpenChange, incident, onSave, defaultAssetId }) {
  const incidentSources = useConfigLists("Incident Sources");
  const structuralIssues = useConfigLists("Structural Issues");
  const electricalIssues = useConfigLists("Electrical Issues");
  const electronicIssues = useConfigLists("Electronic Issues");
  const probableCauses = useConfigLists("Probable Causes");
  const evidenceTypes = useConfigLists("Evidence Types");
  const initialPriorities = useConfigLists("Priority");
  const provinces = useConfigLists("Provinces");
  const municipalities = useConfigLists("Municipalities");
  const reporterNames = useConfigLists("Reporter Names");
  const reporterPhones = useConfigLists("Reporter Phones");
  const reporterEmails = useConfigLists("Reporter Emails");
  const reportingMethods = useConfigLists("Τρόποι Αναφοράς");

  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });
  const { data: allIncidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });

  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

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
          f.province = asset.category || "";
          f.location_address = asset.location || "";
          f.title = `${asset.asset_name} - ${f.issue_date}`;
        }
      }
      setForm(f);
    }
    setErrors({});
  }, [incident, open, defaultAssetId, allIncidents.length]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleAssetChange = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    setForm(f => ({
      ...f,
      related_asset_id: assetId,
      related_asset_name: asset?.asset_name || "",
      active_shelter_id: asset?.asset_id || "",
      province: asset?.category || "",
      municipality: asset?.asset_type || "",
      location_address: asset?.location || "",
      title: asset ? `${asset.asset_name} - ${f.issue_date}` : f.title,
    }));
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
    if (!form.first_report_date) e.first_report_date = true;
    if (form.first_report_date && form.issue_date && form.first_report_date > form.issue_date) e.first_report_date_order = true;
    if (!form.incident_source) e.incident_source = true;
    if (form.incident_source === "Work Order" && !form.work_order_reference) e.work_order_reference = true;
    if (form.incident_source === "ΆΛΛΟ" && !form.incident_source_other) e.incident_source_other = true;
    if (!form.subsystem_structural_selected && !form.subsystem_electrical_selected && !form.subsystem_electronic_selected) e.subsystems = true;
    if (form.subsystem_structural_selected && !form.subsystem_structural_issue) e.subsystem_structural_issue = true;
    if (form.subsystem_electrical_selected && !form.subsystem_electrical_issue) e.subsystem_electrical_issue = true;
    if (form.subsystem_electronic_selected && !form.subsystem_electronic_issue) e.subsystem_electronic_issue = true;
    if (!form.damage_description) e.damage_description = true;
    if (!form.probable_cause) e.probable_cause = true;
    if (form.probable_cause === "Άλλη αιτία" && !form.probable_cause_other) e.probable_cause_other = true;
    if (!form.initial_priority) e.initial_priority = true;
    if (form.is_owr === null) e.is_owr = true;
    if (form.requires_make_safe === null) e.requires_make_safe = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  const err = (key) => errors[key] ? "border-red-400" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <Input type="date" className={err("issue_date")} value={form.issue_date} onChange={e => set("issue_date", e.target.value)} />
            </Field>

            <Field label="Αναφέρων" required colSpan={2}>
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
              <Input className={err("reported_by_name")} value={form.reported_by_name} onChange={e => set("reported_by_name", e.target.value)} placeholder="ή πληκτρολογήστε..." />
            </Field>

            <Field label="Τρόπος Αναφοράς" colSpan={2}>
              {reportingMethods.length > 0 ? (
                <Select value={form.incident_reporting_method} onValueChange={v => set("incident_reporting_method", v)}>
                  <SelectTrigger><SelectValue placeholder="Επιλογή τρόπου αναφοράς..." /></SelectTrigger>
                  <SelectContent>{reportingMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.incident_reporting_method} onChange={e => set("incident_reporting_method", e.target.value)} placeholder="π.χ. Email, Τηλέφωνο..." />
              )}
            </Field>

            <Field label="Τηλέφωνο διαθέσιμο">
              <YesNoSelect value={form.phone_available} onChange={v => set("phone_available", v)} />
            </Field>
            {form.phone_available && (
              <Field label="Τηλέφωνο" required>
                {reporterPhones.length > 0 && (
                  <Select value={reporterPhones.includes(form.reported_by_phone) ? form.reported_by_phone : "__manual__"}
                    onValueChange={v => { if (v !== "__manual__") set("reported_by_phone", v); }}>
                    <SelectTrigger className="mb-1"><SelectValue placeholder="Επιλογή από λίστα..." /></SelectTrigger>
                    <SelectContent>
                      {reporterPhones.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      <SelectItem value="__manual__">— Χειροκίνητη εισαγωγή —</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input type="tel" className={err("reported_by_phone")} value={form.reported_by_phone} onChange={e => set("reported_by_phone", e.target.value)} placeholder="π.χ. 6912345678" />
              </Field>
            )}

            <Field label="Email διαθέσιμο">
              <YesNoSelect value={form.email_available} onChange={v => set("email_available", v)} />
            </Field>
            {form.email_available && (
              <Field label="Email" required>
                {reporterEmails.length > 0 && (
                  <Select value={reporterEmails.includes(form.reported_by_email) ? form.reported_by_email : "__manual__"}
                    onValueChange={v => { if (v !== "__manual__") set("reported_by_email", v); }}>
                    <SelectTrigger className="mb-1"><SelectValue placeholder="Επιλογή από λίστα..." /></SelectTrigger>
                    <SelectContent>
                      {reporterEmails.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      <SelectItem value="__manual__">— Χειροκίνητη εισαγωγή —</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input type="email" className={err("reported_by_email")} value={form.reported_by_email} onChange={e => set("reported_by_email", e.target.value)} placeholder="π.χ. name@example.com" />
              </Field>
            )}
          </div>

          {/* ── 2. Στοιχεία Στάσης ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>2. Στοιχεία Στάσης</SectionTitle>

            <Field label="Αριθμός Στάσης" required colSpan={2}>
              <Select value={form.related_asset_id} onValueChange={handleAssetChange}>
                <SelectTrigger><SelectValue placeholder="Επιλογή asset..." /></SelectTrigger>
                <SelectContent>
                  {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_id} — {a.asset_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Επαρχία">
              <Select value={form.province} onValueChange={v => set("province", v)}>
                <SelectTrigger><SelectValue placeholder="Επιλογή επαρχίας..." /></SelectTrigger>
                <SelectContent>{provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Δήμος">
              <Select value={form.municipality} onValueChange={v => set("municipality", v)}>
                <SelectTrigger><SelectValue placeholder="Επιλογή δήμου..." /></SelectTrigger>
                <SelectContent>{municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Διεύθυνση Στάσης" colSpan={2}>
              <Input value={form.location_address} onChange={e => set("location_address", e.target.value)} />
            </Field>

            <Field label="Ημερομηνία Πρώτης Αναφοράς" required>
              <Input type="date" className={err("first_report_date") || err("first_report_date_order")} value={form.first_report_date} onChange={e => set("first_report_date", e.target.value)} />
              {errors.first_report_date_order && <p className="text-xs text-red-500">Δεν μπορεί να είναι μετά την Ημ. Έκδοσης</p>}
            </Field>
            <Field label="Ώρα Εντοπισμού">
              <Input type="time" value={form.detection_time} onChange={e => set("detection_time", e.target.value)} />
            </Field>
          </div>

          {/* ── 3. Περιγραφή Συμβάντος ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>3. Περιγραφή Συμβάντος</SectionTitle>

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
              </div>
            </div>

            <Field label="Περιγραφή Βλάβης / Ζημιάς" required colSpan={2}>
              <Textarea className={err("damage_description")} value={form.damage_description} onChange={e => set("damage_description", e.target.value)} rows={3} />
            </Field>

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
              <FileUploader
                onUpload={(url, name) => setForm(f => ({ ...f, evidence_files: [...f.evidence_files, url] }))}
                label="Επισύναψη αρχείου"
              />
              {form.evidence_files.length > 0 && (
                <p className="text-xs text-slate-500">{form.evidence_files.length} αρχείο(α) επισυνημμένα</p>
              )}
            </div>
          </div>

          {/* ── 4. Κατάταξη Προτεραιότητας ─────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>4. Κατάταξη Προτεραιότητας</SectionTitle>

            <Field label="Αρχική Προτεραιότητα" required>
              <Select value={form.initial_priority} onValueChange={v => set("initial_priority", v)}>
                <SelectTrigger className={err("initial_priority")}><SelectValue placeholder="P1 / P2" /></SelectTrigger>
                <SelectContent>{initialPriorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Εκτός Εγγύησης (OWR)" required>
              <YesNoSelect value={form.is_owr} onChange={v => set("is_owr", v)} />
              {errors.is_owr && <p className="text-xs text-red-500">Υποχρεωτικό</p>}
            </Field>
            <Field label="Απαιτεί Άμεση Ασφάλιση Χώρου (Make-Safe)" required colSpan={2}>
              <YesNoSelect value={form.requires_make_safe} onChange={v => set("requires_make_safe", v)} />
              {errors.requires_make_safe && <p className="text-xs text-red-500">Υποχρεωτικό</p>}
            </Field>
          </div>

          {/* ── 5. Εγκρίσεις & Επαλήθευση ──────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>5. Εγκρίσεις & Επαλήθευση</SectionTitle>

            <Field label="Ημερομηνία Έγκρισης">
              <Input type="date" value={form.approval_date} onChange={e => set("approval_date", e.target.value)} />
            </Field>
            <Field label="Εκπρόσωπος Αναθέτουσας Αρχής">
              <Input value={form.authority_representative} onChange={e => set("authority_representative", e.target.value)} />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {incident ? "Ενημέρωση" : "Δημιουργία"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}