import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const SECTIONS = [
  {
    title: "Order Information",
    fields: [
      { key: "authority_order_reference", label: "Authority Order Reference" },
      { key: "order_received_date", label: "Order Received Date", type: "date" },
      { key: "order_received_from", label: "Order Received From" },
      { key: "order_type", label: "Order Type" },
      { key: "order_priority", label: "Priority", type: "select", options: ["Low","Medium","High","Critical"] },
      { key: "order_deadline_date", label: "Deadline", type: "date" },
      { key: "order_description", label: "Order Description", type: "textarea", cols: 3 },
    ],
  },
  {
    title: "Location",
    fields: [
      { key: "bus_stop_name", label: "Bus Stop Name" },
      { key: "location_address", label: "Address", cols: 2 },
      { key: "municipality", label: "Municipality" },
      { key: "district", label: "District" },
      { key: "area", label: "Area" },
      { key: "latitude", label: "Latitude", type: "number" },
      { key: "longitude", label: "Longitude", type: "number" },
    ],
  },
  {
    title: "Installation Details",
    fields: [
      { key: "installation_type", label: "Installation Type", type: "select", options: ["New","Replacement","Relocation","Removal"] },
      { key: "intervention_scope", label: "Intervention Scope", type: "select", options: ["Shelter Only","Civil Works","Full Installation","Marking Only"] },
      { key: "road_side", label: "Road Side", type: "select", options: ["Left","Right","Center Island"] },
      { key: "traffic_direction", label: "Traffic Direction", type: "select", options: ["One Way","Two Way"] },
      { key: "existing_infrastructure_type", label: "Existing Infrastructure", type: "select", options: ["None","Old Shelter","Pole","Sign Only","Other"] },
      { key: "pavement_type", label: "Pavement Type", type: "select", options: ["Asphalt","Concrete","Tiles","Soil"] },
      { key: "pavement_width", label: "Pavement Width (m)", type: "number" },
    ],
  },
  {
    title: "Constraints & Risks",
    fields: [
      { key: "traffic_impact_level", label: "Traffic Impact", type: "select", options: ["Low","Medium","High"] },
      { key: "risk_level", label: "Risk Level", type: "select", options: ["Low","Medium","High"] },
      { key: "utility_type", label: "Utility Type", type: "select", options: ["Electric","Water","Telecom","Sewer","Unknown"] },
      { key: "permit_type", label: "Permit Type", type: "select", options: ["Municipality","Police","PWD","Multiple"] },
      { key: "site_constraints_notes", label: "Constraints Notes", type: "textarea" },
      { key: "risk_description", label: "Risk Description", type: "textarea" },
    ],
  },
];

export default function InitialVersionDialog({ log, asset, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    // Pre-fill from asset
    location_address: asset?.location_address || "",
    municipality: asset?.municipality || "",
    latitude: asset?.latitude || "",
    longitude: asset?.longitude || "",
    has_bus_bay: asset?.has_bay === "yes",
    bus_stop_name: asset?.asset_id || "",
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const version = await base44.entities.StationLogDataVersions.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      ...form,
      version_no: 1,
      status: "Active",
      is_active: true,
      is_working: true,
      created_by: "System",
      date_of_request: new Date().toISOString().split("T")[0],
      source: "A.A. Order",
      reason: "Initial version",
    });

    // Create CurrentData
    const existing = await base44.entities.StationLogCurrentData.filter({ station_log_id: log.id });
    const coreData = {
      station_log_id: log.id,
      asset_id: log.asset_id,
      ...form,
      active_version_id: version.id,
      working_version_id: version.id,
      revision_status: "No Pending Revision",
      last_updated: new Date().toISOString(),
    };
    if (existing.length > 0) {
      await base44.entities.StationLogCurrentData.update(existing[0].id, coreData);
    } else {
      await base44.entities.StationLogCurrentData.create(coreData);
    }
    setSaving(false);
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Initialize Station Data — Version 1</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">{section.title}</p>
              <div className="grid grid-cols-3 gap-3">
                {section.fields.map(field => (
                  <div key={field.key} className={`space-y-1 ${field.cols === 3 ? "col-span-3" : field.cols === 2 ? "col-span-2" : ""}`}>
                    <Label className="text-xs">{field.label}</Label>
                    {field.type === "select" ? (
                      <Select value={form[field.key] || ""} onValueChange={v => set(field.key, v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : field.type === "textarea" ? (
                      <Textarea className="text-sm h-20" value={form[field.key] || ""} onChange={e => set(field.key, e.target.value)} />
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
              {/* Boolean fields for Installation section */}
              {section.title === "Installation Details" && (
                <div className="grid grid-cols-4 gap-3 mt-3">
                  {["has_tactile_paving","has_bus_bay","has_road_marking","requires_footway"].map(k => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                      <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="rounded" />
                      {k.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              )}
              {section.title === "Constraints & Risks" && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {["has_underground_utilities","requires_traffic_management","requires_permits"].map(k => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                      <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="rounded" />
                      {k.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase())}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Initial Version
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}