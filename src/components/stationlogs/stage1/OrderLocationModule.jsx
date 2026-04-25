import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, FileText, RefreshCw, CheckCircle, Clock, Plus } from "lucide-react";

export default function OrderLocationModule({ log, asset }) {
  const queryClient = useQueryClient();
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);

  const { data: currentData } = useQuery({
    queryKey: ["stationLogCurrentData", log.id],
    queryFn: () => base44.entities.StationLogCurrentData.filter({ station_log_id: log.id }),
    select: (data) => data[0] || null,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["stationLogVersions", log.id],
    queryFn: () => base44.entities.StationLogDataVersions.filter({ station_log_id: log.id }),
  });

  const sortedVersions = [...versions].sort((a, b) => b.version_no - a.version_no);
  const activeVersion = versions.find(v => v.is_active);
  const pendingVersion = versions.find(v => v.status === "Pending Approval");

  const statusColor = {
    "No Pending Revision": "bg-green-100 text-green-800",
    "Revision Pending Approval": "bg-yellow-100 text-yellow-800",
  };

  if (!currentData) {
    return (
      <div className="p-6 text-center space-y-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
        <p className="text-sm font-medium text-slate-600">No Order + Location data initialized yet.</p>
        <p className="text-xs text-slate-400">Initialize this stage to start tracking order and location information.</p>
        <InitialVersionDialog log={log} asset={asset} onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["stationLogCurrentData", log.id] });
          queryClient.invalidateQueries({ queryKey: ["stationLogVersions", log.id] });
        }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={statusColor[currentData.revision_status] || "bg-slate-100 text-slate-700"}>
            {currentData.revision_status || "No Pending Revision"}
          </Badge>
          {activeVersion && (
            <span className="text-xs text-slate-500">Active: v{activeVersion.version_no}</span>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowRevisionDialog(true)}>
          <RefreshCw className="h-3 w-3" /> Request Revision
        </Button>
      </div>

      {/* Current Data */}
      <div className="grid grid-cols-2 gap-3">
        <DataField label="Order Reference" value={currentData.authority_order_reference} />
        <DataField label="Order Type" value={currentData.order_type} />
        <DataField label="Received Date" value={currentData.order_received_date} />
        <DataField label="Priority" value={currentData.order_priority} />
        <DataField label="Bus Stop Name" value={currentData.bus_stop_name} />
        <DataField label="Address" value={currentData.location_address} />
        <DataField label="Municipality" value={currentData.municipality} />
        <DataField label="District" value={currentData.district} />
        <DataField label="Latitude" value={currentData.latitude} />
        <DataField label="Longitude" value={currentData.longitude} />
        <DataField label="Installation Type" value={currentData.installation_type} />
        <DataField label="Road Side" value={currentData.road_side} />
      </div>

      {/* Pending revision notice */}
      {pendingVersion && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <span className="text-xs text-yellow-800">
            Revision v{pendingVersion.version_no} is pending approval — submitted by {pendingVersion.created_by}
          </span>
        </div>
      )}

      {/* Version history */}
      {sortedVersions.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-bold text-slate-600 uppercase mb-2">Version History</p>
          <div className="space-y-1">
            {sortedVersions.map(v => (
              <div key={v.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-slate-50 border border-slate-100">
                <span className="font-mono font-semibold text-slate-700 w-8">v{v.version_no}</span>
                <Badge className={`text-xs ${
                  v.status === "Active" ? "bg-green-100 text-green-800" :
                  v.status === "Pending Approval" ? "bg-yellow-100 text-yellow-800" :
                  v.status === "Rejected" ? "bg-red-100 text-red-800" :
                  v.status === "Superseded" ? "bg-slate-100 text-slate-600" :
                  "bg-blue-100 text-blue-800"
                }`}>{v.status}</Badge>
                <span className="text-slate-500 flex-1">{v.reason || v.source || "—"}</span>
                <span className="text-slate-400">{v.created_by || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRevisionDialog && (
        <RevisionFormDialog
          log={log}
          currentData={currentData}
          nextVersionNo={(Math.max(...versions.map(v => v.version_no), 0)) + 1}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["stationLogCurrentData", log.id] });
            queryClient.invalidateQueries({ queryKey: ["stationLogVersions", log.id] });
            setShowRevisionDialog(false);
          }}
          onClose={() => setShowRevisionDialog(false)}
        />
      )}
    </div>
  );
}

function DataField({ label, value }) {
  return (
    <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{value ?? <span className="text-slate-300">—</span>}</p>
    </div>
  );
}

// ─── Inline Init Dialog ────────────────────────────────────────────────────────
function InitialVersionDialog({ log, asset, onSaved }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    authority_order_reference: asset?.asset_id || "",
    order_received_date: "",
    order_received_from: "",
    order_type: "",
    order_priority: "",
    bus_stop_name: asset?.location_address || "",
    location_address: asset?.location_address || "",
    municipality: asset?.municipality || "",
    district: "",
    area: "",
    latitude: asset?.latitude || "",
    longitude: asset?.longitude || "",
    installation_type: "",
    road_side: "",
  });

  const handleSave = async () => {
    setSaving(true);
    const versionData = {
      station_log_id: log.id,
      asset_id: log.asset_id,
      version_no: 1,
      status: "Active",
      is_active: true,
      is_working: true,
      source: "A.A. Order",
      date_of_request: new Date().toISOString().split("T")[0],
      reason: "Initial version",
      ...form,
    };
    const version = await base44.entities.StationLogDataVersions.create(versionData);

    const currentDataPayload = {
      station_log_id: log.id,
      asset_id: log.asset_id,
      active_version_id: version.id,
      working_version_id: version.id,
      revision_status: "No Pending Revision",
      last_updated: new Date().toISOString(),
      ...form,
    };
    await base44.entities.StationLogCurrentData.create(currentDataPayload);
    setSaving(false);
    setOpen(false);
    onSaved();
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-3 w-3" /> Initialize Stage 1
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800">Initialize Order + Location (v1)</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(form).map(([key, val]) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600 uppercase">{key.replace(/_/g, " ")}</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={val}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Initialize"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Revision Dialog ────────────────────────────────────────────────────
function RevisionFormDialog({ log, currentData, nextVersionNo, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ source: "Site Finding", reason: "", date_of_request: new Date().toISOString().split("T")[0] });
  const [form, setForm] = useState({ ...currentData });

  const SOURCES = ["A.A. Order", "A.A. Instruction", "Site Finding", "Internal Review", "QA Finding", "Delivery", "Acceptance", "Other"];

  const handleSave = async () => {
    if (!meta.reason) return alert("Please provide a reason for this revision.");
    setSaving(true);
    const version = await base44.entities.StationLogDataVersions.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      version_no: nextVersionNo,
      status: "Pending Approval",
      is_active: false,
      is_working: true,
      source: meta.source,
      date_of_request: meta.date_of_request,
      reason: meta.reason,
      ...form,
    });

    // Find existing current data record
    const existing = await base44.entities.StationLogCurrentData.filter({ station_log_id: log.id });
    if (existing[0]) {
      await base44.entities.StationLogCurrentData.update(existing[0].id, {
        working_version_id: version.id,
        revision_status: "Revision Pending Approval",
        last_updated: new Date().toISOString(),
      });
    }
    setSaving(false);
    onSaved();
  };

  const editableFields = ["bus_stop_name", "location_address", "municipality", "district", "area", "latitude", "longitude",
    "installation_type", "road_side", "traffic_direction", "pavement_type", "pavement_width",
    "authority_order_reference", "order_type", "order_priority", "order_received_date", "order_received_from", "order_description"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800">Request Revision (v{nextVersionNo})</h2>
        <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Source *</label>
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm" value={meta.source} onChange={e => setMeta(m => ({ ...m, source: e.target.value }))}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Date of Request *</label>
            <input type="date" className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm" value={meta.date_of_request} onChange={e => setMeta(m => ({ ...m, date_of_request: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Reason *</label>
            <textarea className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm h-16" value={meta.reason} onChange={e => setMeta(m => ({ ...m, reason: e.target.value }))} placeholder="Describe why this revision is needed..." />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {editableFields.map(key => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-600 uppercase">{key.replace(/_/g, " ")}</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={form[key] ?? ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Submit for Approval"}
          </Button>
        </div>
      </div>
    </div>
  );
}