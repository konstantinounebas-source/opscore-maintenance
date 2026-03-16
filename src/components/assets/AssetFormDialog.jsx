import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfigLists } from "@/components/shared/useConfigLists";
import FileUploader from "@/components/shared/FileUploader";

const SectionTitle = ({ children }) => (
  <div className="col-span-2 border-b pb-1 mb-1 mt-2">
    <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">{children}</h3>
  </div>
);

const Field = ({ label, required, children, colSpan = 1, hint }) => (
  <div className={`space-y-1.5 ${colSpan === 2 ? "col-span-2" : ""}`}>
    <Label className="text-xs font-medium text-slate-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

const computeWarrantyDates = (deliveryYear) => {
  if (!deliveryYear) return {};
  const y = parseInt(deliveryYear);
  if (isNaN(y)) return {};
  const fmt = (yr, mo, dy) => {
    const d = new Date(yr, mo - 1, dy);
    return d.toISOString().split("T")[0];
  };
  return {
    warranty_base_year: y,
    software_warranty_end_date: fmt(y + 3, 12, 31),
    electronics_warranty_end_date: fmt(y + 5, 12, 31),
    materials_warranty_end_date: fmt(y + 10, 12, 31),
    structural_warranty_end_date: fmt(y + 15, 12, 31),
    preventive_inspection_date: fmt(2023 + 6, 1, 1), // 6 years after 2023 contract = 2029-01-01
    next_inspection_date: fmt(2023 + 6, 1, 1),
  };
};

const emptyForm = () => ({
  asset_id: "", asset_name: "",
  active_shelter_id: "", location_address: "", city: "", shelter_type: "",
  status: "Active",
  installation_date: "", delivery_date: "", delivery_year: "",
  warranty_base_year: "",
  software_warranty_end_date: "", electronics_warranty_end_date: "",
  materials_warranty_end_date: "", structural_warranty_end_date: "",
  preventive_inspection_date: "", next_inspection_date: "",
  evidence_type: [], attachment_files: [],
  notes: "", latitude: "", longitude: "",
  description: "",
});

export default function AssetFormDialog({ open, onOpenChange, asset, onSave }) {
  const cities = useConfigLists("Asset Cities");
  const shelterTypes = useConfigLists("Asset Shelter Types");
  const statuses = useConfigLists("Asset Status");
  const evidenceTypes = useConfigLists("Asset Evidence Types");

  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (asset) {
      setForm({ ...emptyForm(), ...asset });
    } else {
      setForm(emptyForm());
    }
  }, [asset, open]);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleDeliveryYearChange = (val) => {
    const computed = computeWarrantyDates(val);
    setForm(f => ({ ...f, delivery_year: val, ...computed }));
  };

  const toggleEvidenceType = (val) => {
    setForm(f => ({
      ...f,
      evidence_type: f.evidence_type.includes(val)
        ? f.evidence_type.filter(v => v !== val)
        : [...f.evidence_type, val],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {asset ? "Edit Asset" : "Add New Asset"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* ── HARD Fields ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>1. Identification</SectionTitle>

            <Field label="Asset ID" required>
              <Input value={form.asset_id} onChange={e => set("asset_id", e.target.value)} required disabled={!!asset} placeholder="e.g. AST-006" />
            </Field>
            <Field label="Asset Name" required>
              <Input value={form.asset_name} onChange={e => set("asset_name", e.target.value)} required />
            </Field>

            <Field label="Active Shelter ID" required>
              <Input value={form.active_shelter_id} onChange={e => set("active_shelter_id", e.target.value)} placeholder="e.g. SH-001" />
            </Field>
            <Field label="Shelter Type">
              <Select value={form.shelter_type} onValueChange={v => set("shelter_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>{shelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Location / Address" colSpan={2}>
              <Input value={form.location_address} onChange={e => set("location_address", e.target.value)} placeholder="Full address..." />
            </Field>

            <Field label="City">
              <Select value={form.city} onValueChange={v => set("city", v)}>
                <SelectTrigger><SelectValue placeholder="Select city..." /></SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(statuses.length ? statuses : ["Active","Under Maintenance","Inactive","Transferred","Replaced","Retired"]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Latitude" hint="Decimal format, e.g. 35.1856">
              <Input type="number" step="any" value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="35.1856" />
            </Field>
            <Field label="Longitude" hint="Decimal format, e.g. 33.3823">
              <Input type="number" step="any" value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="33.3823" />
            </Field>
          </div>

          {/* ── Manual Inputs ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>2. Manual Inputs</SectionTitle>

            <Field label="Installation Date">
              <Input type="date" value={form.installation_date} onChange={e => set("installation_date", e.target.value)} />
            </Field>
            <Field label="Delivery Date">
              <Input type="date" value={form.delivery_date} onChange={e => set("delivery_date", e.target.value)} />
            </Field>

            <Field label="Delivery Year" hint="Used to auto-calculate warranty dates">
              <Input type="number" min="2000" max="2100" value={form.delivery_year} onChange={e => handleDeliveryYearChange(e.target.value)} placeholder="e.g. 2023" />
            </Field>

            <Field label="Notes" colSpan={2}>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Additional notes..." />
            </Field>
          </div>

          {/* ── Maintenance & Warranty ───────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>3. Maintenance & Warranty</SectionTitle>

            <Field label="Warranty Base Year" hint="Auto-filled from Delivery Year">
              <Input type="number" value={form.warranty_base_year} onChange={e => set("warranty_base_year", e.target.value)} placeholder="Auto" />
            </Field>
            <Field label="Software Warranty End Date (3 Yrs)" hint="Auto: Delivery Year + 3">
              <Input type="date" value={form.software_warranty_end_date} onChange={e => set("software_warranty_end_date", e.target.value)} />
            </Field>

            <Field label="Preventive Inspection Date" hint="Auto: 6 years after 2023 contract">
              <Input type="date" value={form.preventive_inspection_date} onChange={e => set("preventive_inspection_date", e.target.value)} />
            </Field>
            <Field label="Next Inspection Date">
              <Input type="date" value={form.next_inspection_date} onChange={e => set("next_inspection_date", e.target.value)} />
            </Field>
          </div>

          {/* ── Child / Component Warranty ───────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>4. Child Component Warranty Dates</SectionTitle>

            <Field label="Refurbish & Electronic Equipment (5 Yrs)" hint="Auto: Delivery Year + 5">
              <Input type="date" value={form.electronics_warranty_end_date} onChange={e => set("electronics_warranty_end_date", e.target.value)} />
            </Field>
            <Field label="Acrylic / Plastics / Seals / Paint (10 Yrs)" hint="Auto: Delivery Year + 10">
              <Input type="date" value={form.materials_warranty_end_date} onChange={e => set("materials_warranty_end_date", e.target.value)} />
            </Field>
            <Field label="Metal / Glass / Solar Panels / Electrical (15 Yrs)" hint="Auto: Delivery Year + 15" colSpan={2}>
              <Input type="date" value={form.structural_warranty_end_date} onChange={e => set("structural_warranty_end_date", e.target.value)} />
            </Field>
          </div>

          {/* ── Attachments ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <SectionTitle>5. Attached Documents & Photos</SectionTitle>

            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-medium text-slate-700">Document Types</Label>
              <div className="flex flex-wrap gap-3">
                {evidenceTypes.map(et => (
                  <label key={et} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                    <Checkbox checked={form.evidence_type.includes(et)} onCheckedChange={() => toggleEvidenceType(et)} />
                    {et}
                  </label>
                ))}
              </div>
              <FileUploader
                onUpload={(url) => setForm(f => ({ ...f, attachment_files: [...f.attachment_files, url] }))}
                label="Upload Document / Photo"
              />
              {form.attachment_files.length > 0 && (
                <p className="text-xs text-slate-500">{form.attachment_files.length} file(s) attached</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              {asset ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}