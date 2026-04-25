import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";

const SOURCES = ["A.A. Order","A.A. Instruction","Site Finding","Internal Review","QA Finding","Delivery","Acceptance","Other"];
const STAGES = Array.from({ length: 18 }, (_, i) => i + 1);

const EDITABLE_FIELDS = [
  { key: "bus_stop_name", label: "Bus Stop Name" },
  { key: "location_address", label: "Address", cols: 2 },
  { key: "municipality", label: "Municipality" },
  { key: "district", label: "District" },
  { key: "area", label: "Area" },
  { key: "latitude", label: "Latitude", type: "number" },
  { key: "longitude", label: "Longitude", type: "number" },
  { key: "installation_type", label: "Installation Type", type: "select", options: ["New","Replacement","Relocation","Removal"] },
  { key: "intervention_scope", label: "Intervention Scope", type: "select", options: ["Shelter Only","Civil Works","Full Installation","Marking Only"] },
  { key: "road_side", label: "Road Side", type: "select", options: ["Left","Right","Center Island"] },
  { key: "traffic_direction", label: "Traffic Direction", type: "select", options: ["One Way","Two Way"] },
  { key: "existing_infrastructure_type", label: "Existing Infrastructure", type: "select", options: ["None","Old Shelter","Pole","Sign Only","Other"] },
  { key: "pavement_type", label: "Pavement Type", type: "select", options: ["Asphalt","Concrete","Tiles","Soil"] },
  { key: "pavement_width", label: "Pavement Width (m)", type: "number" },
  { key: "traffic_impact_level", label: "Traffic Impact", type: "select", options: ["Low","Medium","High"] },
  { key: "risk_level", label: "Risk Level", type: "select", options: ["Low","Medium","High"] },
  { key: "utility_type", label: "Utility Type", type: "select", options: ["Electric","Water","Telecom","Sewer","Unknown"] },
  { key: "permit_type", label: "Permit Type", type: "select", options: ["Municipality","Police","PWD","Multiple"] },
  { key: "site_constraints_notes", label: "Constraints Notes", type: "textarea", cols: 3 },
  { key: "risk_description", label: "Risk Description", type: "textarea", cols: 3 },
  { key: "access_notes", label: "Access Notes", type: "textarea", cols: 3 },
  { key: "authority_order_reference", label: "Authority Ref." },
  { key: "order_received_date", label: "Order Received", type: "date" },
  { key: "order_received_from", label: "Received From" },
  { key: "order_type", label: "Order Type" },
  { key: "order_priority", label: "Priority", type: "select", options: ["Low","Medium","High","Critical"] },
  { key: "order_deadline_date", label: "Deadline", type: "date" },
  { key: "order_description", label: "Order Description", type: "textarea", cols: 3 },
];

const BOOL_FIELDS = [
  { key: "has_tactile_paving", label: "Tactile Paving" },
  { key: "has_bus_bay", label: "Bus Bay" },
  { key: "has_road_marking", label: "Road Marking" },
  { key: "requires_footway", label: "Requires Footway" },
  { key: "has_underground_utilities", label: "Underground Utilities" },
  { key: "requires_traffic_management", label: "Traffic Management" },
  { key: "requires_permits", label: "Requires Permits" },
];

export default function RevisionFormDialog({ log, baseVersion, nextVersionNo, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({
    source: "",
    reason: "",
    related_stage: "",
    date_of_request: new Date().toISOString().split("T")[0],
    created_by: "",
  });
  const [form, setForm] = useState({ ...baseVersion });

  const setM = (k, v) => setMeta(m => ({ ...m, [k]: v }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isValid = meta.source && meta.reason && meta.date_of_request;

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.StationLogDataVersions.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      ...form,
      version_no: nextVersionNo,
      status: "Draft",
      is_active: false,
      is_working: true,
      source: meta.source,
      reason: meta.reason,
      related_stage: meta.related_stage ? Number(meta.related_stage) : undefined,
      date_of_request: meta.date_of_request,
      created_by: meta.created_by,
    });
    setSaving(false);
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Revision — Version {nextVersionNo}</DialogTitle>
        </DialogHeader>

        {/* Required Revision Metadata */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-bold text-amber-700">Revision Metadata (Required)</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source *</Label>
              <Select value={meta.source} onValueChange={v => setM("source", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select source..." /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Related Stage</Label>
              <Select value={String(meta.related_stage || "")} onValueChange={v => setM("related_stage", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select stage..." /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s} value={String(s)}>Stage {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of Request *</Label>
              <Input type="date" className="h-8 text-sm" value={meta.date_of_request} onChange={e => setM("date_of_request", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Requested By</Label>
              <Input className="h-8 text-sm" value={meta.created_by} onChange={e => setM("created_by", e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Reason for Revision *</Label>
              <Textarea className="h-16 text-sm" value={meta.reason} onChange={e => setM("reason", e.target.value)} placeholder="Describe why this revision is needed..." />
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">Edit Station Data</p>
          <div className="grid grid-cols-3 gap-3">
            {EDITABLE_FIELDS.map(field => (
              <div key={field.key} className={`space-y-1 ${field.cols === 3 ? "col-span-3" : field.cols === 2 ? "col-span-2" : ""}`}>
                <Label className="text-xs">{field.label}</Label>
                {field.type === "select" ? (
                  <Select value={form[field.key] || ""} onValueChange={v => set(field.key, v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea className="text-sm h-16" value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} />
                ) : (
                  <Input
                    type={field.type || "text"}
                    className="h-8 text-sm"
                    value={form[field.key] || ""}
                    onChange={e => set(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            {BOOL_FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input type="checkbox" checked={!!form[f.key]} onChange={e => set(f.key, e.target.checked)} className="rounded" />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !isValid}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save as Draft
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}