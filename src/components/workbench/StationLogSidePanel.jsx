import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Clock, CheckCircle2, AlertCircle, MapPin, Camera, Eye, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Stage3LeftPanel from "@/components/stationlogs/stage3/Stage3LeftPanel";
import MapillaryViewer from "./MapillaryViewer";
import { minutesToDisplay } from "@/components/stationlogs/settings/workrules/workRulesUtils";
import { FileText, Image as ImageIcon } from "lucide-react";

function Stage2Summary({ logId }) {
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ["stage2Allocations", logId],
    queryFn: () => base44.entities.StationLogStage2WorkAllocations.filter({ station_log_id: logId, is_active: true }),
    enabled: !!logId,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["stationLogResourceTypes"],
    queryFn: () => base44.entities.StationLogResourceTypes.list(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const selected = allocations.filter(a => a.selected !== false);
  const totalMinutes = selected.reduce((s, r) => s + (r.total_minutes || 0), 0);

  // Resource breakdown
  const breakdown = {};
  selected.forEach(row => {
    const res = resources.find(r => r.id === row.resource_type_id);
    const name = res?.resource_name || row.resource_type_name_snapshot || "Unknown";
    if (!breakdown[name]) breakdown[name] = { count: 0, minutes: 0 };
    breakdown[name].count++;
    breakdown[name].minutes += row.total_minutes || 0;
  });

  // Group by category
  const groups = {};
  allocations.forEach(row => {
    const cat = row.category_name_snapshot || "Uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(row);
  });

  if (allocations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No work allocation saved yet for Stage 2.</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Summary totals */}
      <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Summary</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Total Works</span>
          <span className="font-semibold text-slate-800">{selected.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Total Time</span>
          <span className="font-mono font-semibold text-slate-800">{minutesToDisplay(totalMinutes)}</span>
        </div>
      </div>

      {/* Resource breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Resource Breakdown</p>
          <div className="space-y-1.5">
            {Object.entries(breakdown).map(([name, data]) => (
              <div key={name} className="flex items-center gap-2 bg-white border border-slate-200 rounded px-2.5 py-1.5">
                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700 flex-1">{name}</span>
                <span className="text-[10px] text-slate-400">{data.count} work{data.count !== 1 ? "s" : ""}</span>
                <span className="text-xs font-mono text-slate-800">{minutesToDisplay(data.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work items by category */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Work Items</p>
        <div className="space-y-3">
          {Object.entries(groups).map(([cat, rows]) => (
            <div key={cat}>
              <p className="text-[11px] font-semibold text-slate-600 mb-1">{cat}</p>
              <div className="space-y-1">
                {rows.map(row => (
                  <div
                    key={row.id}
                    className={`flex items-start gap-2 px-2.5 py-2 rounded border text-xs ${
                      row.selected === false
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {row.selected !== false
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      : <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{row.work_name_snapshot}</p>
                      <p className="text-[10px] text-slate-400">{row.trigger_value_snapshot || "—"} · {minutesToDisplay(row.total_minutes || 0)}</p>
                    </div>
                    {row.rule_match_status === "no_longer_matches" && (
                      <span className="text-[9px] border border-amber-300 text-amber-600 rounded px-1 shrink-0">Outdated</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StationLogSidePanel({ asset, onClose, incidents = [], workOrders = [], weeks = [], planningTypes = [], allAssignments = [], onSaveAssignment, onZoomToAsset }) {
  const assetRecordId = asset?.id;
  const [activeTab, setActiveTab] = useState("stage1");
  const [planningTypeId, setPlanningTypeId] = useState("");
  const [weekId, setWeekId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMapillary, setShowMapillary] = useState(false);

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["stationLogForAsset", assetRecordId],
    queryFn: () => base44.entities.StationLog.filter({ asset_id: assetRecordId }),
    enabled: !!assetRecordId,
  });

  const log = logs[0] || null;

  const { data: currentDataList = [], isLoading: loadingData } = useQuery({
    queryKey: ["stationLogCurrentData", log?.id],
    queryFn: () => base44.entities.StationLogCurrentData.filter({ station_log_id: log.id }),
    enabled: !!log?.id,
  });

  const { data: attachments = [], isLoading: loadingAttachments } = useQuery({
    queryKey: ["stationLogOrderAttachments", log?.id],
    queryFn: () => base44.entities.StationLogOrderAttachments.filter({ station_log_id: log.id }),
    enabled: !!log?.id,
  });

  const stationData = currentDataList[0] || null;
  const isLoading = loadingLogs || (log && loadingData) || loadingAttachments;

  // Asset assignment logic
  const assignment = allAssignments.find(a => a.asset_id === asset?.id);
  const assignedWeek = assignment ? weeks.find(w => w.id === assignment.planning_week_id) : null;
  const assetIncidents = (incidents || []).filter(i => i.related_asset_id === asset?.id);
  const assetWorkOrders = (workOrders || []).filter(w => w.related_asset_id === asset?.id);
  const filteredWeeks = planningTypeId ? (weeks || []).filter(w => w.planning_type_id === planningTypeId) : (weeks || []);

  React.useEffect(() => {
    if (assignment) {
      setPlanningTypeId(assignment.planning_type_id || "");
      setWeekId(assignment.planning_week_id || "");
    } else {
      setPlanningTypeId("");
      setWeekId("");
    }
  }, [assignment?.id]);

  const handleAssign = async () => {
    if (!weekId || !planningTypeId) return;
    setSaving(true);
    try {
      const formData = {
        planning_type_id: planningTypeId,
        planning_week_id: weekId,
        asset_id: asset.id,
      };
      await onSaveAssignment?.(formData, assignment?.id);
    } catch (err) {
      console.error("Error saving assignment:", err);
    }
    setSaving(false);
  };

  const handleClearAssignment = async () => {
    setSaving(true);
    try {
      if (assignment?.id) {
        const formData = {
          planning_type_id: "",
          planning_week_id: "",
          asset_id: asset.id,
        };
        await onSaveAssignment?.(formData, assignment.id);
      }
    } catch (err) {
      console.error("Error clearing assignment:", err);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate">{asset?.asset_id || "—"}</p>
          <p className="text-[10px] text-slate-400 truncate">{asset?.location_address || asset?.city || "Station Log"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button 
            onClick={() => onZoomToAsset?.(asset)} 
            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
            title="Zoom to location"
          >
            <MapPin className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={() => setShowMapillary(true)} 
            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
            title="Street view"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Asset Info Card (Assignment UI) */}
      <div className="px-3 py-3 bg-white border-b border-slate-200 space-y-2.5 shrink-0">
        {/* Status line */}
        <div className="space-y-1.5 text-xs border-b border-slate-100 pb-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-medium text-slate-700">{asset?.status || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Assigned Week:</span>
            <span className={`font-medium ${assignment ? "text-slate-700" : "text-amber-600"}`}>
              {assignment ? `${assignedWeek?.week_code || "—"}` : "Unassigned"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Shelter Type:</span>
            <span className="font-medium text-slate-700">{asset?.ordered_shelter_type || "—"}</span>
          </div>
          {assetIncidents.length > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>{assetIncidents.length} incident{assetIncidents.length !== 1 ? "s" : ""}</span>
            </div>
          )}
          {assetWorkOrders.length > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Wrench className="h-3 w-3" />
              <span>{assetWorkOrders.length} work order{assetWorkOrders.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Assignment form */}
        <div className="space-y-2">
          <div>
            <label className="text-[10px] font-semibold text-slate-600">Planning Type</label>
            <Select value={planningTypeId} onValueChange={setPlanningTypeId}>
              <SelectTrigger className="mt-1 text-xs h-7">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {planningTypes.map(pt => (
                  <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-600">Planning Week</label>
            <Select value={weekId} onValueChange={setWeekId} disabled={!planningTypeId}>
              <SelectTrigger className="mt-1 text-xs h-7">
                <SelectValue placeholder={planningTypeId ? "Select week..." : "Select type first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Unassigned</SelectItem>
                {filteredWeeks.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.week_code} - {w.week_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-7 text-xs"
              onClick={handleAssign}
              disabled={saving || !weekId || !planningTypeId}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {saving ? "Saving..." : assignment ? "Update" : "Assign"}
            </Button>
            {assignment && (
              <Button
                className="bg-red-500 hover:bg-red-600 h-7 text-xs"
                onClick={handleClearAssignment}
                disabled={saving}
              >
                Unassign
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {log && (
        <div className="flex border-b border-slate-200 shrink-0 bg-white">
          {["stage1", "stage2"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab === "stage1" ? "Stage 1" : "Stage 2"}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : !log ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400">No Station Log found for this asset.</p>
            <p className="text-xs text-slate-300 mt-1">{asset?.asset_id}</p>
          </div>
        ) : activeTab === "stage1" ? (
          <div className="space-y-0">
            <Stage3LeftPanel
              stationData={stationData}
              asset={asset}
              log={log}
              stage2Summary={null}
            />
            {/* Attachments section */}
            {attachments.length > 0 && (
              <div className="p-3 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Attachments</p>
                <div className="space-y-1.5">
                  {attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      {att.file_type === "photo" || att.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs text-slate-700 truncate flex-1">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            <Stage2Summary logId={log.id} />
            {/* Attachments section */}
            {attachments.length > 0 && (
              <div className="p-3 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Attachments</p>
                <div className="space-y-1.5">
                  {attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      {att.file_type === "photo" || att.file_name?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs text-slate-700 truncate flex-1">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mapillary Viewer */}
      <MapillaryViewer 
        asset={asset} 
        isOpen={showMapillary} 
        onClose={() => setShowMapillary(false)} 
      />
    </div>
  );
}