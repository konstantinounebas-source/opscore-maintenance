import React, { useState, useMemo } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignmentStatusColor, priorityBucketColor } from "./planningUtils";

const PANEL_THEME = [
  { border: "border-indigo-300", header: "bg-indigo-50 border-indigo-200 text-indigo-800", dot: "bg-indigo-400" },
  { border: "border-emerald-300", header: "bg-emerald-50 border-emerald-200 text-emerald-800", dot: "bg-emerald-400" },
  { border: "border-amber-300",   header: "bg-amber-50 border-amber-200 text-amber-800",   dot: "bg-amber-400" },
  { border: "border-purple-300",  header: "bg-purple-50 border-purple-200 text-purple-800", dot: "bg-purple-400" },
];

export default function MapWeekPanel({
  panelIndex, state, onUpdate, panelData, assets, weeks,
}) {
  const theme = PANEL_THEME[panelIndex];
  const { filteredAssignments } = panelData;
  const [listOpen, setListOpen] = useState(true);

  const selectedWeek = useMemo(() => weeks.find(w => w.id === state.selectedWeekId), [weeks, state.selectedWeekId]);
  const selectedAsset = useMemo(() => state.selectedAssetId ? assets.find(a => a.id === state.selectedAssetId) : null, [assets, state.selectedAssetId]);

  const kpis = useMemo(() => ({
    planned:    filteredAssignments.filter(a => a.assignment_status === "Planned").length,
    inProgress: filteredAssignments.filter(a => a.assignment_status === "In Progress").length,
    completed:  filteredAssignments.filter(a => a.assignment_status === "Completed").length,
    deferred:   filteredAssignments.filter(a => a.assignment_status === "Deferred").length,
    p1:         filteredAssignments.filter(a => a.priority_bucket === "P1").length,
    p2:         filteredAssignments.filter(a => a.priority_bucket === "P2").length,
  }), [filteredAssignments]);

  // If no asset selected, show a compact placeholder
  if (!selectedAsset) {
    return (
      <div className={`flex flex-col h-full rounded-lg border-2 ${theme.border} bg-white overflow-hidden`}>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b shrink-0 ${theme.header}`}>
          <div className={`w-2 h-2 rounded-full ${theme.dot}`} />
          <span className="text-[11px] font-bold tracking-wide">Map {panelIndex + 1}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-3 gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">Click an asset on<br />Map {panelIndex + 1} to manage</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full rounded-lg border-2 ${theme.border} bg-white overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-2.5 py-1.5 border-b shrink-0 ${theme.header}`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${theme.dot}`} />
          <span className="text-[11px] font-bold tracking-wide">Map {panelIndex + 1} — <span className="font-mono">{selectedAsset.active_shelter_id || selectedAsset.asset_id}</span></span>
        </div>
        {selectedWeek && (
          <span className="text-[9px] font-mono font-semibold opacity-60">{selectedWeek.week_code}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Week selector */}
        <div className="px-2 pt-2 pb-1.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <CalendarDays className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Week</span>
          </div>
          <Select
            value={state.selectedWeekId || "__none__"}
            onValueChange={v => onUpdate({ selectedWeekId: v === "__none__" ? "" : v })}
          >
            <SelectTrigger className="h-6 text-[10px] border-slate-200 bg-white">
              <SelectValue placeholder="— All assets —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— All assets (no week) —</SelectItem>
              {weeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="font-mono text-[10px]">{w.week_code}</span>
                  <span className="ml-1.5 text-slate-500 text-[10px]">{w.week_name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        {filteredAssignments.length > 0 && (
          <div className="px-2 py-1.5 border-b border-slate-100 shrink-0">
            <div className="grid grid-cols-3 gap-1">
              <KPI label="Planned"  value={kpis.planned}    color="text-blue-600" />
              <KPI label="In Prog"  value={kpis.inProgress} color="text-amber-600" />
              <KPI label="Done"     value={kpis.completed}  color="text-emerald-600" />
              <KPI label="Deferred" value={kpis.deferred}   color="text-purple-600" />
              <KPI label="P1"       value={kpis.p1}         color="text-red-600" bold />
              <KPI label="P2"       value={kpis.p2}         color="text-orange-600" bold />
            </div>
          </div>
        )}

        {/* Assignments list */}
        <div className="flex-1 flex flex-col min-h-0">
          <button
            onClick={() => setListOpen(v => !v)}
            className="w-full flex items-center justify-between px-2 py-1.5 border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Assignments</span>
              {filteredAssignments.length > 0 && (
                <span className="text-[9px] rounded px-1 font-semibold bg-slate-200 text-slate-600">{filteredAssignments.length}</span>
              )}
            </div>
            {listOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          {listOpen && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredAssignments.length === 0 ? (
                <div className="py-4 text-center text-[10px] text-slate-400">
                  {state.selectedWeekId ? "No assignments match" : "Select a week"}
                </div>
              ) : (
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-2 py-1 text-slate-500 font-semibold">ID</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">Type</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">Status</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map(asgn => {
                      const asset = assets.find(a => a.id === asgn.asset_id);
                      const isSelected = state.selectedAssetId === asgn.asset_id;
                      return (
                        <tr
                          key={asgn.id}
                          onClick={() => onUpdate({ selectedAssetId: isSelected ? null : asgn.asset_id })}
                          className={`cursor-pointer border-b border-slate-50 transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-2 py-0.5 font-mono font-semibold">{asset?.active_shelter_id || asset?.asset_id || "—"}</td>
                          <td className="px-1 py-0.5 text-slate-500 truncate max-w-[55px]">{asgn.assignment_type || "—"}</td>
                          <td className="px-1 py-0.5">
                            <span className={`inline-block px-1 rounded text-[9px] font-medium border ${assignmentStatusColor(asgn.assignment_status)}`}>
                              {asgn.assignment_status?.replace("In Progress", "InProg") || "—"}
                            </span>
                          </td>
                          <td className="px-1 py-0.5">
                            {asgn.priority_bucket && (
                              <span className={`inline-block px-1 rounded text-[9px] font-bold border ${priorityBucketColor(asgn.priority_bucket)}`}>
                                {asgn.priority_bucket}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color, bold }) {
  return (
    <div className="flex items-center justify-between py-0.5 bg-slate-50 rounded px-1.5">
      <span className="text-[8px] text-slate-400">{label}</span>
      <span className={`text-[10px] font-${bold ? "extrabold" : "semibold"} ${color}`}>{value}</span>
    </div>
  );
}