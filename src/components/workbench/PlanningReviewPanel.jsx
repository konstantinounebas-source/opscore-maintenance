import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarDays, Search, ChevronDown, ChevronRight, Download, X,
  CheckCircle2, Clock, AlertTriangle, Zap, Users, Wrench, MapPin, Edit3
} from "lucide-react";
import { format } from "date-fns";

const WEEK_STATUS_COLORS = {
  Active:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  Draft:    "bg-slate-100 text-slate-600 border-slate-200",
  Locked:   "bg-amber-100 text-amber-700 border-amber-200",
  Archived: "bg-slate-100 text-slate-400 border-slate-200",
};

const ASSIGNMENT_STATUS_COLORS = {
  Planned:     "bg-slate-100 text-slate-600",
  "In Progress":"bg-blue-100 text-blue-700",
  Completed:   "bg-emerald-100 text-emerald-700",
  Deferred:    "bg-purple-100 text-purple-700",
  Cancelled:   "bg-red-100 text-red-500",
};

function KPIChip({ label, value, color = "text-slate-700" }) {
  return (
    <div className="text-center">
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-slate-400 uppercase tracking-wide leading-none mt-0.5">{label}</div>
    </div>
  );
}

export default function PlanningReviewPanel({ 
  weeks, 
  allAssignments, 
  assetsMap, 
  incidentsByAsset, 
  workOrdersByAsset,
  onSelectAssetForPopup,
  onOpenAssignmentModal
}) {
  // ── Panel-local state — NEVER shared with maps ─────────────────────────────
  const [weekSearch, setWeekSearch] = useState("");
  const [selectedPlanningTypeIds, setSelectedPlanningTypeIds] = useState(new Set());
  const [selectedWeekIds, setSelectedWeekIds] = useState(new Set());
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("__all__");
  const [weeksDropdownOpen, setWeeksDropdownOpen] = useState(false);
  const [weekFilterSearch, setWeekFilterSearch] = useState("");
  const [expandedWeekIds, setExpandedWeekIds] = useState(new Set());
  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState(new Set());

  // Fetch planning types from API
  const { data: planningTypes = [] } = useQuery({
    queryKey: ["planningTypes"],
    queryFn: () => base44.entities.PlanningTypes.list(),
  });

  const filteredWeeks = useMemo(() => {
    let list = weeks;
    if (selectedPlanningTypeIds.size > 0) {
      list = list.filter(w => selectedPlanningTypeIds.has(w.planning_type_id));
    }
    return list;
  }, [weeks, selectedPlanningTypeIds]);

  const selectedWeeks = useMemo(() => weeks.filter(w => selectedWeekIds.has(w.id)), [weeks, selectedWeekIds]);

  const weekAssignments = useMemo(() => {
    if (selectedWeekIds.size === 0) return [];
    let list = allAssignments.filter(a => selectedWeekIds.has(a.planning_week_id));
    if (assignmentSearch) {
      const q = assignmentSearch.toLowerCase();
      list = list.filter(a => {
        const asset = assetsMap[a.asset_id];
        return (
          asset?.asset_id?.toLowerCase().includes(q) ||
          asset?.city?.toLowerCase().includes(q) ||
          a.assignment_type?.toLowerCase().includes(q) ||
          a.assigned_to?.toLowerCase().includes(q)
        );
      });
    }
    if (assignmentStatusFilter !== "__all__") {
      list = list.filter(a => a.assignment_status === assignmentStatusFilter);
    }
    return list;
  }, [selectedWeekIds, allAssignments, assignmentSearch, assignmentStatusFilter, assetsMap]);

  // KPIs for selected weeks
  const kpis = useMemo(() => {
    if (selectedWeekIds.size === 0) return null;
    const wa = allAssignments.filter(a => selectedWeekIds.has(a.planning_week_id));
    return {
      total:       wa.length,
      planned:     wa.filter(a => a.assignment_status === "Planned").length,
      inProgress:  wa.filter(a => a.assignment_status === "In Progress").length,
      completed:   wa.filter(a => a.assignment_status === "Completed").length,
      critical:    wa.filter(a => a.priority_bucket === "P1" || a.priority_bucket === "Critical").length,
      withIncident:wa.filter(a => incidentsByAsset[a.asset_id]?.length > 0).length,
      withWO:      wa.filter(a => workOrdersByAsset[a.asset_id]?.length > 0).length,
    };
  }, [selectedWeekIds, allAssignments, incidentsByAsset, workOrdersByAsset]);

  const handleExportCSV = () => {
    if (selectedWeeks.length === 0 || weekAssignments.length === 0) return;
    const rows = [["Asset ID", "City", "Type", "Status", "Priority", "Team", "Assigned To"]];
    weekAssignments.forEach(a => {
      const asset = assetsMap[a.asset_id] || {};
      rows.push([asset.asset_id, asset.city, a.assignment_type, a.assignment_status, a.priority_bucket, a.team_name, a.assigned_to].map(v => v ?? ""));
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weeks_${Array.from(selectedWeekIds).join("_")}_assignments.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };



  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-700">Planning Review</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">Read-only review of planned work. Does not affect maps.</p>
      </div>

      {/* Planning Type selector */}
        <div className="px-3 py-2 border-b border-slate-200 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Planning Types</label>
            {selectedPlanningTypeIds.size > 0 && (
              <button
                onClick={() => setSelectedPlanningTypeIds(new Set())}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
          {planningTypes.length === 0 ? (
            <p className="text-[10px] text-slate-400 px-2 py-2">Loading types...</p>
          ) : (
            <div className="space-y-1">
              {planningTypes.map(pt => (
                <label
                  key={pt.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlanningTypeIds.has(pt.id)}
                    onChange={() => {
                      const newSet = new Set(selectedPlanningTypeIds);
                      if (newSet.has(pt.id)) {
                        newSet.delete(pt.id);
                      } else {
                        newSet.add(pt.id);
                      }
                      setSelectedPlanningTypeIds(newSet);
                      setSelectedWeekIds(new Set());
                    }}
                    className="w-3 h-3"
                  />
                  <span className="text-slate-700">{pt.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

       {/* Week selector dropdown */}
       <div className="px-3 py-2 border-b border-slate-200 space-y-1.5 shrink-0">
         <div className="flex items-center justify-between">
           <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Weeks ({selectedWeekIds.size})</label>
           {selectedWeekIds.size > 0 && (
             <button
               onClick={() => setSelectedWeekIds(new Set())}
               className="text-[10px] text-slate-400 hover:text-slate-600"
             >
               Clear
             </button>
           )}
         </div>

         <Popover open={weeksDropdownOpen} onOpenChange={setWeeksDropdownOpen}>
           <PopoverTrigger asChild>
             <button className="w-full h-7 px-3 py-1 text-xs border border-input rounded-md bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-between">
               <span>{selectedWeekIds.size > 0 ? `${selectedWeekIds.size} selected` : "All statuses"}</span>
               <ChevronDown className="h-3 w-3 text-slate-400" />
             </button>
           </PopoverTrigger>
           <PopoverContent className="w-56 p-0" align="start">
             <div className="p-2 space-y-2">
               <input
                 type="text"
                 placeholder="Search weeks..."
                 value={weekFilterSearch}
                 onChange={(e) => setWeekFilterSearch(e.target.value)}
                 className="w-full h-7 px-2 text-xs border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
               />
               <div className="space-y-1.5 max-h-96 overflow-y-auto">
                 {filteredWeeks.filter(w => 
                   w.week_code.toLowerCase().includes(weekFilterSearch.toLowerCase()) ||
                   w.week_name.toLowerCase().includes(weekFilterSearch.toLowerCase())
                 ).length === 0 ? (
                   <div className="text-center py-4 text-xs text-slate-400">
                     {selectedPlanningTypeIds.size === 0 ? "Select planning types above" : "No weeks found"}
                   </div>
                 ) : (
                   filteredWeeks.filter(w => 
                     w.week_code.toLowerCase().includes(weekFilterSearch.toLowerCase()) ||
                     w.week_name.toLowerCase().includes(weekFilterSearch.toLowerCase())
                   ).map(week => {
                     const planningType = planningTypes.find(pt => pt.id === week.planning_type_id);
                     return (
                   <label
                     key={week.id}
                     className="flex items-center gap-2 p-2 rounded text-xs cursor-pointer hover:bg-slate-100 transition-colors"
                   >
                     <input
                       type="checkbox"
                       checked={selectedWeekIds.has(week.id)}
                       onChange={() => {
                         const newSet = new Set(selectedWeekIds);
                         if (newSet.has(week.id)) {
                           newSet.delete(week.id);
                         } else {
                           newSet.add(week.id);
                         }
                         setSelectedWeekIds(newSet);
                       }}
                       className="w-3 h-3 shrink-0"
                     />
                     <div className="flex-1 min-w-0">
                       <div className="font-semibold text-slate-700">{week.week_code}</div>
                       <div className="text-[9px] text-slate-500">{planningType?.name || "—"}</div>
                     </div>
                   </label>
                   );
                   })
                   )}
             </div>
             </div>
             </PopoverContent>
         </Popover>
       </div>

      {/* Week details view (when weeks selected) */}
      <div className="flex-1 overflow-y-auto">
        {selectedWeekIds.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Select weeks from dropdown above</p>
          </div>
        ) : (
          selectedWeekIds.size > 0 && weeks.filter(w => selectedWeekIds.has(w.id)).map(week => {
            const weekCount = allAssignments.filter(a => a.planning_week_id === week.id).length;
            const isExpanded = expandedWeekIds.has(week.id);
            const wa = allAssignments.filter(a => a.planning_week_id === week.id);
            const weekAssignmentsByType = {};
            wa.forEach(a => {
              const type = a.assignment_type || "Other";
              weekAssignmentsByType[type] = (weekAssignmentsByType[type] || 0) + 1;
            });

            return (
              <div key={week.id}>
                <button
                  onClick={() => {
                    const newSet = new Set(expandedWeekIds);
                    if (newSet.has(week.id)) {
                      newSet.delete(week.id);
                    } else {
                      newSet.add(week.id);
                    }
                    setExpandedWeekIds(newSet);
                  }}
                  className="w-full px-4 py-3 border-b border-slate-100 bg-indigo-50 border-l-2 border-l-indigo-400 hover:bg-indigo-100 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`h-3.5 w-3.5 text-indigo-500 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        <span className="text-xs font-bold text-slate-700">{week.week_code}</span>
                        {week.is_active && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
                      </div>
                      <p className="text-xs text-slate-500 ml-5 truncate">{week.week_name}</p>
                      <p className="text-[10px] text-slate-400 ml-5">
                        {week.start_date && (() => { try { return format(new Date(week.start_date), "MMM d"); } catch { return ""; } })()}
                        {" – "}
                        {week.end_date && (() => { try { return format(new Date(week.end_date), "MMM d, yyyy"); } catch { return ""; } })()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${WEEK_STATUS_COLORS[week.status] || WEEK_STATUS_COLORS.Draft}`}>
                        {week.status}
                      </span>
                      {!isExpanded && (
                        <span className="text-[10px] text-slate-400">{weekCount} assigned</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Summary row - always visible */}
                <div className="px-4 py-2 bg-indigo-50/50 border-b border-slate-100">
                   {/* Assignment types row */}
                   <div className="flex flex-wrap gap-3 mb-2">
                     {Object.entries(weekAssignmentsByType).map(([type, count]) => (
                       <div key={type} className="text-center text-xs">
                         <div className="font-semibold text-slate-700">{count}</div>
                         <div className="text-[9px] text-slate-500">{type}</div>
                       </div>
                     ))}
                   </div>
                   {/* Ordered shelter types row */}
                   <div className="text-[9px] text-slate-500 pt-1 border-t border-indigo-100">
                     {(() => {
                       const shelterCounts = {};
                       wa.forEach(a => {
                         const asset = assetsMap[a.asset_id];
                         if (asset?.ordered_shelter_type) {
                           shelterCounts[asset.ordered_shelter_type] = (shelterCounts[asset.ordered_shelter_type] || 0) + 1;
                         }
                       });
                       return Object.entries(shelterCounts).length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                           {Object.entries(shelterCounts).map(([shelter, count]) => (
                             <span key={shelter} className="text-slate-600">
                               {shelter}: <strong>{count}</strong>
                             </span>
                           ))}
                         </div>
                       ) : (
                         <span className="text-slate-400">—</span>
                       );
                     })()}
                   </div>
                 </div>

                {/* Expanded assignments list */}
                {isExpanded && (
                  <div className="bg-white border-b border-slate-100">
                    {wa.filter(a => a.assignment_type === "Inspection").length > 0 && (
                      <div className="border-b border-slate-100">
                        <button
                          onClick={() => {
                            const inspectionAssignments = wa.filter(a => a.assignment_type === "Inspection");
                            const newSet = new Set(expandedAssignmentIds);
                            const key = `${week.id}-inspection`;
                            if (newSet.has(key)) {
                              newSet.delete(key);
                            } else {
                              newSet.add(key);
                            }
                            setExpandedAssignmentIds(newSet);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                        >
                          <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expandedAssignmentIds.has(`${week.id}-inspection`) ? "rotate-90" : ""}`} />
                          <span className="text-xs font-semibold text-slate-700">Inspection</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded ml-auto">
                            {wa.filter(a => a.assignment_type === "Inspection").length}
                          </span>
                        </button>

                        {expandedAssignmentIds.has(`${week.id}-inspection`) && (
                          <div className="bg-slate-50">
                            {wa.filter(a => a.assignment_type === "Inspection").map(a => {
                              const asset = assetsMap[a.asset_id];
                              return (
                                <div key={a.id} className="px-4 py-2 border-b border-slate-100 text-xs flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-slate-700">{asset?.asset_id || a.asset_id}</div>
                                    <div className="text-[9px] text-slate-500 truncate">
                                      {asset?.ordered_shelter_type || "—"}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onSelectAssetForPopup?.(asset); }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                                      title="View asset"
                                    >
                                      <MapPin className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onOpenAssignmentModal?.(asset, a); }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                                      title="Assign"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                   </div>
                   );
                  })
                  )}
      </div>
    </div>
  );
}