import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfigLists } from "@/components/shared/useConfigLists";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Upload, Loader2, Paperclip, Plus, ChevronDown } from "lucide-react";
import AssetChildrenSection from "@/components/assets/AssetChildrenSection";

function calcWarrantyEnd(baseYear, years) {
  if (!baseYear) return "";
  return `${Number(baseYear) + years}-12-31`;
}

function SectionHeader({ title, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <div className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide ${colors[color] || colors.slate}`}>
      {title}
    </div>
  );
}

function DocTypeUploader({ label, files = [], onAdd, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFiles = async (fileList) => {
    if (!fileList) return;
    setUploading(true);
    const uploads = Array.from(fileList).map(file =>
      base44.integrations.Core.UploadFile({ file }).then(({ file_url }) => {
        const isImage = file.type.startsWith("image/");
        onAdd({ file_url, file_name: file.name, file_size: `${(file.size / 1024).toFixed(1)} KB`, file_type: isImage ? "Photo" : "Document", doc_label: label, preview: isImage ? file_url : null });
      })
    );
    await Promise.all(uploads);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-1">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700 px-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Add Files
          </Button>
        </div>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => { e.preventDefault(); setDragging(false); await handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg px-3 py-2 text-center text-xs transition-colors cursor-pointer ${dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
        onClick={() => fileRef.current?.click()}
      >
        {uploading
          ? <span className="text-slate-500 flex items-center justify-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</span>
          : <span className="text-slate-400">Drop files here or click to browse</span>
        }
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 bg-white rounded border border-slate-200">
              {f.preview ? <img src={f.preview} alt="preview" className="h-12 w-12 object-cover rounded flex-shrink-0" /> : <Paperclip className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 truncate font-medium">{f.file_name}</p>
                <p className="text-xs text-slate-400">{f.file_size}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="ml-1 p-1 h-auto text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => onRemove(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  // Identity
  asset_code: "",
  asset_name: "",
  status: "Active",
  // Location
  location_address: "",
  city: "",
  municipality: "",
  latitude: "",
  longitude: "",
  // Shelter / Physical
  ordered_shelter_type: "",
  installed_shelter_type: "",
  // Condition
  existing_condition: "",
  has_bay: "",
  // Dates / Lifecycle
  order_year: "",
  installation_date: "",
  delivery_date: "",
  // Warranty / Inspection
  warranty_base_year: "",
  software_warranty_end_date: "",
  electronics_warranty_end_date: "",
  materials_warranty_end_date: "",
  structural_warranty_end_date: "",
  preventive_inspection_date: "2029-01-01",
  next_inspection_date: "2030-01-01",
  // Notes
  notes: "",
  // Attachments (transient)
  attachments: [],
};

/**
 * Unified Asset Create / Edit form.
 * Props:
 *   open, onOpenChange, onSave(formData, attachments, childComponents)
 *   asset — pass to pre-fill for editing; omit for create
 */
export default function AssetFormUnified({ open, onOpenChange, onSave, asset }) {
  const isEdit = !!asset;
  const [form, setForm] = useState({ ...emptyForm });
  const [errors, setErrors] = useState({});
  const [childComponents, setChildComponents] = useState([]);
  const [showChildTemplate, setShowChildTemplate] = useState(false);

  const cities = useConfigLists("Asset Cities");
  const municipalities = useConfigLists("Municipalities");
  const shelterTypes = useConfigLists("Asset Shelter Types");
  const statuses = useConfigLists("Asset Status");
  const evidenceOptions = useConfigLists("Asset Evidence Types");
  const phases = useConfigLists("Asset Phase");
  const inspectionStatuses = useConfigLists("Asset Inspection Status");
  const defaultDocTypes = ["Installation Photos", "Delivery Note", "Signed Install Form", "Handover Form", "Warranty Document", "Other"];
  const docTypes = evidenceOptions.length ? evidenceOptions : defaultDocTypes;

  const { data: allAssets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });

  // Reset / populate form
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setChildComponents([]);
    setShowChildTemplate(false);
    if (isEdit && asset) {
      setForm({
        ...emptyForm,
        ...asset,
        attachments: [],
      });
    } else {
      setForm({ ...emptyForm });
    }
  }, [open, asset]);

  // Auto-fill warranty_base_year from delivery_date
  useEffect(() => {
    if (!form.delivery_date) return;
    const yr = new Date(form.delivery_date).getFullYear() + 1;
    if (yr >= 2000 && yr <= 2100) setForm(f => ({ ...f, warranty_base_year: yr }));
  }, [form.delivery_date]);

  // Auto-calculate warranty end dates
  useEffect(() => {
    const yr = parseInt(form.warranty_base_year);
    if (!yr || yr < 2000 || yr > 2100) return;
    setForm(f => ({
      ...f,
      software_warranty_end_date: calcWarrantyEnd(yr, 3),
      electronics_warranty_end_date: calcWarrantyEnd(yr, 5),
      materials_warranty_end_date: calcWarrantyEnd(yr, 10),
      structural_warranty_end_date: calcWarrantyEnd(yr, 15),
    }));
  }, [form.warranty_base_year]);



  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleAddFile = (fileData) => setForm(f => ({ ...f, attachments: [...(f.attachments || []), fileData] }));
  const handleRemoveFile = (idx) => setForm(f => ({ ...f, attachments: (f.attachments || []).filter((_, i) => i !== idx) }));
  const getFilesForLabel = (label) => (form.attachments || []).filter(f => (f.doc_label || "Other") === label);
  const globalIndexForLabelFile = (label, localIdx) => {
    const allAtts = form.attachments || [];
    let count = 0;
    for (let i = 0; i < allAtts.length; i++) {
      if ((allAtts[i].doc_label || "Other") === label) { if (count === localIdx) return i; count++; }
    }
    return -1;
  };

  const validate = () => {
    const e = {};
    if (!form.asset_id?.trim()) e.asset_id = true;
    if (!form.city) e.city = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const err = (key) => errors[key] ? "border-red-400 focus-visible:ring-red-400" : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = { ...form };
    const attachments = payload.attachments || [];
    delete payload.attachments;

    // Normalise numeric fields
    if (payload.latitude !== "" && payload.latitude != null) payload.latitude = parseFloat(payload.latitude); else delete payload.latitude;
    if (payload.longitude !== "" && payload.longitude != null) payload.longitude = parseFloat(payload.longitude); else delete payload.longitude;
    if (payload.warranty_base_year !== "" && payload.warranty_base_year != null) payload.warranty_base_year = parseInt(payload.warranty_base_year); else delete payload.warranty_base_year;
    if (payload.order_year !== "" && payload.order_year != null) payload.order_year = parseInt(payload.order_year); else delete payload.order_year;

    // Ensure canonical identifiers are consistent
    if (!payload.asset_id) payload.asset_id = `AST-${Date.now()}`;
    if (!payload.asset_name) payload.asset_name = payload.asset_id;

    onSave(payload, attachments, childComponents);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
              Please fill in all required fields marked with <span className="font-bold">*</span>
            </div>
          )}

          {/* ── 1. Asset Identity ── */}
          <SectionHeader title="Asset Identity" color="indigo" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Shelter ID</Label>
              <Input value={form.asset_id || ""} readOnly className="bg-slate-100 text-slate-600" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status || ""} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(statuses.length ? statuses : ["Active", "Inactive", "Under Maintenance", "Decommissioned"]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phase</Label>
              <Select value={form.phase || ""} onValueChange={v => set("phase", v)}>
                <SelectTrigger><SelectValue placeholder="Select (optional)" /></SelectTrigger>
                <SelectContent>
                  {phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── 2. Location ── */}
          <SectionHeader title="Location" color="blue" />
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={form.location_address} onChange={e => set("location_address", e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">City <span className="text-red-500">*</span></Label>
              <Select value={form.city} onValueChange={v => set("city", v)}>
                <SelectTrigger className={err("city")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(cities.length ? cities : ["Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.city && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Municipality</Label>
              <Select value={form.municipality || ""} onValueChange={v => set("municipality", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Coordinates (Latitude / Longitude)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" step="any" value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="Latitude e.g. 35.1234" />
              <Input type="number" step="any" value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="Longitude e.g. 33.3823" />
            </div>
          </div>

          {/* ── 3. Shelter / Physical Details ── */}
          <SectionHeader title="Shelter / Physical Details" color="slate" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Ordered Shelter Type</Label>
              <Select value={form.ordered_shelter_type || ""} onValueChange={v => set("ordered_shelter_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {shelterTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Installed Shelter Type</Label>
              <Select value={form.installed_shelter_type || ""} onValueChange={v => set("installed_shelter_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {shelterTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>



          {/* ── 4. Condition / Existing Site Details ── */}
          <SectionHeader title="Condition / Existing Site" color="amber" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Existing Condition</Label>
              <Select value={form.existing_condition || ""} onValueChange={v => set("existing_condition", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sign_only">Sign Only</SelectItem>
                  <SelectItem value="shelter_only">Shelter Only</SelectItem>
                  <SelectItem value="sign_and_shelter">Sign &amp; Shelter</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Has Bay</Label>
              <Select value={form.has_bay || ""} onValueChange={v => set("has_bay", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── 5. Dates / Lifecycle ── */}
          <SectionHeader title="Dates / Lifecycle" color="blue" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Installation Date</Label>
              <Input type="date" value={form.installation_date || ""} onChange={e => set("installation_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Date</Label>
              <Input type="date" value={form.delivery_date || ""} onChange={e => set("delivery_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Order Year</Label>
              <Input type="number" value={form.order_year || ""} onChange={e => set("order_year", e.target.value)} placeholder="e.g. 2024" min="2000" max="2100" />
            </div>
          </div>

          {/* ── 6. Warranty / Inspection ── */}
          <SectionHeader title="Warranty / Inspection" color="green" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Warranty Base Year <span className="text-slate-400 font-normal">(auto from delivery date +1)</span></Label>
              <Input type="number" value={form.warranty_base_year || ""} onChange={e => set("warranty_base_year", e.target.value)} placeholder="e.g. 2024" min="2000" max="2100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Preventive Inspection Date</Label>
              <Input type="date" value={form.preventive_inspection_date || ""} onChange={e => set("preventive_inspection_date", e.target.value)} className="bg-slate-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Inspection Date</Label>
              <Input type="date" value={form.next_inspection_date || ""} onChange={e => set("next_inspection_date", e.target.value)} className="bg-slate-50" />
            </div>
          </div>
          <div className="p-3 bg-green-50 border border-green-100 rounded-lg space-y-3">
            <p className="text-xs font-semibold text-green-700">Warranty End Dates (auto-calculated from base year)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Software (3 Years)</Label><Input type="date" value={form.software_warranty_end_date || ""} onChange={e => set("software_warranty_end_date", e.target.value)} className="bg-white" /></div>
              <div className="space-y-1"><Label className="text-xs">Electronics (5 Years)</Label><Input type="date" value={form.electronics_warranty_end_date || ""} onChange={e => set("electronics_warranty_end_date", e.target.value)} className="bg-white" /></div>
              <div className="space-y-1"><Label className="text-xs">Materials (10 Years)</Label><Input type="date" value={form.materials_warranty_end_date || ""} onChange={e => set("materials_warranty_end_date", e.target.value)} className="bg-white" /></div>
              <div className="space-y-1"><Label className="text-xs">Structural (15 Years)</Label><Input type="date" value={form.structural_warranty_end_date || ""} onChange={e => set("structural_warranty_end_date", e.target.value)} className="bg-white" /></div>
            </div>
          </div>

          {/* ── 7. Notes ── */}
          <SectionHeader title="Notes" color="slate" />
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>

          {/* ── 8. Attachments / Documents ── */}
          <SectionHeader title="Attachments / Documents" color="rose" />
          <div className="space-y-3">
            {docTypes.map(label => (
              <DocTypeUploader
                key={label}
                label={label}
                files={getFilesForLabel(label)}
                onAdd={handleAddFile}
                onRemove={(localIdx) => { const gi = globalIndexForLabelFile(label, localIdx); if (gi >= 0) handleRemoveFile(gi); }}
              />
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {isEdit ? "Save Changes" : "Create Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}