import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, RefreshCw, Clock, Plus, CheckCircle, XCircle, RotateCcw, Eye, ChevronDown, ChevronRight, AlertTriangle, Paperclip, History, Flag } from "lucide-react";
import OrderAttachmentsPanel from "./OrderAttachmentsPanel";

// ─── Collapsible Section ────────────────────────────────────────────────────────
function CollapsibleSection({ title, badge, defaultOpen = false, children, accentColor = "slate" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</span>
          {badge != null && (
            <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-semibold">{badge}</span>
          )}
        </div>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

// ─── Required fields check ──────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  { key: "authority_order_reference", label: "Authority Order Reference" },
  { key: "order_received_date", label: "Order Received Date" },
  { key: "bus_stop_name", label: "Bus Stop Name" },
  { key: "location_address", label: "Location Address" },
  { key: "municipality", label: "Municipality" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
];

function checkReadiness({ currentData, activeVersion, draftVersion, pendingVersion, tasks = [], instructions = [] }) {
  const missing = [];
  if (!currentData) { missing.push("No Order + Location data initialized"); return { ready: false, missing }; }
  if (!activeVersion) missing.push("No active version exists");
  if (draftVersion) missing.push("A draft revision is in progress — submit or delete it first");
  if (pendingVersion) missing.push("A revision is pending approval — approve or reject it first");
  REQUIRED_FIELDS.forEach(({ key, label }) => {
    const val = currentData[key];
    if (val == null || val === "") missing.push(`Missing required field: ${label}`);
  });
  const blockingTasks = tasks.filter(t => t.is_blocking && t.status !== "Completed" && (t.stage === 1 || !t.stage));
  if (blockingTasks.length > 0) missing.push(`${blockingTasks.length} blocking task(s) not completed`);
  const blockingInstructions = instructions.filter(i => i.is_blocking && i.status !== "Implemented" && (i.stage === 1 || !i.stage));
  if (blockingInstructions.length > 0) missing.push(`${blockingInstructions.length} blocking authority instruction(s) not resolved`);
  return { ready: missing.length === 0, missing };
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const SOURCES = ["A.A. Order", "A.A. Instruction", "Site Finding", "Internal Review", "QA Finding", "Delivery", "Acceptance", "Other"];
const STAGES = Array.from({ length: 18 }, (_, i) => i + 1);

const STAGE_NAMES = {
  1: "Order + Location", 2: "Work Categorization", 3: "Master Planning", 4: "Inspection Planning",
  5: "Inspection Execution", 6: "Inspection Approval Gate", 7: "Work Instruction", 8: "Draft Weekly Schedule",
  9: "RCA", 10: "RCA Approval Gate", 11: "Schedule Verification", 12: "Work Execution",
  13: "Filing / Station Log", 14: "QA Check", 15: "Delivery / Acceptance", 16: "Snagging / Rework",
  17: "Final Acceptance", 18: "Invoicing"
};

const SELECT_OPTIONS = {
  order_priority: ["Low", "Medium", "High", "Critical"],
  installation_type: ["New", "Replacement", "Relocation", "Removal"],
  intervention_scope: ["Shelter Only", "Civil Works", "Full Installation", "Marking Only"],
  road_side: ["Left", "Right", "Center Island"],
  traffic_direction: ["One Way", "Two Way"],
  existing_infrastructure_type: ["None", "Old Shelter", "Pole", "Sign Only", "Other"],
  pavement_type: ["Asphalt", "Concrete", "Tiles", "Soil"],
  utility_type: ["Electric", "Water", "Telecom", "Sewer", "Unknown"],
  traffic_impact_level: ["Low", "Medium", "High"],
  permit_type: ["Municipality", "Police", "PWD", "Multiple"],
  risk_level: ["Low", "Medium", "High"],
};

const BOOL_FIELDS = ["has_tactile_paving", "has_bus_bay", "has_road_marking", "requires_footway",
  "has_underground_utilities", "requires_traffic_management", "requires_permits"];

// Fields that go into current data snapshot (excludes metadata)
const DATA_FIELDS = [
  "authority_order_reference", "order_received_date", "order_received_from", "order_type",
  "order_priority", "order_priority_date", "order_deadline_date", "order_description", "order_notes",
  "bus_stop_name", "location_address", "municipality", "district", "area", "latitude", "longitude", "map_link",
  "shelter_type", "installation_type", "intervention_scope", "road_side", "traffic_direction",
  "existing_infrastructure_type", "pavement_type", "pavement_width",
  "has_tactile_paving", "has_bus_bay", "has_road_marking", "requires_footway", "access_notes",
  "has_underground_utilities", "utility_type", "traffic_impact_level", "requires_traffic_management",
  "requires_permits", "permit_type", "site_constraints_notes", "risk_level", "risk_description",
];

const FIELD_GROUPS = {
  "Order Info": ["authority_order_reference", "order_received_date", "order_received_from", "order_type",
    "order_priority", "order_priority_date", "order_deadline_date", "order_description", "order_notes"],
  "Location": ["bus_stop_name", "location_address", "municipality", "district", "area", "latitude", "longitude", "map_link"],
  "Station Definition": ["shelter_type", "installation_type", "intervention_scope", "road_side", "traffic_direction"],
  "Existing Conditions": ["existing_infrastructure_type", "pavement_type", "pavement_width",
    "has_tactile_paving", "has_bus_bay", "has_road_marking", "requires_footway", "access_notes"],
  "Constraints / Risks": ["has_underground_utilities", "utility_type", "traffic_impact_level",
    "requires_traffic_management", "requires_permits", "permit_type", "site_constraints_notes",
    "risk_level", "risk_description"],
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const NUMERIC_FIELDS = ["latitude", "longitude", "pavement_width"];

function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function pickDataFields(obj) {
  const out = {};
  DATA_FIELDS.forEach(k => {
    if (obj[k] !== undefined) {
      if (NUMERIC_FIELDS.includes(k)) {
        out[k] = (obj[k] === "" || obj[k] == null) ? null : Number(obj[k]);
      } else if (BOOL_FIELDS.includes(k)) {
        const v = obj[k];
        out[k] = v === true || v === "true" ? true : v === false || v === "false" ? false : null;
      } else {
        out[k] = obj[k] === "" ? null : obj[k];
      }
    }
  });
  return out;
}

async function getCurrentUser() {
  try { return await base44.auth.me(); } catch { return null; }
}

async function logActivity(stationLogId, action, description, stage = 1) {
  await base44.entities.StationLogActivityLog.create({
    station_log_id: stationLogId,
    action_type: action,
    description,
    action_date: new Date().toISOString(),
    related_stage: stage,
  });
}

// ─── Field Input ───────────────────────────────────────────────────────────────
function FieldInput({ fieldKey, value, onChange }) {
  const cls = "mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400";
  if (BOOL_FIELDS.includes(fieldKey)) {
    return (
      <select className={cls} value={value === true ? "true" : value === false ? "false" : ""}
        onChange={e => onChange(e.target.value === "true" ? true : e.target.value === "false" ? false : "")}>
        <option value="">— select —</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (SELECT_OPTIONS[fieldKey]) {
    return (
      <select className={cls} value={value ?? ""} onChange={e => onChange(e.target.value)}>
        <option value="">— select —</option>
        {SELECT_OPTIONS[fieldKey].map(o => <option key={o}>{o}</option>)}
      </select>
    );
  }
  if (fieldKey.includes("date")) {
    return <input type="date" className={cls} value={value ?? ""} onChange={e => onChange(e.target.value)} />;
  }
  if (fieldKey.includes("notes") || fieldKey.includes("description") || fieldKey === "reason") {
    return <textarea className={`${cls} h-16`} value={value ?? ""} onChange={e => onChange(e.target.value)} />;
  }
  return <input className={cls} value={value ?? ""} onChange={e => onChange(e.target.value)} />;
}

// ─── Data Field Display ────────────────────────────────────────────────────────
function DataField({ label, value }) {
  const display = value === true ? "Yes" : value === false ? "No" : value;
  return (
    <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 mt-0.5">{display ?? <span className="text-slate-300">—</span>}</p>
    </div>
  );
}

// ─── Form Section Renderer ─────────────────────────────────────────────────────
function FormSection({ title, fields, form, setForm }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 mt-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(key => (
          <div key={key} className={key.includes("notes") || key.includes("description") ? "col-span-2" : ""}>
            <label className="text-xs font-semibold text-slate-500 uppercase">{formatLabel(key)}</label>
            <FieldInput fieldKey={key} value={form[key]} onChange={v => setForm(f => ({ ...f, [key]: v }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Module ───────────────────────────────────────────────────────────────
export default function OrderLocationModule({ log, asset }) {
  const queryClient = useQueryClient();
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [restoreSourceVersion, setRestoreSourceVersion] = useState(null);
  const [editDraftVersion, setEditDraftVersion] = useState(null);
  const [viewVersion, setViewVersion] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { data: currentData } = useQuery({
    queryKey: ["stationLogCurrentData", log.id],
    queryFn: () => base44.entities.StationLogCurrentData.filter({ station_log_id: log.id }),
    select: d => d[0] || null,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["stationLogVersions", log.id],
    queryFn: () => base44.entities.StationLogDataVersions.filter({ station_log_id: log.id }),
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["orderAttachments", log.id],
    queryFn: () => base44.entities.StationLogOrderAttachments.filter({ station_log_id: log.id }),
    select: d => d.filter(a => a.is_active !== false),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["stage1tasks", log.id],
    queryFn: () => base44.entities.StationLogTasks.filter({ station_log_id: log.id }),
    select: d => d.filter(t => t.stage === 1 || !t.stage),
  });

  const { data: instructions = [] } = useQuery({
    queryKey: ["stage1instructions", log.id],
    queryFn: () => base44.entities.StationLogAuthorityInstructions.filter({ station_log_id: log.id }),
    select: d => d.filter(i => i.stage === 1 || !i.stage),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stationLogCurrentData", log.id] });
    queryClient.invalidateQueries({ queryKey: ["stationLogVersions", log.id] });
    queryClient.invalidateQueries({ queryKey: ["orderAttachments", log.id] });
  };

  const sortedVersions = [...versions].sort((a, b) => b.version_no - a.version_no);
  const activeVersion = versions.find(v => v.is_active);
  const draftVersion = currentData?.pending_version_id
    ? versions.find(v => v.id === currentData.pending_version_id && v.status === "Draft")
    : versions.find(v => v.status === "Draft");
  const pendingVersion = currentData?.pending_version_id
    ? versions.find(v => v.id === currentData.pending_version_id && v.status === "Pending Approval")
    : versions.find(v => v.status === "Pending Approval");
  const hasActiveRevision = !!(draftVersion || pendingVersion);

  const readiness = checkReadiness({ currentData, activeVersion, draftVersion, pendingVersion, tasks, instructions });

  const handleApprove = async () => {
    if (!pendingVersion || !currentData) return;
    setApproving(true);
    if (activeVersion) {
      await base44.entities.StationLogDataVersions.update(activeVersion.id, {
        status: "Superseded", is_active: false, is_working: false,
      });
    }
    await base44.entities.StationLogDataVersions.update(pendingVersion.id, {
      status: "Active", is_active: true, is_working: true,
    });
    const dataSnapshot = pickDataFields(pendingVersion);
    await base44.entities.StationLogCurrentData.update(currentData.id, {
      ...dataSnapshot,
      active_version_id: pendingVersion.id,
      working_version_id: pendingVersion.id,
      pending_version_id: null,
      revision_status: "No Pending Revision",
      last_updated: new Date().toISOString(),
    });
    await logActivity(log.id, "approval", `Revision v${pendingVersion.version_no} approved — data updated`);
    setApproving(false);
    refresh();
  };

  const handleReject = async () => {
    if (!pendingVersion || !currentData) return;
    setRejecting(true);
    await base44.entities.StationLogDataVersions.update(pendingVersion.id, {
      status: "Rejected", is_active: false, is_working: false,
    });
    await base44.entities.StationLogCurrentData.update(currentData.id, {
      pending_version_id: null,
      revision_status: "No Pending Revision",
      last_updated: new Date().toISOString(),
    });
    await logActivity(log.id, "rejection", `Revision v${pendingVersion.version_no} rejected`);
    setRejecting(false);
    refresh();
  };

  const handleSubmitDraft = async () => {
    if (!draftVersion || !currentData) return;
    setSubmittingDraft(true);
    await base44.entities.StationLogDataVersions.update(draftVersion.id, {
      status: "Pending Approval", is_active: false, is_working: false,
    });
    await base44.entities.StationLogCurrentData.update(currentData.id, {
      revision_status: "Revision Pending Approval",
      last_updated: new Date().toISOString(),
    });
    await logActivity(log.id, "draft_submitted", `Draft v${draftVersion.version_no} submitted for approval`, draftVersion.related_stage);
    setSubmittingDraft(false);
    refresh();
  };

  const handleDeleteDraft = async () => {
    if (!draftVersion || !currentData) return;
    if (!window.confirm(`Delete Draft v${draftVersion.version_no}? This cannot be undone.`)) return;
    setDeletingDraft(true);
    await base44.entities.StationLogDataVersions.delete(draftVersion.id);
    await base44.entities.StationLogCurrentData.update(currentData.id, {
      pending_version_id: null,
      revision_status: "No Pending Revision",
      last_updated: new Date().toISOString(),
    });
    await logActivity(log.id, "draft_deleted", `Draft v${draftVersion.version_no} deleted`);
    setDeletingDraft(false);
    refresh();
  };

  const handleCompleteStage = async () => {
    if (!readiness.ready) return;
    if (!window.confirm("Mark Stage 1: Order + Location as complete and advance to Stage 2?")) return;
    setCompleting(true);
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.StationLog.update(log.id, {
      current_stage: 2,
      current_status: "In Progress",
      can_move_forward: true,
      next_action: "Complete Work Categorization & Time Estimation",
    });
    await logActivity(log.id, "stage_complete", "Order + Location completed", 1);
    await base44.entities.StationLogMilestones.create({
      station_log_id: log.id,
      category: "Order",
      name: "Order + Location completed",
      related_stage: 1,
      milestone_date: new Date().toISOString(),
      source: "Stage Completion",
      is_important: true,
    });
    setCompleting(false);
    queryClient.invalidateQueries({ queryKey: ["stationLogs"] });
    refresh();
  };

  if (!currentData) {
    return (
      <div className="p-6 text-center space-y-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
        <p className="text-sm font-medium text-slate-600">No Order + Location data initialized yet.</p>
        <p className="text-xs text-slate-400">Initialize this stage to start tracking order and location information.</p>
        <InitialVersionDialog log={log} asset={asset} onSaved={refresh} />
      </div>
    );
  }

  const DEFAULT_OPEN_GROUPS = ["Order Info", "Location"];

  return (
    <div className="space-y-3">

      {/* ── Summary Card ── */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Active Version</p>
          <p className="font-bold text-slate-700">{activeVersion ? `v${activeVersion.version_no}` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Revision Status</p>
          <Badge className={`text-[10px] mt-0.5 ${
            draftVersion ? "bg-blue-100 text-blue-800" :
            pendingVersion ? "bg-yellow-100 text-yellow-800" :
            "bg-green-100 text-green-800"
          }`}>
            {draftVersion ? "Draft" : pendingVersion ? "Pending Approval" : "No Revision"}
          </Badge>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Bus Stop</p>
          <p className="text-slate-700 truncate">{currentData.bus_stop_name || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Municipality</p>
          <p className="text-slate-700">{currentData.municipality || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Location</p>
          <p className="text-slate-700 truncate">{currentData.location_address || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Order Deadline</p>
          <p className="text-slate-700">{currentData.order_deadline_date || "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Risk Level</p>
          <p className={`font-semibold ${currentData.risk_level === "High" ? "text-red-600" : currentData.risk_level === "Medium" ? "text-amber-600" : "text-slate-700"}`}>
            {currentData.risk_level || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Attachments</p>
          <p className="text-slate-700">{attachments.length}</p>
        </div>
      </div>

      {/* ── Header: actions row ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {activeVersion && <span className="text-xs text-slate-500">Active: v{activeVersion.version_no}</span>}
        </div>
        {!hasActiveRevision && (
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setShowRevisionDialog(true)}>
            <RefreshCw className="h-3 w-3" /> Request Revision
          </Button>
        )}
      </div>

      {/* ── Draft block ── */}
      {draftVersion && (
        <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-blue-900">Draft Revision v{draftVersion.version_no}</span>
            <span className="text-[11px] text-blue-700">— {draftVersion.source} · {draftVersion.date_of_request}</span>
            {draftVersion.restored_from_version_id && <Badge className="text-[10px] bg-purple-100 text-purple-700">Restored</Badge>}
          </div>
          {draftVersion.reason && <p className="text-[11px] text-blue-800 italic">{draftVersion.reason}</p>}
          <div className="flex gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1 text-[11px] h-6 border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => setEditDraftVersion(draftVersion)}>
              <RefreshCw className="h-3 w-3" /> Edit Draft
            </Button>
            <Button size="sm" className="gap-1 h-6 bg-blue-600 hover:bg-blue-700 text-white text-[11px]"
              disabled={submittingDraft} onClick={handleSubmitDraft}>
              <CheckCircle className="h-3 w-3" /> {submittingDraft ? "Submitting..." : "Submit for Approval"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-6 text-red-600 border-red-300 hover:bg-red-50 text-[11px]"
              disabled={deletingDraft} onClick={handleDeleteDraft}>
              <XCircle className="h-3 w-3" /> {deletingDraft ? "Deleting..." : "Delete Draft"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Pending Revision block ── */}
      {pendingVersion && (
        <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-yellow-900">Revision v{pendingVersion.version_no} pending approval</span>
            <span className="text-[11px] text-yellow-700">— {pendingVersion.source} · {pendingVersion.date_of_request}</span>
          </div>
          {pendingVersion.reason && <p className="text-[11px] text-yellow-800 italic">{pendingVersion.reason}</p>}
          <div className="flex gap-1.5">
            <Button size="sm" className="gap-1 h-6 bg-green-600 hover:bg-green-700 text-white text-[11px]" disabled={approving} onClick={handleApprove}>
              <CheckCircle className="h-3 w-3" /> {approving ? "Approving..." : "Approve"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1 h-6 text-red-600 border-red-300 hover:bg-red-50 text-[11px]" disabled={rejecting} onClick={handleReject}>
              <XCircle className="h-3 w-3" /> {rejecting ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Collapsible Data Groups ── */}
      {Object.entries(FIELD_GROUPS).map(([groupTitle, fields]) => (
        <CollapsibleSection
          key={groupTitle}
          title={groupTitle}
          defaultOpen={DEFAULT_OPEN_GROUPS.includes(groupTitle)}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {fields.map(key => {
              const val = currentData[key];
              const display = val === true ? "Yes" : val === false ? "No" : val;
              const isRequired = REQUIRED_FIELDS.some(f => f.key === key);
              const isEmpty = val == null || val === "";
              return (
                <div key={key} className={`p-1.5 rounded border ${isEmpty && isRequired ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"} ${key.includes("notes") || key.includes("description") ? "col-span-3" : ""}`}>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide leading-none">{formatLabel(key)}{isRequired && <span className="text-red-400 ml-0.5">*</span>}</p>
                  <p className="text-xs text-slate-800 mt-0.5 leading-tight">{display ?? <span className="text-slate-300">—</span>}</p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ))}

      {/* ── Attachments (collapsible) ── */}
      <CollapsibleSection title="Attachments / Photos" badge={attachments.length} defaultOpen={false}>
        <OrderAttachmentsPanel log={log} activeVersionId={activeVersion?.id} />
      </CollapsibleSection>

      {/* ── Version History (collapsible) ── */}
      {sortedVersions.length > 0 && (
        <CollapsibleSection title="Version History" badge={sortedVersions.length} defaultOpen={false}>
          <div className="space-y-1.5">
            {sortedVersions.map(v => (
              <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded border border-slate-200 bg-slate-50 flex-wrap">
                <span className="font-mono font-bold text-slate-700 text-xs w-6">v{v.version_no}</span>
                <Badge className={`text-[10px] ${
                  v.status === "Active" ? "bg-green-100 text-green-800" :
                  v.status === "Pending Approval" ? "bg-yellow-100 text-yellow-800" :
                  v.status === "Draft" ? "bg-blue-100 text-blue-800" :
                  v.status === "Rejected" ? "bg-red-100 text-red-800" :
                  v.status === "Superseded" ? "bg-slate-200 text-slate-500" :
                  "bg-slate-100 text-slate-600"
                }`}>{v.status}</Badge>
                {v.restored_from_version_id && <Badge className="text-[10px] bg-purple-100 text-purple-700">Restored</Badge>}
                <span className="text-[11px] text-slate-500 flex-1 truncate">{v.source} {v.date_of_request ? `· ${v.date_of_request}` : ""}</span>
                {v.reason && <span className="text-[10px] text-slate-400 italic truncate max-w-24">{v.reason}</span>}
                <div className="flex gap-1 ml-auto">
                  <Button size="sm" variant="outline" className="h-5 text-[10px] px-1.5 gap-0.5"
                    onClick={() => setViewVersion(v)}>
                    <Eye className="h-2.5 w-2.5" /> View
                  </Button>
                  {!hasActiveRevision && v.status !== "Pending Approval" && v.status !== "Draft" && (
                    <Button size="sm" variant="outline" className="h-5 text-[10px] px-1.5 gap-0.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                      onClick={() => setRestoreSourceVersion(v)}>
                      <RotateCcw className="h-2.5 w-2.5" /> Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Stage 1 Completion ── */}
      <div className={`rounded-lg border p-3 space-y-2 ${readiness.ready ? "border-green-300 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {readiness.ready
              ? <CheckCircle className="h-4 w-4 text-green-600" />
              : <AlertTriangle className="h-4 w-4 text-amber-500" />
            }
            <span className={`text-xs font-bold ${readiness.ready ? "text-green-800" : "text-slate-700"}`}>
              Stage 1 Completion: {readiness.ready ? "Ready to Complete" : "Not Ready"}
            </span>
          </div>
          <Button
            size="sm"
            disabled={!readiness.ready || completing || log.current_stage > 1}
            onClick={handleCompleteStage}
            className={`gap-1 text-xs h-7 ${readiness.ready && log.current_stage === 1 ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          >
            <Flag className="h-3 w-3" />
            {completing ? "Completing..." : log.current_stage > 1 ? "Already Completed" : "Complete Order + Location"}
          </Button>
        </div>
        {!readiness.ready && readiness.missing.length > 0 && (
          <ul className="space-y-0.5 mt-1">
            {readiness.missing.map((m, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                <span className="mt-0.5 text-amber-500 flex-shrink-0">•</span>
                {m}
              </li>
            ))}
          </ul>
        )}
        {log.current_stage > 1 && (
          <p className="text-[11px] text-green-700">Stage 1 was completed. Currently on Stage {log.current_stage}.</p>
        )}
      </div>

      {/* ── Dialogs ── */}
      {showRevisionDialog && (
        <RevisionFormDialog
          log={log}
          currentData={currentData}
          nextVersionNo={(Math.max(...versions.map(v => v.version_no), 0)) + 1}
          onSaved={() => { refresh(); setShowRevisionDialog(false); }}
          onClose={() => setShowRevisionDialog(false)}
        />
      )}
      {editDraftVersion && (
        <EditDraftDialog
          log={log}
          draftVersion={editDraftVersion}
          onSaved={() => { refresh(); setEditDraftVersion(null); }}
          onClose={() => setEditDraftVersion(null)}
        />
      )}
      {restoreSourceVersion && (
        <RestoreVersionDialog
          log={log}
          sourceVersion={restoreSourceVersion}
          nextVersionNo={(Math.max(...versions.map(v => v.version_no), 0)) + 1}
          currentData={currentData}
          onSaved={() => { refresh(); setRestoreSourceVersion(null); }}
          onClose={() => setRestoreSourceVersion(null)}
        />
      )}
      {viewVersion && (
        <ViewVersionDialog version={viewVersion} onClose={() => setViewVersion(null)} />
      )}
    </div>
  );
}

// ─── Initialize Dialog ─────────────────────────────────────────────────────────
function InitialVersionDialog({ log, asset, onSaved }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    authority_order_reference: asset?.asset_id || "",
    order_received_date: "",
    order_received_from: "",
    order_type: "",
    order_priority: "",
    order_priority_date: "",
    order_deadline_date: "",
    order_description: "",
    order_notes: "",
    bus_stop_name: asset?.location_address || "",
    location_address: asset?.location_address || "",
    municipality: asset?.municipality || "",
    district: "",
    area: "",
    latitude: asset?.latitude || "",
    longitude: asset?.longitude || "",
    map_link: "",
    shelter_type: "",
    installation_type: "",
    intervention_scope: "",
    road_side: "",
    traffic_direction: "",
    existing_infrastructure_type: "",
    pavement_type: "",
    pavement_width: "",
    has_tactile_paving: "",
    has_bus_bay: "",
    has_road_marking: "",
    requires_footway: "",
    access_notes: "",
    has_underground_utilities: "",
    utility_type: "",
    traffic_impact_level: "",
    requires_traffic_management: "",
    requires_permits: "",
    permit_type: "",
    site_constraints_notes: "",
    risk_level: "",
    risk_description: "",
  });

  const handleSave = async () => {
    setSaving(true);
    const me = await getCurrentUser();
    const version = await base44.entities.StationLogDataVersions.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      version_no: 1,
      status: "Active",
      is_active: true,
      is_working: true,
      source: "A.A. Order",
      date_of_request: new Date().toISOString().split("T")[0],
      reason: "Initial version",
      related_stage: 1,
      created_by: me?.email || "",
      ...pickDataFields(form),
    });
    await base44.entities.StationLogCurrentData.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      active_version_id: version.id,
      working_version_id: version.id,
      pending_version_id: null,
      revision_status: "No Pending Revision",
      last_updated: new Date().toISOString(),
      ...pickDataFields(form),
    });
    await logActivity(log.id, "create", "Initial version v1 created for Order + Location");
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-2">
        <h2 className="text-base font-bold text-slate-800">Initialize Order + Location (v1)</h2>
        {Object.entries(FIELD_GROUPS).map(([groupTitle, fields]) => (
          <FormSection key={groupTitle} title={groupTitle} fields={fields} form={form} setForm={setForm} />
        ))}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Initialize"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Revision Dialog ───────────────────────────────────────────────────────────
function RevisionFormDialog({ log, currentData, nextVersionNo, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({
    source: "Site Finding",
    reason: "",
    date_of_request: new Date().toISOString().split("T")[0],
    related_stage: 1,
  });
  const [form, setForm] = useState(pickDataFields(currentData));

  const handleSave = async () => {
    if (!meta.reason) return alert("Please provide a reason for this revision.");
    setSaving(true);
    const me = await getCurrentUser();
    const version = await base44.entities.StationLogDataVersions.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      version_no: nextVersionNo,
      status: "Pending Approval",
      is_active: false,
      is_working: false,
      source: meta.source,
      date_of_request: meta.date_of_request,
      reason: meta.reason,
      related_stage: meta.related_stage,
      created_by: me?.email || "",
      ...pickDataFields(form),
    });
    await base44.entities.StationLogCurrentData.update(currentData.id, {
      pending_version_id: version.id,
      revision_status: "Revision Pending Approval",
      last_updated: new Date().toISOString(),
    });
    await logActivity(log.id, "revision_submitted", `Revision v${nextVersionNo} submitted for approval — ${meta.reason}`, meta.related_stage);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-2">
        <h2 className="text-base font-bold text-slate-800">Request Revision (v{nextVersionNo})</h2>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Source *</label>
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={meta.source} onChange={e => setMeta(m => ({ ...m, source: e.target.value }))}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Date of Request *</label>
            <input type="date" className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={meta.date_of_request} onChange={e => setMeta(m => ({ ...m, date_of_request: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Identified in Stage *</label>
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={meta.related_stage} onChange={e => setMeta(m => ({ ...m, related_stage: Number(e.target.value) }))}>
              {STAGES.map(s => <option key={s} value={s}>Stage {s} — {STAGE_NAMES[s]}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Reason *</label>
            <textarea className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm h-16"
              value={meta.reason} onChange={e => setMeta(m => ({ ...m, reason: e.target.value }))}
              placeholder="Describe why this revision is needed..." />
          </div>
        </div>

        {/* Data fields grouped */}
        {Object.entries(FIELD_GROUPS).map(([groupTitle, fields]) => (
          <FormSection key={groupTitle} title={groupTitle} fields={fields} form={form} setForm={setForm} />
        ))}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Submit for Approval"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Draft Dialog ─────────────────────────────────────────────────────────
function EditDraftDialog({ log, draftVersion, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(pickDataFields(draftVersion));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.StationLogDataVersions.update(draftVersion.id, pickDataFields(form));
    await logActivity(log.id, "draft_edited", `Draft v${draftVersion.version_no} edited`, draftVersion.related_stage);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-2">
        <h2 className="text-base font-bold text-slate-800">Edit Draft v{draftVersion.version_no}</h2>
        <p className="text-xs text-slate-500">Changes are saved to the draft only. The active data is unchanged until the draft is approved.</p>
        {Object.entries(FIELD_GROUPS).map(([groupTitle, fields]) => (
          <FormSection key={groupTitle} title={groupTitle} fields={fields} form={form} setForm={setForm} />
        ))}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Restore Version Dialog ────────────────────────────────────────────────────
function RestoreVersionDialog({ log, sourceVersion, nextVersionNo, currentData, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({
    source: "Internal Review",
    reason: `Restored from Version ${sourceVersion.version_no}`,
    date_of_request: new Date().toISOString().split("T")[0],
    related_stage: log.current_stage || 1,
  });

  // Preview of key fields copied
  const previewFields = ["bus_stop_name", "location_address", "municipality", "installation_type",
    "road_side", "authority_order_reference", "order_type", "order_priority", "risk_level"];

  const handleSave = async () => {
    setSaving(true);
    const me = await getCurrentUser();
    const copiedData = pickDataFields(sourceVersion);
    const newDraft = await base44.entities.StationLogDataVersions.create({
      station_log_id: log.id,
      asset_id: log.asset_id,
      version_no: nextVersionNo,
      status: "Draft",
      is_active: false,
      is_working: false,
      source: meta.source,
      date_of_request: meta.date_of_request,
      reason: meta.reason,
      related_stage: meta.related_stage,
      restored_from_version_id: sourceVersion.id,
      created_by: me?.email || "",
      ...copiedData,
    });
    // Update CurrentData to reflect draft
    if (currentData) {
      await base44.entities.StationLogCurrentData.update(currentData.id, {
        pending_version_id: newDraft.id,
        revision_status: "Draft Revision",
        last_updated: new Date().toISOString(),
      });
    }
    await logActivity(
      log.id,
      "restore",
      `Version v${sourceVersion.version_no} restored as new draft revision v${nextVersionNo}`,
      meta.related_stage
    );
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-purple-600" />
          <h2 className="text-base font-bold text-slate-800">Restore v{sourceVersion.version_no} as New Revision (v{nextVersionNo})</h2>
        </div>

        {/* Source version summary */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
          <p className="text-xs font-bold text-purple-800 uppercase">Copying from Version {sourceVersion.version_no}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {previewFields.map(key => (
              sourceVersion[key] != null && sourceVersion[key] !== "" ? (
                <div key={key} className="text-xs">
                  <span className="text-slate-500">{formatLabel(key)}: </span>
                  <span className="text-slate-800 font-medium">
                    {sourceVersion[key] === true ? "Yes" : sourceVersion[key] === false ? "No" : String(sourceVersion[key])}
                  </span>
                </div>
              ) : null
            ))}
          </div>
          <p className="text-xs text-purple-600 mt-1">All other fields will also be copied. You can edit after creation.</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Source *</label>
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={meta.source} onChange={e => setMeta(m => ({ ...m, source: e.target.value }))}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Date of Request *</label>
            <input type="date" className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={meta.date_of_request} onChange={e => setMeta(m => ({ ...m, date_of_request: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Identified in Stage *</label>
            <select className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
              value={meta.related_stage} onChange={e => setMeta(m => ({ ...m, related_stage: Number(e.target.value) }))}>
              {STAGES.map(s => <option key={s} value={s}>Stage {s} — {STAGE_NAMES[s]}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Reason *</label>
            <textarea className="mt-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm h-16"
              value={meta.reason} onChange={e => setMeta(m => ({ ...m, reason: e.target.value }))} />
          </div>
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
          This will create a new <strong>Draft</strong> revision (v{nextVersionNo}). The current active data will remain unchanged until this draft is submitted for approval and approved.
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave}>
            {saving ? "Creating Draft..." : "Create Draft Revision"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── View Version Dialog ───────────────────────────────────────────────────────
function ViewVersionDialog({ version, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Version {version.version_no} — Read Only</h2>
            <Badge className={`text-xs ${
              version.status === "Active" ? "bg-green-100 text-green-800" :
              version.status === "Pending Approval" ? "bg-yellow-100 text-yellow-800" :
              version.status === "Draft" ? "bg-blue-100 text-blue-800" :
              version.status === "Rejected" ? "bg-red-100 text-red-800" :
              "bg-slate-100 text-slate-600"
            }`}>{version.status}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div><span className="text-slate-500">Source:</span> <span className="font-medium">{version.source || "—"}</span></div>
          <div><span className="text-slate-500">Date:</span> <span className="font-medium">{version.date_of_request || "—"}</span></div>
          <div><span className="text-slate-500">Stage:</span> <span className="font-medium">{version.related_stage ? `${version.related_stage} — ${STAGE_NAMES[version.related_stage]}` : "—"}</span></div>
          <div><span className="text-slate-500">Created by:</span> <span className="font-medium">{version.created_by || "—"}</span></div>
          {version.restored_from_version_id && (
            <div className="col-span-2"><span className="text-purple-600">Restored from an earlier version</span></div>
          )}
          <div className="col-span-2"><span className="text-slate-500">Reason:</span> <span className="font-medium">{version.reason || "—"}</span></div>
        </div>

        {Object.entries(FIELD_GROUPS).map(([groupTitle, fields]) => (
          <div key={groupTitle}>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 border-b border-slate-100 pb-1">{groupTitle}</p>
            <div className="grid grid-cols-2 gap-2">
              {fields.map(key => (
                <DataField key={key} label={formatLabel(key)} value={version[key]} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}