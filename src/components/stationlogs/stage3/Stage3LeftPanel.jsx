import React from "react";
import { MapPin, AlertCircle, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Stage3LeftPanel({ stationData, asset, log, stage2Summary }) {
  return (
    <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-4">
      {/* Station Info */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase">Station Info</h3>
        <div className="space-y-1.5">
          {asset?.asset_code && (
            <div className="text-[10px]">
              <p className="text-slate-500 uppercase font-semibold">Bus Stop ID</p>
              <p className="text-slate-800 font-mono font-bold">{asset.asset_code}</p>
            </div>
          )}
          {stationData?.bus_stop_name && (
            <div className="text-[10px]">
              <p className="text-slate-500 uppercase font-semibold">Name</p>
              <p className="text-slate-800">{stationData.bus_stop_name}</p>
            </div>
          )}
          {stationData?.municipality && (
            <div className="text-[10px]">
              <p className="text-slate-500 uppercase font-semibold">Municipality</p>
              <p className="text-slate-800">{stationData.municipality}</p>
            </div>
          )}
          {stationData?.location_address && (
            <div className="text-[10px]">
              <p className="text-slate-500 uppercase font-semibold">Address</p>
              <p className="text-slate-800">{stationData.location_address}</p>
            </div>
          )}
          {stationData?.shelter_type && (
            <div className="text-[10px]">
              <p className="text-slate-500 uppercase font-semibold">Shelter Type</p>
              <p className="text-slate-800">{stationData.shelter_type}</p>
            </div>
          )}
          {stationData?.risk_level && (
            <div className="text-[10px] flex items-center gap-2">
              <p className="text-slate-500 uppercase font-semibold">Risk Level</p>
              <Badge className={`text-[9px] ${
                stationData.risk_level === "High" ? "bg-red-100 text-red-700" :
                stationData.risk_level === "Medium" ? "bg-amber-100 text-amber-700" :
                "bg-green-100 text-green-700"
              }`}>
                {stationData.risk_level}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Stage 1 Date Constraints */}
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase">Stage 1 Constraints</h3>
        <div className="space-y-1.5">
          {stationData?.order_received_date && (
            <div className="p-2 bg-slate-50 rounded border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Order Received</p>
              <p className="text-sm font-mono text-slate-800">{stationData.order_received_date}</p>
            </div>
          )}
          {stationData?.order_deadline_date && (
            <div className="p-2 bg-slate-50 rounded border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Final Deadline</p>
              <p className="text-sm font-mono text-slate-800">{stationData.order_deadline_date}</p>
            </div>
          )}
          {stationData?.order_priority_date && (
            <div className="p-2 bg-slate-50 rounded border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Priority Deadline</p>
              <p className="text-sm font-mono text-slate-800">{stationData.order_priority_date}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage 2 Planning Input */}
      {stage2Summary && (
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-600 uppercase">Stage 2 Summary</h3>
          <div className="space-y-1.5">
            <div className="p-2 bg-blue-50 rounded border border-blue-100">
              <p className="text-[10px] text-blue-600 uppercase font-semibold">Total Time</p>
              <p className="text-sm font-mono font-bold text-blue-900">{stage2Summary.totalTime}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded border border-blue-100">
              <p className="text-[10px] text-blue-600 uppercase font-semibold">Selected Works</p>
              <p className="text-sm font-bold text-blue-900">{stage2Summary.worksCount} items</p>
            </div>
            {stage2Summary.resourceBreakdown && stage2Summary.resourceBreakdown.length > 0 && (
              <div className="p-2 bg-blue-50 rounded border border-blue-100">
                <p className="text-[10px] text-blue-600 uppercase font-semibold mb-1.5">Resources</p>
                <div className="space-y-1">
                  {stage2Summary.resourceBreakdown.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-blue-800 font-medium">{r.name}</span>
                      <span className="text-[10px] text-blue-700 font-mono">{r.display}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Link */}
      {stationData?.latitude && stationData?.longitude && (
        <div className="border-t border-slate-200 pt-4">
          <a
            href={`https://www.google.com/maps/@${stationData.latitude},${stationData.longitude},17z`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-700 hover:bg-blue-100 transition-colors text-xs font-semibold"
          >
            <MapPin className="h-3.5 w-3.5" />
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}