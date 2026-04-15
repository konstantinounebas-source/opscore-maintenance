import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  X, MapPin, AlertCircle, Wrench, CalendarDays,
  Plus, Layers, ChevronRight, Loader2, CheckCircle2, Clock, ChevronDown
} from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { useConfigLists } from "@/components/shared/useConfigLists";
import { computePriorityBucket, computePinColor } from "@/components/planning/planningUtils";

const PRIORITY_OPTIONS = ["P1", "P2", "Critical", "High", "Medium", "Low"];

function StatusBadge({ label, colorClass }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>{label}</span>;
}

function priorityColor(p) {
  if (p === "P1" || p === "Critical") return "bg-red-100 text-red-700 border-red-200";
  if (p === "P2" || p === "High")     return "bg-orange-100 text-orange-700 border-orange-200";
  if (p === "Low")                    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function incidentStatusColor(s) {
  if (s === "Open")        return "bg-red-100 text-red-700 border-red-200";
  if (s === "In Progress") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "Resolved" || s === "Closed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function AssetActionDrawer({
  asset,
  assignment,
  incidents,
  workOrders,
  weeks,
  layers,
  layerAssets,
  onClose,
  onSaveAssignment,
  onAddToLayer,
  onRemoveFromLayer,
}) {
  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);

  // Assignment form state
  const BLANK_FORM = {
    assignment_type: assignment?.assignment_type || "",
    assignment_status: assignment?.assignment_status || "Planned",
    priority_bucket: assignment?.priority_bucket || "",
    team_name: assignment?.team_name || "",
    assigned_to: assignment?.assigned_to || "",
    route_zone: assignment?.route_zone || "",
    notes: assignment?.notes || "",
    source_incident_id: assignment?.source_incident_id || "",
    source_work_order_id: assignment?.source_work_order_id || "",
    planning_week_id: assignment?.planning_week_id || "",
  };
  const [form, setForm] = useState(BLANK_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const typeOptions = useConfigLists("Planning Assignment Types");
  const statusOptions = useConfigLists("Planning Assignment Statuses");

  const assetIncidents = incidents.filter(i => i.related_asset_id === asset?.id);
  const assetWOs = workOrders.filter(w => w.related_asset_id === asset?.id);
  const assetLayerIds = layerAssets.filter(la => la.asset_id === asset?.id).map(la => la.planning_layer_id);

  const handleSave = async () => {
    if (!asset || !form.planning_week_id) return;
    setSaving(true);
    const linkedIncident = incidents.find(i => i.id === form.source_incident_id);
    const linkedWO = workOrders.find(w => w.id === form.source_work_order_id);
    const bucket = form.priority_bucket || computePriorityBucket(linkedIncident, linkedWO);
    const pinColor = computePinColor(bucket, form.assignment_status);
    await onSaveAssignment({
      ...form,
      asset_id: asset.id,
      priority_bucket: bucket,
      pin_color: pinColor,
    }, assignment?.id);
    setSaving(false);
  };

  if (!asset) return null;

  const TABS = [
    { id: "details", label: "Asset" },
    { id: "assign", label: "Assign" },
    { id: "incidents", label: `Incidents ${assetIncidents.length ? `(${assetIncidents.length})` : ""}` },
    { id: "workorders", label: `Work Orders ${assetWOs.length ? `(${assetWOs.length})` : ""}` },
    { id: "layers", label: "Layers" },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-80 shrink-0 overflow-hidden shadow-xl z-20">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="text-sm font-bold text-slate-800 truncate">{asset.asset_id}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{asset.location_address || "No address"}</p>
          <p className="text-xs text-slate-400">{asset.city} · {asset.shelter_type}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2 mt-0.5 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 shrink-0 bg-white">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── DETAILS TAB ───────────────────────────────── */}
        {tab === "details" && (
          <div className="space-y-3">
            <Section label="Asset Details">
              <Row label="ID" value={asset.asset_id} />
              <Row label="Category" value={asset.category} />
              <Row label="Type" value={asset.asset_type} />
              <Row label="Status" value={asset.status} />
              <Row label="City" value={asset.city} />
              <Row label="Municipality" value={asset.municipality} />
              <Row label="Shelter Type" value={asset.shelter_type} />
              <Row label="Address" value={asset.location_address} />
            </Section>

            {assignment && (
              <Section label="Current Assignment">
                <Row label="Week" value={weeks.find(w => w.id === assignment.planning_week_id)?.week_name || assignment.planning_week_id} />
                <Row label="Status" value={assignment.assignment_status} />
                <Row label="Type" value={assignment.assignment_type} />
                <Row label="Priority" value={assignment.priority_bucket} />
                <Row label="Team" value={assignment.team_name} />
                <Row label="Assigned To" value={assignment.assigned_to} />
              </Section>
            )}
          </div>
        )}

        {/* ── ASSIGN TAB ───────────────────────────────── */}
        {tab === "assign" && (
          <div className="space-y-3">
            <WeekPickerField
              weeks={weeks}
              value={form.planning_week_id}
              onChange={v => set("planning_week_id", v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.assignment_type || "__none__"} onValueChange={v => set("assignment_type", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-xs h-8"><SelectValue placeholder="Type..." /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__none__">— Type —</SelectItem>
                    {typeOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.assignment_status} onValueChange={v => set("assignment_status", v)}>
                  <SelectTrigger className="mt-1 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    {(statusOptions.length ? statusOptions : ["Planned","In Progress","Completed","Deferred","Cancelled"]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority_bucket || "__auto__"} onValueChange={v => set("priority_bucket", v === "__auto__" ? "" : v)}>
                <SelectTrigger className="mt-1 text-xs h-8"><SelectValue placeholder="Auto" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__auto__">Auto from incident</SelectItem>
                  {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Assigned To</Label>
                <Input value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} className="mt-1 h-8 text-xs" placeholder="Technician..." />
              </div>
              <div>
                <Label className="text-xs">Team</Label>
                <Input value={form.team_name} onChange={e => set("team_name", e.target.value)} className="mt-1 h-8 text-xs" placeholder="Team..." />
              </div>
            </div>
            <div>
              <Label className="text-xs">Route Zone</Label>
              <Input value={form.route_zone} onChange={e => set("route_zone", e.target.value)} className="mt-1 h-8 text-xs" placeholder="Zone A..." />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="mt-1 text-xs" rows={2} placeholder="Notes..." />
            </div>
            {assetIncidents.length > 0 && (
              <div>
                <Label className="text-xs">Link Incident</Label>
                <Select value={form.source_incident_id || "__none__"} onValueChange={v => set("source_incident_id", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1 text-xs h-8"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__none__">None</SelectItem>
                    {assetIncidents.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.incident_id} – {i.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-8 text-xs"
              onClick={handleSave}
              disabled={saving || !form.planning_week_id}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {saving ? "Saving..." : assignment ? "Update Assignment" : "Create Assignment"}
            </Button>
          </div>
        )}

        {/* ── INCIDENTS TAB ────────────────────────────── */}
        {tab === "incidents" && (
          <div className="space-y-2">
            {assetIncidents.length === 0 ? (
              <EmptyState icon={AlertCircle} label="No incidents linked to this asset" />
            ) : assetIncidents.map(inc => (
              <div key={inc.id} className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">{inc.incident_id}</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    <StatusBadge label={inc.status} colorClass={incidentStatusColor(inc.status)} />
                    {inc.initial_priority && <StatusBadge label={inc.initial_priority} colorClass={priorityColor(inc.initial_priority)} />}
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-snug">{inc.title}</p>
                {inc.reported_date && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(inc.reported_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── WORK ORDERS TAB ─────────────────────────── */}
        {tab === "workorders" && (
          <div className="space-y-2">
            {assetWOs.length === 0 ? (
              <EmptyState icon={Wrench} label="No work orders linked to this asset" />
            ) : assetWOs.map(wo => (
              <div key={wo.id} className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">{wo.work_order_id}</span>
                  <StatusBadge label={wo.status} colorClass={incidentStatusColor(wo.status)} />
                </div>
                <p className="text-xs text-slate-600 leading-snug">{wo.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {wo.priority && <StatusBadge label={wo.priority} colorClass={priorityColor(wo.priority)} />}
                  {wo.due_date && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(wo.due_date), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── LAYERS TAB ───────────────────────────────── */}
        {tab === "layers" && (
          <div className="space-y-2">
            {layers.length === 0 ? (
              <EmptyState icon={Layers} label="No layers created yet" />
            ) : layers.map(layer => {
              const inLayer = assetLayerIds.includes(layer.id);
              return (
                <div key={layer.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: layer.color || "#94A3B8" }} />
                  <span className="text-xs text-slate-700 flex-1">{layer.name}</span>
                  {inLayer ? (
                    <button
                      onClick={() => onRemoveFromLayer(layer.id, asset.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 shrink-0"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => onAddToLayer(layer.id, asset.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-slate-400 w-20 shrink-0 pt-0.5 uppercase tracking-wide">{label}</span>
      <span className="text-xs text-slate-700 leading-snug">{value}</span>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function EmptyState({ icon: IconComp, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
      <IconComp className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

function WeekPickerField({ weeks, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedWeek = weeks.find(w => w.id === value);

  const handleDaySelect = (date) => {
    if (!date) return;
    // Find a week whose start_date <= date <= end_date
    const matched = weeks.find(w => {
      if (!w.start_date || !w.end_date) return false;
      return isWithinInterval(date, {
        start: parseISO(w.start_date),
        end: parseISO(w.end_date),
      });
    });
    if (matched) {
      onChange(matched.id);
      setOpen(false);
    }
  };

  // Build disabled dates: only days within any known week are selectable
  const weekIntervals = weeks
    .filter(w => w.start_date && w.end_date)
    .map(w => ({ start: parseISO(w.start_date), end: parseISO(w.end_date) }));

  const isDisabled = (date) => !weekIntervals.some(iv => isWithinInterval(date, iv));

  return (
    <div>
      <Label className="text-xs">Planning Week</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="mt-1 w-full flex items-center justify-between border border-input rounded-md px-3 h-8 text-xs bg-white hover:bg-slate-50 transition-colors">
            {selectedWeek ? (
              <span className="truncate">
                <span className="font-mono text-[10px] text-slate-400 mr-1">{selectedWeek.week_code}</span>
                {selectedWeek.week_name}
              </span>
            ) : (
              <span className="text-slate-400">Pick a date to select a week...</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" style={{ zIndex: 99999 }} align="start">
          <div className="p-3 border-b border-slate-100">
            <p className="text-xs text-slate-500">Select any date — the matching planning week will be chosen automatically.</p>
          </div>
          <Calendar
            mode="single"
            onSelect={handleDaySelect}
            disabled={isDisabled}
            initialFocus
          />
          {weeks.length === 0 && (
            <p className="text-xs text-slate-400 p-3 text-center">No planning weeks defined yet.</p>
          )}
        </PopoverContent>
      </Popover>
      {selectedWeek && (
        <p className="text-[10px] text-indigo-600 mt-1">
          {selectedWeek.week_code} · {selectedWeek.start_date} → {selectedWeek.end_date}
          {selectedWeek.status === "Active" && <span className="ml-1 bg-emerald-100 text-emerald-700 px-1 rounded">Active</span>}
        </p>
      )}
    </div>
  );
}