import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Loader2 } from "lucide-react";
import Stage3LeftPanel from "@/components/stationlogs/stage3/Stage3LeftPanel";

export default function StationLogSidePanel({ asset, onClose }) {
  const assetRecordId = asset?.id;

  // Find StationLog by asset_id field (stores the asset record ID)
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["stationLogForAsset", assetRecordId],
    queryFn: () => base44.entities.StationLog.filter({ asset_id: assetRecordId }),
    enabled: !!assetRecordId,
  });

  const log = logs[0] || null;

  // Load current data version
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
        ) : (
          <Stage3LeftPanel
            stationData={stationData}
            asset={asset}
            log={log}
            stage2Summary={null}
          />
        )}
      </div>
    </div>
  );
}