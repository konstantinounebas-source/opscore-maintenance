import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Stage3LeftPanel from "@/components/stationlogs/stage3/Stage3LeftPanel";
import { minutesToDisplay } from "@/components/stationlogs/settings/workrules/workRulesUtils";

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

export default function StationLogSidePanel({ asset, onClose }) {
  const assetRecordId = asset?.id;
  const [activeTab, setActiveTab] = useState("stage1");

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

  const stationData = currentDataList[0] || null;
  const isLoading = loadingLogs || (log && loadingData);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{asset?.asset_id || "—"}</p>
          <p className="text-[10px] text-slate-400 truncate">{asset?.location_address || asset?.city || "Station Log"}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
          <Stage3LeftPanel
            stationData={stationData}
            asset={asset}
            log={log}
            stage2Summary={null}
          />
        ) : (
          <Stage2Summary logId={log.id} />
        )}
      </div>
    </div>
  );
}