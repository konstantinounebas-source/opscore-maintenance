import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Save, Send, Lock, Plus, Trash2, AlertTriangle,
  CheckCircle2, Upload, Image, X, Info, Euro
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

// ── Sub-components ────────────────────────────────────────────────────────────
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

function Section({ title, accent, children, rightSlot }) {
  return (
    <div className={`bg-white rounded-xl border ${accent || "border-slate-200"} overflow-hidden`}>
      <div className={`flex items-center justify-between gap-2.5 px-5 py-3.5 border-b ${accent ? "border-inherit bg-slate-50/50" : "border-slate-100 bg-slate-50/30"}`}>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h3>
        {rightSlot}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function fmtNum(n) {
  if (n == null || n === "" || isNaN(n)) return "—";
  return Number(n).toFixed(2);
}

// ── Photo upload area ─────────────────────────────────────────────────────────
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

  const remove = (idx) => {
    const copy = [...files];
    copy.splice(idx, 1);
    onChange(copy);
  };

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
        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((f, i) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name) || f.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
            return (
              <div key={i} className="relative group">
                {isImage ? (
                  <img src={f.url} alt={f.name} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 max-w-[140px]">
                    <Image className="w-3 h-3 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{f.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Empty work row ────────────────────────────────────────────────────────────
const emptyRow = () => ({
  _id: Math.random().toString(36).slice(2),
  catalog_id: "",
  qty: 1,
  unit_price: "",
  confirmed: false,
  comments: "",
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function WorkOrderFormF({ submission, incidents, assets, workOrders, crews, childAssets, onClose, defaultIncidentId }) {
  const { toast } = useToast();
  const isEditing = !!submission;

  // ── Child Catalog from Configuration ──
  const { data: childCatalog = [] } = useQuery({
    queryKey: ["childCatalog"],
    queryFn: () => base44.entities.ChildCatalog.list(),
  });
  const activeCatalog = useMemo(() => childCatalog.filter(c => c.active !== false), [childCatalog]);

  // ── Linked records ──
  const [linkedWOId,    setLinkedWOId]    = useState(submission?.work_order_id || "");
  const [linkedAssetId, setLinkedAssetId] = useState(submission?.asset_id      || "");
  const linkedIncidentId = submission?.incident_id || defaultIncidentId || "";

  // ── Work lines ──
  const [rows, setRows] = useState(() => {
    if (submission?.form_data?.rows?.length) return submission.form_data.rows;
    return [emptyRow()];
  });

  // ── Section 5 ──
  const [comments, setComments] = useState(submission?.form_data?.comments || "");

  // ── Section 6 ──
  const [sigName,     setSigName]     = useState(submission?.form_data?.sig_name     || "");
  const [sigService,  setSigService]  = useState(submission?.form_data?.sig_service  || "");
  const [sigDate,     setSigDate]     = useState(submission?.form_data?.sig_date     || "");
  const [sigUpload,   setSigUpload]   = useState(submission?.form_data?.sig_upload   || null);

  // ── Photos ──
  const [photosBefore, setPhotosBefore] = useState(submission?.form_data?.photos_before || []);
  const [photosAfter,  setPhotosAfter]  = useState(submission?.form_data?.photos_after  || []);

  // ── Derived ──
  const workOrder = useMemo(() => workOrders.find(w => w.id === linkedWOId),    [workOrders, linkedWOId]);
  const asset     = useMemo(() => assets.find(a => a.id === linkedAssetId),     [assets, linkedAssetId]);

  // Auto-fill asset from work order
  useEffect(() => {
    if (workOrder?.related_asset_id && !linkedAssetId) setLinkedAssetId(workOrder.related_asset_id);
  }, [workOrder]);

  const catalogMap = useMemo(() => Object.fromEntries(activeCatalog.map(c => [c.id, c])), [activeCatalog]);

  // ── Row helpers ──
  const updateRow = (idx, patch) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, ...patch };
      // auto-fill price on catalog item select
      if (patch.catalog_id !== undefined) {
        const item = catalogMap[patch.catalog_id];
        updated.unit_price = (item?.pricing_type === "Bundle" ? item?.bundle_price : item?.unit_price) ?? "";
      }
      return updated;
    }));
  };

  const addRow    = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  // ── Totals ──
  const rowAmounts = rows.map(r => {
    const up  = parseFloat(r.unit_price) || 0;
    const qty = parseFloat(r.qty)        || 0;
    return up * qty;
  });
  const totalCost = rowAmounts.reduce((s, v) => s + v, 0);

  // ── Signature upload ──
  const sigRef = useRef();
  const handleSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSigUpload({ name: file.name, url: file_url });
  };

  // ── Save ──
  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEditing) return base44.entities.FormSubmissions.update(submission.id, data);
      return base44.entities.FormSubmissions.create(data);
    },
    onSuccess: async (result, variables) => {
      const incId = variables.incident_id;
      if (incId) {
        const allPhotos = [
          ...(variables.form_data?.photos_before || []),
          ...(variables.form_data?.photos_after || []),
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
        if (variables.form_data?.sig_upload?.url) {
          await base44.entities.IncidentAttachments.create({
            incident_id: incId,
            file_url: variables.form_data.sig_upload.url,
            file_name: variables.form_data.sig_upload.name || "Signature",
            file_type: "Document",
            uploaded_by: null,
          });
        }

        // On Submission: create Corrective WO + update incident workflow flag
        if (variables.status === "Submitted") {
          const existingWOs = await base44.entities.WorkOrders.filter({ incident_id: incId });
          const hasCorrectiveWO = existingWOs.some(w => w.title?.includes("Corrective WO"));
          if (!hasCorrectiveWO) {
            const incidentList = await base44.entities.Incidents.filter({ id: incId });
            const inc = incidentList[0];
            const { nanoid } = await import('nanoid');
            await base44.entities.WorkOrders.create({
              work_order_id: `CORR-${nanoid(6)}`,
              incident_id: incId,
              title: `Corrective WO - ${inc?.incident_id || incId}`,
              related_asset_id: inc?.related_asset_id || variables.asset_id,
              related_asset_name: inc?.related_asset_name || "",
              status: "Open",
              priority: "Medium",
              description: `Created via Work Order Invoice form`,
              assigned_to: variables.form_data?.sig_name || "",
              due_date: variables.form_data?.sig_date || "",
            });
          }
          // Mark corrective_done on incident
          const incidentList2 = await base44.entities.Incidents.filter({ id: incId });
          if (incidentList2.length > 0) {
            await base44.entities.Incidents.update(incidentList2[0].id, { corrective_done: true });
          }
        }

        // Build full list of all uploaded files for audit trail
        const allFiles = [
          ...allPhotos,
          ...(variables.form_data?.sig_upload ? [variables.form_data.sig_upload] : []),
        ].filter(f => f?.url);

        const user = await base44.auth.me();
        await base44.entities.IncidentAuditTrail.create({
          incident_id: incId,
          action: variables.status === "Submitted" ? "Corrective WO Created" : "Form Saved",
          details: variables.status === "Submitted"
            ? `Work Order Invoice submitted & Corrective WO created${variables.form_data?.sig_name ? ` — ${variables.form_data.sig_name}` : ""}`
            : `${variables.form_name} – ${variables.status}`,
          user: user?.email,
          ...(allFiles.length > 0 ? {
            attachments: allFiles.map(f => f.url),
            attachment_names: allFiles.map(f => f.name || f.url.split("/").pop()),
          } : {}),
        });

        queryClient.invalidateQueries({ queryKey: ["workOrders", incId] });
        queryClient.invalidateQueries({ queryKey: ["incidentAudit", incId] });
        queryClient.invalidateQueries({ queryKey: ["incidentAttachments", incId] });
        queryClient.invalidateQueries({ queryKey: ["incident", incId] });
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
      }
      toast({ title: isEditing ? "Φόρμα ενημερώθηκε" : "Φόρμα αποθηκεύτηκε" });
      onClose();
    },
    onError: (err) => toast({ title: err.message || "Σφάλμα αποθήκευσης", variant: "destructive" }),
  });

  const handleSave = (status = "Draft") => {
    if (!linkedWOId)    { toast({ title: "Επιλέξτε Work Order",     variant: "destructive" }); return; }
    if (!linkedAssetId) { toast({ title: "Επιλέξτε Στάση / Asset",  variant: "destructive" }); return; }
    const hasEmptyChild = rows.some(r => !r.catalog_id);
    if (hasEmptyChild)  { toast({ title: "Επιλέξτε Child για κάθε γραμμή εργασίας", variant: "destructive" }); return; }
    const hasZeroQty = rows.some(r => !r.qty || Number(r.qty) <= 0);
    if (hasZeroQty)     { toast({ title: "Η ποσότητα πρέπει να είναι > 0",  variant: "destructive" }); return; }
    if (status === "Submitted" && photosAfter.length === 0) {
      toast({ title: "Απαιτούνται φωτογραφίες μετά την αποκατάσταση", variant: "destructive" }); return;
    }
    saveMutation.mutate({
      form_type: "work_order_form_f",
      form_name: "Work Order Invoice",
      incident_id: linkedIncidentId,
      asset_id: linkedAssetId,
      work_order_id: linkedWOId,
      status,
      total_cost: totalCost,
      submitted_at: status === "Submitted" ? new Date().toISOString() : submission?.submitted_at,
      form_data: {
        rows,
        total_cost: totalCost,
        photos_before: photosBefore,
        photos_after:  photosAfter,
        comments,
        sig_name:    sigName,
        sig_service: sigService,
        sig_date:    sigDate,
        sig_upload:  sigUpload,
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Work Order Invoice"
        subtitle={isEditing ? `Επεξεργασία – ${submission?.status}` : "Νέα Υποβολή"}
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

          {/* ── Linked records ── */}
          <div className="bg-white rounded-xl border border-indigo-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Info className="w-4 h-4" /> Σύνδεση Εγγραφών
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-600">Work Order *</Label>
                <Select value={linkedWOId || "_none"} onValueChange={v => setLinkedWOId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή Work Order..." /></SelectTrigger>
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
                <Label className="text-xs font-medium text-slate-600">Στάση / Asset *</Label>
                <Select value={linkedAssetId || "_none"} onValueChange={v => setLinkedAssetId(v === "_none" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Επιλογή Στάσης..." /></SelectTrigger>
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

          {/* ── SECTION 1: Πληροφορίες Εντολής Εργασίας ── */}
          <Section title="1. Πληροφορίες Εντολής Εργασίας">
            <ReadOnlyField label="ΑΡΙΘΜΟΣ WORK ORDER" value={workOrder?.work_order_id} />
          </Section>

          {/* ── SECTION 2: Πληροφορίες για Στάση ── */}
          <Section title="2. Πληροφορίες για Στάση">
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="ΚΩΔΙΚΟΣ ΣΤΑΣΗΣ"     value={asset?.asset_id || asset?.active_shelter_id} />
              <ReadOnlyField label="ΟΝΟΜΑΣΙΑ ΣΤΑΣΗΣ"    value={asset?.active_shelter_id || asset?.asset_id} />
              <ReadOnlyField label="ΠΟΛΗ"               value={asset?.city} />
              <ReadOnlyField label="ΔΗΜΟΣ/ΚΟΙΝΟΤΗΤΑ"   value={asset?.municipality} />
              <div className="col-span-2">
                <ReadOnlyField label="Διεύθυνση"        value={asset?.location_address} />
              </div>
            </div>
          </Section>

          {/* ── SECTION 3: Περιγραφή Εργασιών ── */}
          <Section
            title="3. Περιγραφή Εργασιών βάσει Συμβολαίου"
            accent="border-slate-200"
            rightSlot={
              <Button size="sm" variant="outline" onClick={addRow} className="gap-1.5 text-xs h-7">
                <Plus className="w-3.5 h-3.5" /> Προσθήκη Γραμμής
              </Button>
            }
          >
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left font-semibold rounded-tl-md" style={{ minWidth: 200 }}>Περιγραφή Εργασίας / Child</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 100 }}>Ποσότητα που Τοποθετήθηκε</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 150 }}>Ανάλυση Τιμής Μονάδας χωρίς ΦΠΑ (€)</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 120 }}>Ποσό χωρίς ΦΠΑ (€)</th>
                    <th className="px-3 py-2 text-center font-semibold" style={{ minWidth: 80 }}>Επιβεβαίωση (√)</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ minWidth: 140 }}>Σχόλια</th>
                    <th className="px-2 py-2 rounded-tr-md" style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => {
                    const catalogItem = catalogMap[row.catalog_id];
                    const amount = (parseFloat(row.unit_price) || 0) * (parseFloat(row.qty) || 0);
                    return (
                      <tr
                        key={row._id}
                        className={`text-sm transition-colors ${row.confirmed ? "bg-emerald-50/40" : "bg-white hover:bg-slate-50/60"}`}
                      >
                        {/* Catalog item select */}
                        <td className="px-2 py-1.5">
                          <Select value={row.catalog_id || "_none"} onValueChange={v => updateRow(idx, { catalog_id: v === "_none" ? "" : v })}>
                            <SelectTrigger className={`text-xs h-8 ${!row.catalog_id ? "border-amber-300" : ""}`}>
                              <SelectValue placeholder="Επιλογή..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">— Επιλογή —</SelectItem>
                              {activeCatalog.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  <span className="font-mono text-xs mr-1">{c.child_code}</span>
                                  {c.display_name || c.child_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {catalogItem?.child_category && (
                            <p className="text-xs text-slate-400 mt-0.5 pl-1 truncate">{catalogItem.child_category}</p>
                          )}
                        </td>
                        {/* Quantity */}
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.qty}
                            onChange={e => updateRow(idx, { qty: e.target.value })}
                            className="text-xs h-8 text-center"
                          />
                        </td>
                        {/* Unit price (read-only) */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-center gap-1 h-8 px-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                            <Lock className="w-3 h-3 text-slate-300" />
                            <span>{row.unit_price !== "" ? fmtNum(row.unit_price) : <span className="text-slate-300 italic">—</span>}</span>
                          </div>
                        </td>
                        {/* Line amount (read-only) */}
                        <td className="px-2 py-1.5">
                          <div className="flex items-center justify-center gap-1 h-8 px-2 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
                            <Lock className="w-3 h-3 text-blue-300" />
                            <span>{fmtNum(amount)}</span>
                          </div>
                        </td>
                        {/* Confirmation checkbox */}
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={!!row.confirmed}
                              onCheckedChange={v => updateRow(idx, { confirmed: !!v })}
                            />
                          </div>
                        </td>
                        {/* Comments */}
                        <td className="px-2 py-1.5">
                          <Input
                            value={row.comments}
                            onChange={e => updateRow(idx, { comments: e.target.value })}
                            placeholder="Σχόλια..."
                            className="text-xs h-8"
                          />
                        </td>
                        {/* Delete */}
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length === 1}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total cost */}
            <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
              <div className="bg-indigo-600 text-white rounded-xl px-6 py-3 flex items-center gap-3 shadow-sm">
                <Euro className="w-5 h-5 text-indigo-200" />
                <div>
                  <p className="text-xs text-indigo-200 font-medium uppercase tracking-wide">ΚΟΣΤΟΣ ΕΡΓΑΣΙΩΝ €</p>
                  <p className="text-2xl font-bold tabular-nums">{totalCost.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── SECTION 4: Φωτογραφικά Αποδεικτικά ── */}
          <Section title="4. Φωτογραφικά Αποδεικτικά">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PhotoUploadArea
                label="ΦΩΤΟΓΡΑΦΙΑ ΑΠΟ ΠΡΟΗΓΟΥΜΕΝΗ ΚΑΤΑΣΤΑΣΗ – 1Η ΕΠΙΘΕΩΡΗΣΗ"
                files={photosBefore}
                onChange={setPhotosBefore}
                required={false}
              />
              <PhotoUploadArea
                label="ΦΩΤΟΓΡΑΦΙΕΣ ΜΕΤΑ ΤΗΝ ΑΠΟΚΑΤΑΣΤΑΣΗ"
                files={photosAfter}
                onChange={setPhotosAfter}
                required={true}
              />
            </div>
          </Section>

          {/* ── SECTION 5: Σχόλια / Παρατηρήσεις ── */}
          <Section title="5. Σχόλια / Παρατηρήσεις">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                ΣΧΟΛΙΑ-ΠΑΡΑΤΗΡΗΣΕΙΣ ΑΠΟ ΕΠΙΤΡΟΠΗ ΠΑΡΑΛΑΒΗΣ
              </Label>
              <Textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Σχόλια / παρατηρήσεις..."
                rows={4}
                className="text-sm mt-1"
              />
            </div>
          </Section>

          {/* ── SECTION 6: Παραλαβή / Υπογραφή ── */}
          <Section title="6. Παραλαβή / Υπογραφή">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</Label>
                <Input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Ονοματεπώνυμο..." className="text-sm mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΥΠΗΡΕΣΙΑ-ΘΕΣΗ</Label>
                <Input value={sigService} onChange={e => setSigService(e.target.value)} placeholder="Υπηρεσία / Θέση..." className="text-sm mt-1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΗΜΕΡ. ΠΑΡΑΛΑΒΗΣ</Label>
                <Input type="date" value={sigDate} onChange={e => setSigDate(e.target.value)} className="text-sm mt-1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  ΕΚΠΡΟΣΩΠΟΣ ΑΝΑΘΕΤΟΥΣΑΣ ΑΡΧΗΣ ΥΠΟΓΡΑΦΗ
                </Label>
                {sigUpload ? (
                  <div className="relative inline-block group">
                    <img src={sigUpload.url} alt="Υπογραφή" className="h-16 border border-slate-200 rounded-lg object-contain bg-white px-2" />
                    <button type="button" onClick={() => setSigUpload(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => sigRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5" /> Μεταφόρτωση Υπογραφής
                    </Button>
                    <input ref={sigRef} type="file" accept="image/*" className="hidden" onChange={handleSigUpload} />
                  </div>
                )}
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
            <Button onClick={() => { handleSave("Submitted"); onClose(); }} disabled={saveMutation.isPending}
              className="bg-red-600 hover:bg-red-700 gap-1.5">
              <Send className="w-4 h-4" /> Υποβολή & Κλείσιμο Incident
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}