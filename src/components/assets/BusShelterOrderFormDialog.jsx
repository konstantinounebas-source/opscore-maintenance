import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfigLists } from "@/components/shared/useConfigLists";

function SectionHeader({ title }) {
  return (
    <div className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-700">
      {title}
    </div>
  );
}

const empty = {
  asset_code: "",
  location_address: "",
  municipality: "",
  city: "",
  existing_condition: "",
  has_bay: "",
  ordered_shelter_type: "",
  installed_shelter_type: "",
  order_year: "",
  installation_date: "",
  asset_stage: "planning",
  notes: "",
  latitude: "",
  longitude: "",
};

export default function BusShelterOrderFormDialog({ open, onOpenChange, order, onSave }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  const cities = useConfigLists("Asset Cities");
  const municipalities = useConfigLists("Municipalities");

  useEffect(() => {
    if (order) {
      setForm({ ...empty, ...order, latitude: order.latitude ?? "", longitude: order.longitude ?? "" });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [order, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.asset_code?.trim()) e.asset_code = true;
    if (!form.city) e.city = true;
    if (!form.asset_stage) e.asset_stage = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const err = (key) => errors[key] ? "border-red-400 focus-visible:ring-red-400" : "";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      asset_source: "bus_shelter_order",
      asset_id: form.asset_id || `BSO-${form.asset_code || Date.now()}`,
    };
    if (payload.order_year !== "") payload.order_year = parseInt(payload.order_year);
    else delete payload.order_year;
    if (payload.latitude !== "") payload.latitude = parseFloat(payload.latitude);
    else delete payload.latitude;
    if (payload.longitude !== "") payload.longitude = parseFloat(payload.longitude);
    else delete payload.longitude;

    onSave(payload, [], []);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Bus Shelter Order" : "New Bus Shelter Order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
              Please fill in all required fields marked with <span className="font-bold">*</span>
            </div>
          )}

          {/* ── IDENTIFICATION ── */}
          <SectionHeader title="Identification" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset Code / Bus Stop ID <span className="text-red-500">*</span></Label>
              <Input className={err("asset_code")} value={form.asset_code} onChange={e => set("asset_code", e.target.value)} placeholder="e.g. 10014" />
              {errors.asset_code && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Order Year</Label>
              <Input type="number" value={form.order_year} onChange={e => set("order_year", e.target.value)} placeholder="e.g. 2024" min="2000" max="2100" />
            </div>
          </div>

          {/* ── LOCATION ── */}
          <SectionHeader title="Location" />
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={form.location_address} onChange={e => set("location_address", e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">City <span className="text-red-500">*</span></Label>
              <Select value={form.city} onValueChange={v => set("city", v)}>
                <SelectTrigger className={err("city")}><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {(cities.length ? cities : ["Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Municipality</Label>
              <Select value={form.municipality || ""} onValueChange={v => set("municipality", v)}>
                <SelectTrigger><SelectValue placeholder="Select municipality" /></SelectTrigger>
                <SelectContent>
                  {(municipalities.length ? municipalities : []).map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
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

          {/* ── SHELTER DETAILS ── */}
          <SectionHeader title="Shelter Details" />
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
            <div className="space-y-1.5">
              <Label className="text-xs">Ordered Shelter Type</Label>
              <Input value={form.ordered_shelter_type} onChange={e => set("ordered_shelter_type", e.target.value)} placeholder="e.g. TYPE A1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Installed Shelter Type</Label>
              <Input value={form.installed_shelter_type} onChange={e => set("installed_shelter_type", e.target.value)} placeholder="e.g. TYPE A1" />
            </div>
          </div>

          {/* ── STAGE & DATES ── */}
          <SectionHeader title="Stage & Dates" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Stage <span className="text-red-500">*</span></Label>
              <Select value={form.asset_stage} onValueChange={v => set("asset_stage", v)}>
                <SelectTrigger className={err("asset_stage")}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              {errors.asset_stage && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Installation Date</Label>
              <Input type="date" value={form.installation_date} onChange={e => set("installation_date", e.target.value)} />
            </div>
          </div>

          {/* ── NOTES ── */}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Any additional notes..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">{order ? "Update" : "Create Order"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}