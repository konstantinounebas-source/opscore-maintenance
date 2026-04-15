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
import ConfirmCloseDialog from "@/components/shared/ConfirmCloseDialog";
import { Trash2, Upload, Loader2, Paperclip, Plus, ChevronDown } from "lucide-react";
import AssetChildrenSection from "@/components/assets/AssetChildrenSection";

const CONTRACT_BASE_YEAR = 2023;

function calcWarrantyEnd(baseYear, years, deliveryDate) {
  if (!baseYear) return "";
  const targetYear = Number(baseYear) + years;
  // Use the delivery date's month if available, otherwise default to December (month 12)
  let month = 12;
  if (deliveryDate) {
    const d = new Date(deliveryDate);
    month = d.getMonth() + 1; // 1-based
  }
  // Day 0 of (month+1) = last day of month
  const lastDay = new Date(targetYear, month, 0);
  return lastDay.toISOString().split("T")[0];
}

function SectionHeader({ title, color = "slate" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide ${colors[color]}`}>
      {title}
    </div>
  );
}

// Per-type file uploader with drag-and-drop
function DocTypeUploader({ label, files = [], onAdd, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onAdd({
      file_url,
      file_name: file.name,
      file_size: `${(file.size / 1024).toFixed(1)} KB`,
      file_type: file.type.startsWith("image/") ? "Photo" : "Document",
      doc_label: label,
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    await upload(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    await upload(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-1">
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700 px-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Add File
          </Button>
        </div>
      </div>
      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg px-3 py-2 text-center text-xs transition-colors cursor-pointer ${dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <span className="text-slate-500 flex items-center justify-center gap-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
          </span>
        ) : (
          <span className="text-slate-400">Drop file here or click to browse</span>
        )}
      </div>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 truncate">{f.file_name}</span>
                <span className="text-xs text-slate-400">{f.file_size}</span>
              </div>
              <Button
                type="button" variant="ghost" size="sm"
                className="ml-1 p-1 h-auto text-red-400 hover:text-red-600"
                onClick={() => onRemove(i)}
              >
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
  asset_id: "", asset_name: "", active_shelter_id: "", location_address: "",
  city: "", municipality: "", shelter_type: "", category: "", status: "Active",
  installation_date: "", delivery_date: "",
  warranty_base_year: "", software_warranty_end_date: "",
  electronics_warranty_end_date: "", materials_warranty_end_date: "",
  structural_warranty_end_date: "", preventive_inspection_date: "",
  next_inspection_date: "", notes: "",
  latitude: "", longitude: "",
  evidence_types: [], description: "",
  attachments: []
};

// Group attachments by doc_label for display
function groupByLabel(attachments) {
  const map = {};
  for (const f of attachments) {
    const key = f.doc_label || "Other";
    if (!map[key]) map[key] = [];
    map[key].push(f);
  }
  return map;
}

export default function AssetFormDialog({ open, onOpenChange, asset, onSave }) {
  const cities = useConfigLists("Asset Cities");
  const municipalities = useConfigLists("Municipalities");
  const shelterTypes = useConfigLists("Asset Shelter Types");
  const statuses = useConfigLists("Asset Status");
  const categories = useConfigLists("Asset Categories");
  const evidenceOptions = useConfigLists("Asset Evidence Types");

  const defaultDocTypes = ["Installation Photos", "Delivery Note", "Signed Install Form", "Handover Form", "Warranty Document", "Other"];
  const docTypes = evidenceOptions.length ? evidenceOptions : defaultDocTypes;

  const { data: allAssets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: existingChildAssets = [] } = useQuery({
    queryKey: ["childAssets", asset?.id],
    queryFn: () => base44.entities.ChildAssets.filter({ parent_asset_id: asset.id }),
    enabled: !!asset?.id,
  });

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [childComponents, setChildComponents] = useState([]);
  const [showChildTemplate, setShowChildTemplate] = useState(false);

  useEffect(() => {
    if (asset) {
      setForm({
        ...emptyForm,
        ...asset,
        latitude: asset.latitude ?? "",
        longitude: asset.longitude ?? "",
        evidence_types: asset.evidence_types || [],
        attachments: asset.attachments || [],
      });
    } else {
      setForm(emptyForm);
      setShowChildTemplate(false);
    }
    setErrors({});
  }, [asset, open]);

  // Auto-fill warranty_base_year from delivery_date (+1 year)
  useEffect(() => {
    if (!form.delivery_date) return;
    const yr = new Date(form.delivery_date).getFullYear() + 1;
    if (yr >= 2000 && yr <= 2100) {
      setForm(f => ({ ...f, warranty_base_year: yr }));
    }
  }, [form.delivery_date]);

  // Auto-calculate warranty end dates from warranty_base_year
  useEffect(() => {
    const yr = parseInt(form.warranty_base_year);
    if (!yr || yr < 2000 || yr > 2100) return;
    setForm(f => ({
      ...f,
      software_warranty_end_date: calcWarrantyEnd(yr, 3, f.delivery_date),
      electronics_warranty_end_date: calcWarrantyEnd(yr, 5, f.delivery_date),
      materials_warranty_end_date: calcWarrantyEnd(yr, 10, f.delivery_date),
      structural_warranty_end_date: calcWarrantyEnd(yr, 15, f.delivery_date),
    }));
  }, [form.warranty_base_year]);

  // Auto-calculate preventive_inspection_date (1/1/2029) and next_inspection_date (1/1/2030)
  useEffect(() => {
    setForm(f => ({ ...f, preventive_inspection_date: "2029-01-01", next_inspection_date: "2030-01-01" }));
  }, [open]);

  // Auto-fill fields when Active Shelter ID matches an existing asset
  useEffect(() => {
    if (!form.active_shelter_id || allAssets.length === 0) return;
    const match = allAssets.find(
      a => (a.active_shelter_id === form.active_shelter_id || a.asset_id === form.active_shelter_id)
        && a.id !== asset?.id
    );
    if (match) {
      setForm(f => ({
        ...f,
        location_address: match.location_address || f.location_address,
        shelter_type: match.shelter_type || f.shelter_type,
        status: match.status || f.status,
        latitude: match.latitude ?? f.latitude,
        longitude: match.longitude ?? f.longitude,
        city: match.city || f.city,
        municipality: match.municipality || f.municipality,
      }));
    }
  }, [form.active_shelter_id, allAssets.length]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Per-label attachment handlers
  const handleAddFile = (fileData) => {
    setForm(f => ({ ...f, attachments: [...(f.attachments || []), fileData] }));
  };

  const handleRemoveFile = (idx) => {
    setForm(f => ({ ...f, attachments: (f.attachments || []).filter((_, i) => i !== idx) }));
  };

  const getFilesForLabel = (label) => {
    const allAtts = form.attachments || [];
    return allAtts.filter(f => (f.doc_label || "Other") === label);
  };

  const globalIndexForLabelFile = (label, localIdx) => {
    const allAtts = form.attachments || [];
    let count = 0;
    for (let i = 0; i < allAtts.length; i++) {
      const lbl = allAtts[i].doc_label || "Other";
      if (lbl === label) {
        if (count === localIdx) return i;
        count++;
      }
    }
    return -1;
  };

  const validate = () => {
    const e = {};
    if (!form.active_shelter_id?.trim()) e.active_shelter_id = true;
    if (!form.city) e.city = true;
    if (!form.status) e.status = true;
    if (!form.shelter_type) e.shelter_type = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const err = (key) => errors[key] ? "border-red-400 focus-visible:ring-red-400" : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (!payload.asset_id) payload.asset_id = payload.active_shelter_id || `AST-${Date.now()}`;
    if (!payload.asset_name) payload.asset_name = payload.active_shelter_id || payload.asset_id;
    if (payload.latitude !== "") payload.latitude = parseFloat(payload.latitude);
    else delete payload.latitude;
    if (payload.longitude !== "") payload.longitude = parseFloat(payload.longitude);
    else delete payload.longitude;
    if (payload.warranty_base_year !== "") payload.warranty_base_year = parseInt(payload.warranty_base_year);
    else delete payload.warranty_base_year;
    delete payload.delivery_year;

    const attachments = payload.attachments || [];
    delete payload.attachments;
    onSave(payload, attachments, childComponents);
    onOpenChange(false);
  };

  return (
    <>
      <ConfirmCloseDialog
        open={confirmClose}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => { setConfirmClose(false); onOpenChange(false); }}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => { e.preventDefault(); setConfirmClose(true); }}>
          <DialogHeader>
            <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-2">

            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
                Please fill in all required fields marked with <span className="font-bold">*</span>
              </div>
            )}

            {/* ── CORE INFORMATION ── */}
            <SectionHeader title="Core Information" color="slate" />
            <input type="hidden" value={form.asset_id} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Active Shelter ID <span className="text-red-500">*</span></Label>
                <Input className={err("active_shelter_id")} value={form.active_shelter_id} onChange={e => set("active_shelter_id", e.target.value)} placeholder="e.g. SH-001" />
                {errors.active_shelter_id && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shelter Type <span className="text-red-500">*</span></Label>
                <Select value={form.shelter_type} onValueChange={v => set("shelter_type", v)}>
                  <SelectTrigger className={err("shelter_type")}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(shelterTypes.length ? shelterTypes : ["Standard Shelter", "Smart Shelter", "Solar Shelter"]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.shelter_type && <p className="text-xs text-red-500">Required</p>}
              </div>
            </div>

            {/* ── CHILD COMPONENTS ── only shown for new assets when shelter type is selected */}
            {form.shelter_type && !asset && (
              !showChildTemplate ? (
                <button
                  type="button"
                  onClick={() => setShowChildTemplate(true)}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-dashed border-indigo-300 rounded-lg px-4 py-2.5 w-full hover:bg-indigo-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Child Components from Type Template
                </button>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Child Components (from Type Template)" color="amber" />
                    <button type="button" onClick={() => setShowChildTemplate(false)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <ChevronDown className="w-3.5 h-3.5" /> Hide
                    </button>
                  </div>
                  <AssetChildrenSection
                    shelterType={form.shelter_type}
                    deliveryDate={form.delivery_date}
                    onChange={setChildComponents}
                    existingChildren={[]}
                  />
                </>
              )
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Status <span className="text-red-500">*</span></Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className={err("status")}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(statuses.length ? statuses : ["Active", "Inactive", "Under Maintenance", "Decommissioned"]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-500">Required</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Location/Address</Label>
                <Input value={form.location_address} onChange={e => set("location_address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City <span className="text-red-500">*</span></Label>
                <Select value={form.city} onValueChange={v => set("city", v)}>
                  <SelectTrigger className={err("city")}><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(cities.length ? cities : ["Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"]).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && <p className="text-xs text-red-500">Required</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Δήμος</Label>
                <Select value={form.municipality || ""} onValueChange={v => set("municipality", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
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

            {/* ── MANUAL INPUTS ── */}
            <SectionHeader title="Manual Inputs" color="blue" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Installation Date</Label>
                <Input type="date" value={form.installation_date} onChange={e => set("installation_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Delivery Date</Label>
                <Input type="date" value={form.delivery_date} onChange={e => set("delivery_date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
            </div>

            {/* ── MAINTENANCE & WARRANTY ── */}
            <SectionHeader title="Maintenance & Warranty" color="green" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Warranty Base Year <span className="text-slate-400 font-normal">(auto from delivery date +1)</span></Label>
                <Input
                  type="number"
                  value={form.warranty_base_year}
                  onChange={e => set("warranty_base_year", e.target.value)}
                  placeholder="e.g. 2024"
                  min="2000" max="2100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preventive Inspection (6 years after 2023 contract)</Label>
                <Input type="date" value={form.preventive_inspection_date} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Inspection <span className="text-slate-400 font-normal">(auto: 1 year after preventive inspection)</span></Label>
              <Input type="date" value={form.next_inspection_date} readOnly className="bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>

            {/* Warranty dates — auto-filled, but still editable */}
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-green-700">Auto-calculated Warranty End Dates (from Warranty Base Year)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Software (3 Years)</Label>
                  <Input type="date" value={form.software_warranty_end_date} onChange={e => set("software_warranty_end_date", e.target.value)} className="bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Refurbish &amp; Electronics (5 Years)</Label>
                  <Input type="date" value={form.electronics_warranty_end_date} onChange={e => set("electronics_warranty_end_date", e.target.value)} className="bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Acrylic/Plastics/Seals/Paint (10 Years)</Label>
                  <Input type="date" value={form.materials_warranty_end_date} onChange={e => set("materials_warranty_end_date", e.target.value)} className="bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Metal/Glass/Solar/Electrical (15 Years)</Label>
                  <Input type="date" value={form.structural_warranty_end_date} onChange={e => set("structural_warranty_end_date", e.target.value)} className="bg-white" />
                </div>
              </div>
            </div>

            {/* ── ATTACHED DOCUMENTS ── */}
            <SectionHeader title="Attached Documents and Photos" color="rose" />
            <div className="space-y-3">
              {docTypes.map(label => (
                <DocTypeUploader
                  key={label}
                  label={label}
                  files={getFilesForLabel(label)}
                  onAdd={handleAddFile}
                  onRemove={(localIdx) => {
                    const globalIdx = globalIndexForLabelFile(label, localIdx);
                    if (globalIdx >= 0) handleRemoveFile(globalIdx);
                  }}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmClose(true)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{asset ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}