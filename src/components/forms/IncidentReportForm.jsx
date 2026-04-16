import React, { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getAthensTimestamp } from "@/lib/timeSync";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send, AlertTriangle, CheckCircle2, ShieldAlert, Info, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FileUploadArea from "@/components/shared/FileUploadArea";

// ── Sub-systems with sub-categories ──────────────────────────────────────────
const SUBSYSTEMS = {
  "Δομικό/Σκελετός": [
    "Γυαλί / τζάμι – ραγισμένο",
    "Γυαλί / τζάμι – σπασμένο / θραύση",
    "Μεταλλική κατασκευή – παραμόρφωση",
    "Μεταλλική κατασκευή – σπάσιμο",
    "Στέγη – βλάβη",
    "Άλλο δομικό πρόβλημα",
  ],
  "Hλεκτρολογικό": [
    "Καλωδίωση – βλάβη",
    "Ηλεκτρολογικός πίνακας – βλάβη",
    "Φωτισμός – δυσλειτουργία",
    "Σύνδεση δικτύου – βλάβη",
    "Άλλο ηλεκτρολογικό πρόβλημα",
  ],
  "Ηλεκτρονικό": [
    "Πίνακας πληροφοριών – δυσλειτουργία",
    "Αισθητήρας – βλάβη",
    "PV / Μπαταρία – βλάβη",
    "Σύστημα ελέγχου – βλάβη",
    "Άλλο ηλεκτρονικό πρόβλημα",
  ],
};

function Section({ number, title, accent, children }) {
  return (
    <div className={`bg-white rounded-xl border ${accent || "border-slate-200"} overflow-hidden`}>
      <div className={`px-5 py-3.5 border-b ${accent ? "border-inherit bg-slate-50/60" : "border-slate-100 bg-slate-50/30"}`}>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          {number}. {title}
        </h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 ml-1">
      <Lock className="w-2.5 h-2.5" /> auto
    </span>
  );
}

const defaultData = () => ({
  issue_date: "",
  reporter_name: "",
  reporter_phone: "",
  reporter_email: "",
  province: "",
  municipality: "",
  stop_number: "",
  stop_address: "",
  first_report_date: "",
  detection_time: "",
  incident_source: "",
  incident_source_other: "",
  subsystem: "",
  subsystem_detail: "",
  damage_description: "",
  probable_cause: "",
  probable_cause_other: "",
  attachments: [],
  priority: "",
  owr: "",
  make_safe: "",
  approval_date: "",
  authority_representative: "",
});

export default function IncidentReportForm({ submission, incidents = [], assets = [], onClose }) {
  const { toast } = useToast();
  const isEditing = !!submission;

  const [linkedIncidentId, setLinkedIncidentId] = useState(submission?.incident_id || "");
  const [linkedAssetId, setLinkedAssetId]       = useState(submission?.asset_id || "");

  const incident = useMemo(() => incidents.find(i => i.id === linkedIncidentId), [incidents, linkedIncidentId]);
  const asset    = useMemo(() => assets.find(a => a.id === linkedAssetId), [assets, linkedAssetId]);

  const [fd, setFd] = useState(() => ({
    ...defaultData(),
    ...(submission?.form_data || {}),
  }));

  const set = (key, val) => setFd(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!incident) return;
    setFd(prev => ({
      ...prev,
      reporter_name: prev.reporter_name || incident.reported_by_org || incident.reported_by_name || "",
      municipality:  prev.municipality  || incident.municipality || "",
      province:      prev.province      || incident.province || "",
      stop_number:   prev.stop_number   || incident.active_shelter_id || "",
      stop_address:  prev.stop_address  || incident.location_address || "",
      first_report_date: prev.first_report_date || incident.first_report_date || incident.reported_date || "",
      detection_time:    prev.detection_time    || incident.detection_time || "",
    }));
    if (!linkedAssetId && incident.related_asset_id) setLinkedAssetId(incident.related_asset_id);
  }, [linkedIncidentId]);

  useEffect(() => {
    if (!asset) return;
    setFd(prev => ({
      ...prev,
      municipality: prev.municipality || asset.municipality || "",
      province:     prev.province     || asset.city || "",
      stop_number:  prev.stop_number  || asset.active_shelter_id || "",
      stop_address: prev.stop_address || asset.location_address || "",
    }));
  }, [linkedAssetId]);

  const setSubsystem = (val) => setFd(prev => ({ ...prev, subsystem: val, subsystem_detail: "" }));
  const subCategories = SUBSYSTEMS[fd.subsystem] || [];

  const priorityP1 = fd.priority === "P1";
  const owrYes     = fd.owr === "ΝΑΙ";
  const makeSafeYes = fd.make_safe === "ΝΑΙ";

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = isEditing
        ? await base44.entities.FormSubmissions.update(submission.id, data)
        : await base44.entities.FormSubmissions.create(data);

      const incId = data.incident_id;
      const user = await base44.auth.me();
      const timestamp = getAthensTimestamp();
      const allFiles = (data.form_data?.attachments || []).filter(f => f?.url);

      if (incId && allFiles.length > 0) {
        await Promise.all(allFiles.map(f =>
          base44.entities.IncidentAttachments.create({
            incident_id: incId,
            file_url: f.url,
            file_name: f.name || f.url.split("/").pop(),
            file_type: /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name || "") ? "Photo" : "Document",
            uploaded_by: user?.email,
            is_initial_upload: true,
          })
        ));
      }

      const auditAttachments = [
        ...(data.status === "Submitted" && result?.id ? [{
          url: `form:${result.id}:${data.form_type}`,
          name: `${data.form_name} (Submitted)`,
          author: user?.email,
          author_name: user?.full_name,
          created_at: timestamp,
        }] : []),
        ...allFiles.map(f => ({
          url: f.url,
          name: f.name || f.url.split("/").pop(),
          author: user?.email,
          author_name: user?.full_name,
          created_at: timestamp,
        })),
      ];

      if (incId) {
        await base44.entities.IncidentAuditTrail.create({
          incident_id: incId,
          action: data.status === "Submitted" ? "Form Submitted" : "Form Saved",
          details: `${data.form_name} – ${data.status}`,
          user: user?.email,
          ...(auditAttachments.length > 0 ? { attachment_metadata: auditAttachments } : {}),
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
      const required = [
        ["issue_date", "Ημερομηνία Έκδοσης"],
        ["reporter_name", "Αναφέρων"],
        ["reporter_phone", "Τηλέφωνο"],
        ["reporter_email", "Email"],
        ["province", "Επαρχία"],
        ["municipality", "Δήμος"],
        ["stop_number", "Αριθμός Στάσης"],
        ["stop_address", "Διεύθυνση Στάσης"],
        ["first_report_date", "Ημερομηνία Πρώτης Αναφοράς"],
        ["detection_time", "Ώρα Εντοπισμού"],
        ["incident_source", "Προέλευση Αναφοράς Συμβάντος"],
        ["subsystem", "Επηρεαζόμενο Υποσύστημα"],
        ["damage_description", "Περιγραφή Βλάβης / Ζημιάς"],
        ["probable_cause", "Πιθανή Αιτία"],
        ["priority", "Πρώτη Αξιολόγηση Προτεραιότητας"],
        ["owr", "Εκτός Εγγύησης (OWR)"],
        ["make_safe", "Απαιτεί Άμεση Ασφάλιση Χώρου (Make-Safe)"],
        ["approval_date", "Ημερομηνία"],
        ["authority_representative", "Εκπρόσωπος Αναθέτουσας Αρχής"],
      ];
      for (const [key, label] of required) {
        if (!fd[key]) {
          toast({ title: `Απαιτείται: ${label}`, variant: "destructive" });
          return;
        }
      }
      if (fd.incident_source === "Άλλο" && !fd.incident_source_other) {
        toast({ title: "Απαιτείται: Αν άλλο, προσδιορίστε", variant: "destructive" }); return;
      }
      if (fd.probable_cause === "Άλλη αιτία" && !fd.probable_cause_other) {
        toast({ title: "Απαιτείται: Αν άλλη αιτία, προσδιορίστε", variant: "destructive" }); return;
      }
    }

    saveMutation.mutate({
      form_type: "incident_report",
      form_name: "Request for Corrective Maintenance – Incident Report",
      incident_id: linkedIncidentId || "",
      asset_id: linkedAssetId || "",
      work_order_id: submission?.work_order_id || "",
      status,
      submitted_at: status === "Submitted" ? new Date().toISOString() : submission?.submitted_at,
      form_data: fd,
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Request for Corrective Maintenance"
        subtitle="Φόρμα Αναφοράς Συμβάντος – Incident Report"
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
        <div className="max-w-4xl mx-auto p-6 space-y-5">

          {/* Linked records */}
          {(incidents.length > 0 || assets.length > 0) && (
            <div className="bg-white rounded-xl border border-indigo-100 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                <Info className="w-4 h-4" /> Σύνδεση Εγγραφών (προαιρετικό – για αυτόματη συμπλήρωση)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {incidents.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Incident</label>
                    <Select value={linkedIncidentId || "_none"} onValueChange={v => setLinkedIncidentId(v === "_none" ? "" : v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Επιλογή Incident..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Χωρίς σύνδεση —</SelectItem>
                        {incidents.map(i => {
                          const d = i.reported_date || i.first_report_date;
                          const dateFmt = d ? (() => { const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; })() : null;
                          return (
                            <SelectItem key={i.id} value={i.id}>
                              <span className="font-mono text-xs font-bold">{i.incident_id}</span>
                              <span className="mx-1 text-slate-300">|</span>
                              <span>{i.title}</span>
                              {dateFmt && <><span className="mx-1 text-slate-300">|</span><span className="text-slate-500 text-xs">{dateFmt}</span></>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {assets.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Asset / Στάση</label>
                    <Select value={linkedAssetId || "_none"} onValueChange={v => setLinkedAssetId(v === "_none" ? "" : v)}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Επιλογή Asset..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Χωρίς σύνδεση —</SelectItem>
                        {assets.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="font-mono text-xs mr-1">{a.asset_id}</span>{a.active_shelter_id || a.location_address || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {(incident || asset) && (
                <p className="text-xs text-indigo-500 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Τα διαθέσιμα πεδία συμπληρώθηκαν αυτόματα.
                </p>
              )}
            </div>
          )}

          {/* Visual Indicators */}
          {(priorityP1 || owrYes || makeSafeYes) && (
            <div className="flex flex-wrap gap-2">
              {priorityP1 && (
                <div className="flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow">
                  <AlertTriangle className="w-4 h-4" /> P1 – Υψηλή Προτεραιότητα
                </div>
              )}
              {owrYes && (
                <div className="flex items-center gap-2 bg-amber-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" /> ΕΚΤΟΣ ΕΓΓΥΗΣΗΣ (OWR)
                </div>
              )}
              {makeSafeYes && (
                <div className="flex items-center gap-2 bg-red-100 text-red-700 border border-red-300 rounded-lg px-3 py-1.5 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4" /> ΑΠΑΙΤΕΙΤΑΙ MAKE-SAFE
                </div>
              )}
            </div>
          )}

          <Section number="1" title="Γενικές Πληροφορίες">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ημερομηνία Έκδοσης" required>
                <Input type="date" value={fd.issue_date} onChange={e => set("issue_date", e.target.value)} className="text-sm mt-1" />
              </Field>
              <Field label={<>Αναφέρων – Οργανισμός {(incident?.reported_by_org || incident?.reported_by_name) && <AutoBadge />}</>} required>
                <Input value={fd.reporter_name} onChange={e => set("reporter_name", e.target.value)}
                  placeholder="Ονοματεπώνυμο / Οργανισμός..." className="text-sm mt-1" />
              </Field>
              <Field label="Τηλέφωνο" required>
                <Input type="tel" value={fd.reporter_phone} onChange={e => set("reporter_phone", e.target.value)}
                  placeholder="Αριθμός τηλεφώνου..." className="text-sm mt-1" />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={fd.reporter_email} onChange={e => set("reporter_email", e.target.value)}
                  placeholder="email@example.com" className="text-sm mt-1" />
              </Field>
            </div>
          </Section>

          <Section number="2" title="Στοιχεία Τοποθεσίας">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Επαρχία" required>
                <Input value={fd.province} onChange={e => set("province", e.target.value)}
                  placeholder="π.χ. Λευκωσία" className="text-sm mt-1" />
              </Field>
              <Field label={<>Δήμος {(incident?.municipality || asset?.municipality) && <AutoBadge />}</>} required>
                <Input value={fd.municipality} onChange={e => set("municipality", e.target.value)}
                  placeholder="π.χ. Στρόβολος" className="text-sm mt-1" />
              </Field>
              <Field label="Αριθμός Στάσης" required>
                <Input value={fd.stop_number} onChange={e => set("stop_number", e.target.value)}
                  placeholder="Αρ. Στάσης..." className="text-sm mt-1" />
              </Field>
              <Field label="Διεύθυνση Στάσης" required>
                <Input value={fd.stop_address} onChange={e => set("stop_address", e.target.value)}
                  placeholder="Οδός / Τοποθεσία..." className="text-sm mt-1" />
              </Field>
            </div>
          </Section>

          <Section number="3" title="Περιγραφή Προβλήματος / Συμβάντος">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Ημερομηνία Πρώτης Αναφοράς" required>
                <Input type="date" value={fd.first_report_date} onChange={e => set("first_report_date", e.target.value)} className="text-sm mt-1" />
              </Field>
              <Field label="Ώρα Εντοπισμού" required>
                <Input type="time" value={fd.detection_time} onChange={e => set("detection_time", e.target.value)} className="text-sm mt-1" />
              </Field>
              <Field label="Προέλευση Αναφοράς Συμβάντος" required>
                <Select value={fd.incident_source || "_none"} onValueChange={v => set("incident_source", v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    <SelectItem value="ΑΑ">ΑΑ</SelectItem>
                    <SelectItem value="Επιθεώρηση">Επιθεώρηση</SelectItem>
                    <SelectItem value="Πολίτης">Πολίτης</SelectItem>
                    <SelectItem value="Άλλο">Άλλο</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {fd.incident_source === "Άλλο" && (
              <Field label="Αν άλλο, προσδιορίστε:" required>
                <Input value={fd.incident_source_other} onChange={e => set("incident_source_other", e.target.value)}
                  placeholder="Προσδιορίστε..." className="text-sm mt-1" />
              </Field>
            )}

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Επηρεαζόμενο Υποσύστημα</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Υποσύστημα" required>
                  <Select value={fd.subsystem || "_none"} onValueChange={v => setSubsystem(v === "_none" ? "" : v)}>
                    <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή υποσυστήματος..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Επιλογή —</SelectItem>
                      {Object.keys(SUBSYSTEMS).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {fd.subsystem && (
                  <Field label="Λεπτομέρεια / Κατηγορία Βλάβης">
                    <Select value={fd.subsystem_detail || "_none"} onValueChange={v => set("subsystem_detail", v === "_none" ? "" : v)}>
                      <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Επιλογή —</SelectItem>
                        {subCategories.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
            </div>

            <Field label="Περιγραφή Βλάβης / Ζημιάς" required>
              <Textarea value={fd.damage_description} onChange={e => set("damage_description", e.target.value)}
                placeholder="Περιγράψτε αναλυτικά τη βλάβη ή τη ζημιά..." rows={4} className="text-sm mt-1" />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Πιθανή Αιτία" required>
                <Select value={fd.probable_cause || "_none"} onValueChange={v => set("probable_cause", v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή αιτίας..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    <SelectItem value="Βανδαλισμός">Βανδαλισμός</SelectItem>
                    <SelectItem value="Φυσική φθορά">Φυσική φθορά</SelectItem>
                    <SelectItem value="Ατύχημα">Ατύχημα</SelectItem>
                    <SelectItem value="Καιρικές συνθήκες">Καιρικές συνθήκες</SelectItem>
                    <SelectItem value="Άλλη αιτία">Άλλη αιτία</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {fd.probable_cause === "Άλλη αιτία" && (
                <Field label="Αν άλλη αιτία, προσδιορίστε:" required>
                  <Input value={fd.probable_cause_other} onChange={e => set("probable_cause_other", e.target.value)}
                    placeholder="Προσδιορίστε..." className="text-sm mt-1" />
                </Field>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <FileUploadArea
                label="Συνημμένα Αποδεικτικά"
                files={fd.attachments}
                onChange={v => set("attachments", v)}
              />
            </div>
          </Section>

          <Section number="4" title="Κατάταξη Προτεραιότητας">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Πρώτη Αξιολόγηση Προτεραιότητας" required>
                <Select value={fd.priority || "_none"} onValueChange={v => set("priority", v === "_none" ? "" : v)}>
                  <SelectTrigger className={`mt-1 text-sm font-semibold ${priorityP1 ? "border-red-400 bg-red-50 text-red-700" : ""}`}>
                    <SelectValue placeholder="Επιλογή..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Εκτός Εγγύησης (OWR)" required>
                <Select value={fd.owr || "_none"} onValueChange={v => set("owr", v === "_none" ? "" : v)}>
                  <SelectTrigger className={`mt-1 text-sm ${owrYes ? "border-amber-400 bg-amber-50 text-amber-800" : ""}`}>
                    <SelectValue placeholder="Επιλογή..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
                    <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Απαιτεί Άμεση Ασφάλιση Χώρου (Make-Safe)" required>
                <Select value={fd.make_safe || "_none"} onValueChange={v => set("make_safe", v === "_none" ? "" : v)}>
                  <SelectTrigger className={`mt-1 text-sm ${makeSafeYes ? "border-red-400 bg-red-50 text-red-700" : ""}`}>
                    <SelectValue placeholder="Επιλογή..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Επιλογή —</SelectItem>
                    <SelectItem value="ΝΑΙ">ΝΑΙ</SelectItem>
                    <SelectItem value="ΟΧΙ">ΟΧΙ</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section number="5" title="Εγκρίσεις & Επαλήθευση">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ημερομηνία" required>
                <Input type="date" value={fd.approval_date} onChange={e => set("approval_date", e.target.value)} className="text-sm mt-1" />
              </Field>
              <Field label="Εκπρόσωπος Αναθέτουσας Αρχής" required>
                <Input value={fd.authority_representative} onChange={e => set("authority_representative", e.target.value)}
                  placeholder="Ονοματεπώνυμο..." className="text-sm mt-1" />
              </Field>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 leading-relaxed">
                <span className="font-semibold">Σημείωση:</span> Τα χρονικά όρια απόκρισης/επισκευής εφαρμόζονται σύμφωνα με τα συμφωνημένα SLA του έργου.
              </p>
            </div>
          </Section>

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