import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfigLists } from "@/components/shared/useConfigLists";

const CONTRACT_BASE_YEAR = 2023;

function calcWarrantyEnd(baseYear, years) {
  if (!baseYear) return "";
  const d = new Date(baseYear, 0, 1);
  d.setFullYear(d.getFullYear() + years);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
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

const emptyForm = {
  asset_id: "", asset_name: "", active_shelter_id: "", location_address: "",
  city: "", shelter_type: "", status: "Active",
  installation_date: "", delivery_date: "", delivery_year: "",
  warranty_base_year: "", software_warranty_end_date: "",
  electronics_warranty_end_date: "", materials_warranty_end_date: "",
  structural_warranty_end_date: "", preventive_inspection_date: "",
  next_inspection_date: "", notes: "",
  latitude: "", longitude: "",
  evidence_types: [], description: ""
};

export default function AssetFormDialog({ open, onOpenChange, asset, onSave }) {
  const cities = useConfigLists("Asset Cities");
  const shelterTypes = useConfigLists("Asset Shelter Types");
  const statuses = useConfigLists("Asset Status");
  const evidenceOptions = useConfigLists("Asset Evidence Types");

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (asset) {
      setForm({
        ...emptyForm,
        ...asset,
        latitude: asset.latitude ?? "",
        longitude: asset.longitude ?? "",
        evidence_types: asset.evidence_types || [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [asset, open]);

  // Auto-calculate warranty dates when warranty_base_year changes
  useEffect(() => {
    const yr = parseInt(form.warranty_base_year);
    if (!yr || yr < 2000 || yr > 2100) return;
    setForm(f => ({
      ...f,
      software_warranty_end_date: f.software_warranty_end_date || calcWarrantyEnd(yr, 3),
      electronics_warranty_end_date: f.electronics_warranty_end_date || calcWarrantyEnd(yr, 5),
      materials_warranty_end_date: f.materials_warranty_end_date || calcWarrantyEnd(yr, 10),
      structural_warranty_end_date: f.structural_warranty_end_date || calcWarrantyEnd(yr, 15),
    }));
  }, [form.warranty_base_year]);

  // Auto-calculate warranty_base_year from delivery_year
  useEffect(() => {
    const yr = parseInt(form.delivery_year);
    if (yr && yr >= 2000 && yr <= 2100) {
      setForm(f => ({ ...f, warranty_base_year: yr }));
    }
  }, [form.delivery_year]);

  // Auto-calculate preventive_inspection_date (6 years after CONTRACT_BASE_YEAR)
  useEffect(() => {
    if (!form.preventive_inspection_date) {
      const d = new Date(CONTRACT_BASE_YEAR + 6, 0, 1);
      setForm(f => ({ ...f, preventive_inspection_date: d.toISOString().split("T")[0] }));
    }
  }, [open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleEvidence = (val) => {
    setForm(f => {
      const arr = f.evidence_types || [];
      return { ...f, evidence_types: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.latitude !== "") payload.latitude = parseFloat(payload.latitude);
    else delete payload.latitude;
    if (payload.longitude !== "") payload.longitude = parseFloat(payload.longitude);
    else delete payload.longitude;
    if (payload.delivery_year !== "") payload.delivery_year = parseInt(payload.delivery_year);
    else delete payload.delivery_year;
    if (payload.warranty_base_year !== "") payload.warranty_base_year = parseInt(payload.warranty_base_year);
    else delete payload.warranty_base_year;
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">

          {/* ── HARD FIELDS ── */}
          <SectionHeader title="Core Information" color="slate" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset ID *</Label>
              <Input value={form.asset_id} onChange={e => set("asset_id", e.target.value)} required disabled={!!asset} placeholder="e.g. AST-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Name *</Label>
              <Input value={form.asset_name} onChange={e => set("asset_name", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Active Shelter ID</Label>
              <Input value={form.active_shelter_id} onChange={e => set("active_shelter_id", e.target.value)} placeholder="e.g. SH-001" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Shelter Type</Label>
              <Select value={form.shelter_type} onValueChange={v => set("shelter_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(shelterTypes.length ? shelterTypes : ["Standard Shelter", "Smart Shelter", "Solar Shelter"]).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Location/Address</Label>
              <Input value={form.location_address} onChange={e => set("location_address", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Select value={form.city} onValueChange={v => set("city", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(cities.length ? cities : ["Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Latitude</Label>
              <Input type="number" step="any" value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="e.g. 35.1856" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Longitude</Label>
              <Input type="number" step="any" value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="e.g. 33.3823" />
            </div>
          </div>

          {/* ── MANUAL INPUTS ── */}
          <SectionHeader title="Manual Inputs" color="blue" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(statuses.length ? statuses : ["Active", "Under Maintenance", "Inactive", "Transferred", "Replaced", "Retired"]).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Year</Label>
              <Input type="number" value={form.delivery_year} onChange={e => set("delivery_year", e.target.value)} placeholder="e.g. 2023" min="2000" max="2100" />
            </div>
          </div>
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

          {/* ── MAINTENANCE + WARRANTY ── */}
          <SectionHeader title="Maintenance & Warranty" color="green" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Warranty Base Year</Label>
              <Input type="number" value={form.warranty_base_year} onChange={e => set("warranty_base_year", e.target.value)} placeholder="e.g. 2023" min="2000" max="2100" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Software Warranty End Date (3 Years)</Label>
              <Input type="date" value={form.software_warranty_end_date} onChange={e => set("software_warranty_end_date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Preventive Inspection (6 years after 2023 contract)</Label>
              <Input type="date" value={form.preventive_inspection_date} onChange={e => set("preventive_inspection_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Next Inspection</Label>
              <Input type="date" value={form.next_inspection_date} onChange={e => set("next_inspection_date", e.target.value)} />
            </div>
          </div>

          {/* ── CHILD WARRANTY INPUTS ── */}
          <SectionHeader title="Child Component Warranty Dates" color="amber" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Refurbish &amp; Electronic Equipment Warranty End Date (5 Years)</Label>
              <Input type="date" value={form.electronics_warranty_end_date} onChange={e => set("electronics_warranty_end_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Acrylic/Plastics/Seals/Paint Warranty End Date (10 Years)</Label>
              <Input type="date" value={form.materials_warranty_end_date} onChange={e => set("materials_warranty_end_date", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Metal/Glass/Solar Panels/Electrical Equipment Warranty End Date (15 Years)</Label>
            <Input type="date" value={form.structural_warranty_end_date} onChange={e => set("structural_warranty_end_date", e.target.value)} />
          </div>

          {/* ── ATTACHED DOCUMENTS ── */}
          <SectionHeader title="Attached Documents & Photos" color="rose" />
          <div className="space-y-2">
            <Label className="text-xs">Evidence Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {(evidenceOptions.length ? evidenceOptions : ["Installation Photos", "Delivery Note", "Signed Install Form", "Handover Form", "Warranty Document", "Other"]).map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={(form.evidence_types || []).includes(opt)}
                    onCheckedChange={() => toggleEvidence(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">{asset ? "Update" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}