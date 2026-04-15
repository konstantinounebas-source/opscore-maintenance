import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import FileUploader from "@/components/shared/FileUploader";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import WorkOrderPanel from "@/components/incidents/WorkOrderPanel";
import OutlineManagementForm from "@/components/forms/OutlineManagementForm";
import CombinedFMPIandInvoiceForm from "@/components/forms/CombinedFMPIandInvoiceForm";
import {
  CheckCircle2, Circle, Loader2, ChevronRight,
  Paperclip, StickyNote, AlertTriangle, FileCheck, Lock, FileText
} from "lucide-react";

// ── Administrative steps in strict sequential order ──────────────────────────
const ADMIN_STEPS = [
  { key: "confirmation_of_receipt", label: "Confirmation of Receipt",       flag: "confirmation_done" },
  { key: "create_ompi",             label: "Outline Management Plan (OMPI)", flag: "ompi_done" },
  { key: "create_fmpi",             label: "Full Management Plan (FMPI)",    flag: "owr_fmpi_done" },
  { key: "ca_status",               label: "CA Status",                      flag: "ca_status_done" },
  { key: "close_incident",          label: "Close Incident",                 flag: null },
];

// ── Workorder action types ───────────────────────────────────────────────────
const WO_PANELS = [
  { woType: "make_safe",  label: "Make Safe WO" },
  { woType: "inspection", label: "Inspection WO" },
  { woType: "corrective", label: "Corrective WO" },
];

function isStepDone(step, incident) {
  if (step.key === "ca_status") {
    // If not out of warranty, skip this step entirely (treat as done)
    if (incident.out_of_warranty !== "Yes") return true;
    return incident.ca_status === "Approved" || incident.ca_status === "Not Approved";
  }
  if (step.flag) return !!incident[step.flag];
  return incident.status === "Closed";
}

function isStepLocked(stepIndex, incident) {
  if (stepIndex === 0) return false;
  const prev = ADMIN_STEPS[stepIndex - 1];
  return !isStepDone(prev, incident);
}

// ── Admin Step Card ──────────────────────────────────────────────────────────
function AdminStepCard({ step, stepIndex, incident, onOpen }) {
  const done = isStepDone(step, incident);
  const locked = isStepLocked(stepIndex, incident);

  return (
    <button
      disabled={locked}
      onClick={() => !locked && onOpen(step)}
      className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg border transition-all
        ${done
          ? "bg-green-50 border-green-200"
          : locked
            ? "bg-slate-50 border-slate-100 cursor-not-allowed opacity-60"
            : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm"
        }`}
    >
      <div className="flex-shrink-0">
        {done
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : locked
            ? <Lock className="w-4 h-4 text-slate-300" />
            : <Circle className="w-4 h-4 text-slate-300" />
        }
      </div>
      <div className="flex-1 flex items-center gap-2">
        <span className={`text-sm font-medium ${done ? "text-slate-600" : locked ? "text-slate-400" : "text-slate-800"}`}>
          {step.label}
        </span>
        {done && step.key === "ca_status" && incident.out_of_warranty !== "Yes" && (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">N/A</span>
        )}
        {done && step.key === "ca_status" && incident.out_of_warranty === "Yes" && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            incident.ca_status === "Approved"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {incident.ca_status === "Approved" ? "✓ Approved" : "✗ Not Approved"}
          </span>
        )}
        {done && step.key !== "ca_status" && <span className="text-xs text-green-600 font-medium">✓ Done</span>}
        {locked && <span className="text-xs text-slate-400">Locked</span>}
      </div>
      {!done && !locked && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
    </button>
  );
}

// ── Admin Action Modal ───────────────────────────────────────────────────────
function AdminActionModal({ step, incident, incidentId, onClose, onDone }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ ca_status: "Approved" });
  const [saving, setSaving] = useState(false);
  const [person, setPerson] = useState("");
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);

  // Data needed by embedded forms
  const { data: allIncidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incidents.list(),
    enabled: showEmbeddedForm,
  });
  const { data: allAssets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
    enabled: showEmbeddedForm,
  });
  const { data: allWorkOrders = [] } = useQuery({
    queryKey: ["allWorkOrders"],
    queryFn: () => base44.entities.WorkOrders.list(),
    enabled: showEmbeddedForm,
  });
  const { data: allChildAssets = [] } = useQuery({
    queryKey: ["allChildAssets"],
    queryFn: () => base44.entities.ChildAssets.list(),
    enabled: showEmbeddedForm,
  });

  const key = step.key;

  const { data: existingAttachments = [] } = useQuery({
    queryKey: ["incidentAttachments", incidentId],
    queryFn: () => base44.entities.IncidentAttachments.filter({ incident_id: incidentId }),
  });

  const { data: personList = [] } = useQuery({
    queryKey: ["configList", "incident_person"],
    queryFn: async () => {
      const items = await base44.entities.ConfigLists.filter({ list_type: "incident_person" });
      return items.map(i => i.value);
    },
  });

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const addAudit = async (action, details, extra = {}) => {
    await base44.entities.IncidentAuditTrail.create({
      incident_id: incidentId, action, details,
      user: person || user?.email,
      ...extra
    });
  };

  const uploadAttachment = async (fileData) => {
    await base44.entities.IncidentAttachments.create({
      file_url: fileData.file_url,
      file_name: fileData.file_name,
      file_type: fileData.file_type || "Document",
      incident_id: incidentId,
      uploaded_by: user?.email || person,
    });
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAudit", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incidentId] });
    queryClient.invalidateQueries({ queryKey: ["workOrders", incidentId] });
  };

  const handleSubmit = async () => {
    if (key !== "close_incident" && !person.trim()) {
      toast({ title: "Person required", description: "Please enter the responsible person." });
      return;
    }
    if (key === "create_ompi" && !formData.file && existingAttachments.length === 0) {
      toast({ title: "Attachment required", description: "Please upload the OMPI document." });
      return;
    }

    setSaving(true);
    try {
      const incidentUpdates = {};
      // user is available from useAuth() context

      if (formData.out_of_warranty) {
        incidentUpdates.out_of_warranty = formData.out_of_warranty;
      }

      if (key === "confirmation_of_receipt") {
        const msg = `Αγαπητοί/ες,\n\nΕπιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): ${incident.incident_id}.\n\nΤο περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης.\nΠαραμένουμε στην διάθεσή σας.\nΜε εκτίμηση,`;
        incidentUpdates.confirmation_done = true;
        await addAudit("Confirmation of Receipt", msg);
      }

      if (key === "create_ompi") {
        if (formData.file) await uploadAttachment(formData.file);
        incidentUpdates.ompi_done = true;
        await addAudit(
          "OMPI Created",
          `OMPI created${formData.notes ? `: ${formData.notes}` : ""}`,
          formData.file ? { attachments: [formData.file.file_url], attachment_names: [formData.file.file_name] } : {}
        );
      }

      if (key === "create_fmpi") {
        if (formData.file) await uploadAttachment(formData.file);
        if (formData.pricing_order_file) await uploadAttachment(formData.pricing_order_file);
        incidentUpdates.owr_fmpi_done = true;
        const details = `FMPI created${formData.notes ? `: ${formData.notes}` : ""}${!incident.is_owr ? " — CA Approval required" : ""}`;
        const attachmentData = {};
        if (formData.file || formData.pricing_order_file) {
          const attachmentUrls = [];
          const attachmentNames = [];
          if (formData.file) {
            attachmentUrls.push(formData.file.file_url);
            attachmentNames.push(formData.file.file_name);
          }
          if (formData.pricing_order_file) {
            attachmentUrls.push(formData.pricing_order_file.file_url);
            attachmentNames.push(formData.pricing_order_file.file_name);
          }
          attachmentData.attachments = attachmentUrls;
          attachmentData.attachment_names = attachmentNames;
        }
        await addAudit("FMPI Created", details, attachmentData);
      }

      if (key === "ca_status") {
        const caVal = formData.ca_status || "Approved";
        incidentUpdates.ca_status = caVal;
        const auditDetails = `CA Status set to: ${caVal}${formData.notes ? ` — ${formData.notes}` : ""}`;
        const auditExtra = {};
        if (formData.ca_invoice) {
          await uploadAttachment(formData.ca_invoice);
          auditExtra.attachments = [formData.ca_invoice.file_url];
          auditExtra.attachment_names = [formData.ca_invoice.file_name];
        }
        await addAudit("CA Status Set", auditDetails, auditExtra);
      }

      if (key === "close_incident") {
        // Handle optional photos before closing
        const attachmentUrls = [];
        const attachmentNames = [];
        if (formData.photos_after && Array.isArray(formData.photos_after)) {
          for (const photo of formData.photos_after) {
            if (photo?.url) {
              await uploadAttachment({ file_url: photo.url, file_name: photo.name || "Photo", file_type: "Photo" });
              attachmentUrls.push(photo.url);
              attachmentNames.push(photo.name || "Photo");
            }
          }
        }
        if (attachmentUrls.length > 0) {
          incidentUpdates.photos_after_fixing_done = true;
        }
         // Prerequisite check before closing
         if (!incident.confirmation_done) {
           toast({ title: "Cannot close", description: "Confirmation of Receipt must be completed first." });
           setSaving(false); return;
         }
         if (!incident.ompi_done) {
           toast({ title: "Cannot close", description: "OMPI must be completed first." });
           setSaving(false); return;
         }
         if (!incident.owr_fmpi_done) {
           toast({ title: "Cannot close", description: "FMPI must be completed first." });
           setSaving(false); return;
         }
         if (incident.out_of_warranty === "Yes" && incident.ca_status === "Pending") {
           toast({ title: "Cannot close", description: "CA Approval must be set (Approved or Not Approved) for OWR incidents." });
           setSaving(false); return;
         }
         await base44.entities.Incidents.update(incidentId, { status: "Closed" });
         await addAudit("Incident Closed", formData.notes ? `Closing notes: ${formData.notes}` : "Incident closed and resolved.");
       } else if (Object.keys(incidentUpdates).length > 0) {
        await base44.entities.Incidents.update(incidentId, incidentUpdates);
      }

      refreshAll();
      toast({ title: key === "close_incident" ? "Incident Closed" : `${step.label} completed` });
      onDone();
    } catch (err) {
      console.error("AdminActionModal error:", err);
      toast({ title: "Error", description: err?.message || "Something went wrong. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const isDone = isStepDone(step, incident);

  return (
    <React.Fragment>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{step.label}</span>
            {isDone && <Badge className="bg-green-100 text-green-700 border-green-200">Done</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isDone && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              ✓ This action has already been completed. You can perform it again if needed.
            </div>
          )}

          {key === "confirmation_of_receipt" && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 leading-relaxed space-y-2">
              <p>Αγαπητοί/ες,</p>
              <p>Επιβεβαιώνουμε τη λήψη της ειδοποίησής σας για το περιστατικό με Κωδικό Αναφοράς (Incident Number): <strong>{incident.incident_id}</strong>.</p>
              <p>Το περιστατικό έχει καταγραφεί και έχουν ενεργοποιηθεί οι διαδικασίες διερεύνησης.</p>
              <p>Παραμένουμε στην διάθεσή σας.<br />Με εκτίμηση,</p>
            </div>
          )}

          {key === "create_fmpi" && !incident.is_owr && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> CA Approval required for non-OWR incidents before closure.
            </div>
          )}
          {key === "create_fmpi" && incident.is_owr && (
            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> OWR incident — CA Approval required.
            </div>
          )}

          {key === "ca_status" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                The CA must review and set an approval status before the Corrective Work Order can proceed. If left pending, the corrective WO will remain locked.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CA Approval Decision *</Label>
                <div className="flex gap-3">
                  {["Approved", "Not Approved"].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set("ca_status", opt)}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        formData.ca_status === opt
                          ? opt === "Approved"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Signed Invoice (optional)
                </Label>
                <FileUploader onUpload={fd => set("ca_invoice", fd)} label={formData.ca_invoice ? formData.ca_invoice.file_name : "Upload Document"} />
              </div>
            </div>
          )}



          {key === "create_ompi" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> OMPI Document
                  {existingAttachments.length === 0 && <span className="text-red-500">*</span>}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => setShowEmbeddedForm(true)}
                >
                  <FileText className="w-3.5 h-3.5" /> Fill OMPI Form
                </Button>
              </div>
              {existingAttachments.length > 0 && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
                    <FileCheck className="w-3.5 h-3.5" /> Already uploaded
                  </p>
                  {existingAttachments.slice(0, 3).map(a => (
                    <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                      className="block text-xs text-green-700 underline truncate">{a.file_name}</a>
                  ))}
                  {existingAttachments.length > 3 && <p className="text-xs text-green-600">+{existingAttachments.length - 3} more</p>}
                </div>
              )}
              <FileUploader
                onUpload={fd => set("file", fd)}
                label={formData.file ? formData.file.file_name : existingAttachments.length > 0 ? "Upload additional (optional)" : "Upload OMPI Document"}
              />
            </div>
          )}

          {key === "create_fmpi" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachment (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => setShowEmbeddedForm(true)}
                >
                  <FileText className="w-3.5 h-3.5" /> Fill FMPI Form
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Upload FMPI Document (optional)</Label>
                <FileUploader onUpload={fd => set("file", fd)} label={formData.file ? formData.file.file_name : "Upload FMPI Document"} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Paperclip className="w-3 h-3" /> Upload Pricing Order Document (optional)</Label>
                <FileUploader onUpload={fd => set("pricing_order_file", fd)} label={formData.pricing_order_file ? formData.pricing_order_file.file_name : "Upload Pricing Order Document"} />
              </div>
            </div>
          )}

          {key !== "confirmation_of_receipt" && key !== "ca_status" && key !== "close_incident" && (
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Notes
              </Label>
              <Textarea
                placeholder="Add notes..."
                rows={2}
                value={formData.notes || ""}
                onChange={e => set("notes", e.target.value)}
                className="text-sm"
              />
            </div>
          )}

          {key === "ca_status" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Notes (optional)
                </Label>
                <Textarea
                  placeholder="Add notes..."
                  rows={2}
                  value={formData.notes || ""}
                  onChange={e => set("notes", e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs font-semibold">Confirmed By *</Label>
                {personList.length > 0 && (
                  <Select value={personList.includes(person) ? person : "__manual__"} onValueChange={v => { if (v !== "__manual__") setPerson(v); }}>
                    <SelectTrigger className="mb-1"><SelectValue placeholder="Select from list..." /></SelectTrigger>
                    <SelectContent>
                      {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      <SelectItem value="__manual__">— Manual Entry —</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input placeholder="Enter person name..." value={person} onChange={e => setPerson(e.target.value)} className="text-sm" />
              </div>
            </>
          )}

          {key !== "ca_status" && key !== "close_incident" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Out of Warranty</Label>
              <Select value={formData.out_of_warranty || ""} onValueChange={v => set("out_of_warranty", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {formData.out_of_warranty === "Yes" && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> CA Status approval will be required.
                </p>
              )}
            </div>
          )}

          {key === "close_incident" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Upload photos documenting the corrective work completed (optional).
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Photos after Fixing (optional)
                </Label>
                <FileUploader 
                  onUpload={fd => {
                    const photos = formData.photos_after || [];
                    set("photos_after", [...photos, { name: fd.file_name, url: fd.file_url }]);
                  }}
                  label="Upload Photos"
                  multiple
                />
                {formData.photos_after && formData.photos_after.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.photos_after.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img src={photo.url} alt="After fixing" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => set("photos_after", formData.photos_after.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Closing Notes
                </Label>
                <Textarea
                  placeholder="Add closing notes..."
                  rows={2}
                  value={formData.notes || ""}
                  onChange={e => set("notes", e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {key !== "ca_status" && key !== "close_incident" && <div className="space-y-1.5 border-t pt-3">
            <Label className="text-xs font-semibold">Confirmed By *</Label>
            {personList.length > 0 && (
              <Select value={personList.includes(person) ? person : "__manual__"} onValueChange={v => { if (v !== "__manual__") setPerson(v); }}>
                <SelectTrigger className="mb-1"><SelectValue placeholder="Select from list..." /></SelectTrigger>
                <SelectContent>
                  {personList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value="__manual__">— Manual Entry —</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Enter person name..." value={person} onChange={e => setPerson(e.target.value)} className="text-sm" />
          </div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className={key === "close_incident" ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}
              onClick={handleSubmit}
              disabled={saving || (key !== "close_incident" && !person.trim())}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {saving ? "Saving..." : key === "close_incident" ? "Close Incident" : "Confirm"}
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {showEmbeddedForm && (
        <Dialog open onOpenChange={() => setShowEmbeddedForm(false)}>
          <DialogContent className="max-w-5xl w-full max-h-[95vh] overflow-y-auto p-0">
            {key === "create_ompi" && (
              <OutlineManagementForm
                submission={null}
                incidents={allIncidents}
                assets={allAssets}
                workOrders={allWorkOrders}
                crews={[]}
                onClose={() => setShowEmbeddedForm(false)}
                defaultIncidentId={incidentId}
              />
            )}
            {key === "create_fmpi" && (
              <CombinedFMPIandInvoiceForm
                submission={null}
                incidents={allIncidents}
                assets={allAssets}
                workOrders={allWorkOrders}
                crews={[]}
                childAssets={allChildAssets}
                onClose={() => setShowEmbeddedForm(false)}
                defaultIncidentId={incidentId}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </React.Fragment>
  );
}

// ── Main Workflow Component ──────────────────────────────────────────────────
export default function IncidentWorkflow({ incident, incidentId, onRefresh }) {
  const [activeStep, setActiveStep] = useState(null);

  const adminDoneCount = ADMIN_STEPS.filter(s => isStepDone(s, incident)).length;

  return (
    <div className="space-y-4">
      {/* ── Administrative Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrative</p>
          <span className={`text-xs font-bold ${adminDoneCount === ADMIN_STEPS.length ? "text-green-600" : adminDoneCount >= 2 ? "text-amber-600" : "text-red-500"}`}>
            {adminDoneCount}/{ADMIN_STEPS.length} completed
          </span>
        </div>
        <div className="space-y-1.5">
          {ADMIN_STEPS.map((step, idx) => (
            <AdminStepCard
              key={step.key}
              step={step}
              stepIndex={idx}
              incident={incident}
              onOpen={setActiveStep}
            />
          ))}
        </div>
      </div>

      {/* ── Actions / Workorders Section ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actions — Work Orders</p>
        <div className="space-y-2">
          {WO_PANELS.map(panel => (
            <WorkOrderPanel
              key={panel.woType}
              woType={panel.woType}
              incident={incident}
              incidentId={incidentId}
            />
          ))}
        </div>
      </div>

      {activeStep && (
        <AdminActionModal
          step={activeStep}
          incident={incident}
          incidentId={incidentId}
          onClose={() => setActiveStep(null)}
          onDone={() => { setActiveStep(null); onRefresh(); }}
        />
      )}
    </div>
  );
}