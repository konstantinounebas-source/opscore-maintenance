import React from "react";

export default function MapSummaryStrip({ assets, assignments, selectedWeekId }) {
  const assignedCount = assignments.length;
  const unassignedCount = assets.length - assignedCount;

  return (
    <div className="absolute bottom-1.5 left-1.5 right-1.5 z-[500] pointer-events-none">
      <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
          <span className="text-[9px] text-slate-500">
            Visible: <b className="text-slate-700">{assets.length}</b>
          </span>
          <span className="text-[9px] text-emerald-600">
            Assigned: <b>{assignedCount}</b>
          </span>
          <span className="text-[9px] text-slate-400">
            Unassigned: <b>{unassignedCount}</b>
          </span>
          {!selectedWeekId && (
            <span className="text-[9px] text-slate-300 italic">No week selected</span>
          )}
        </div>
      </div>
    </div>
  );
}