import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Search, ChevronDown, ChevronRight, Download,
  CheckCircle2, Clock, AlertTriangle, Zap, Users, Wrench
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

export default function PlanningReviewPanel({ weeks, allAssignments, assetsMap, incidentsByAsset, workOrdersByAsset }) {
  // ── Panel-local state — NEVER shared with maps ─────────────────────────────
  const [weekSearch, setWeekSearch] = useState("");
  const [weekStatusFilter, setWeekStatusFilter] = useState("__all__");
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [expandedWeekIds, setExpandedWeekIds] = useState({});
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("__all__");

  const filteredWeeks = useMemo(() => {
    let list = weeks;
    if (weekSearch) {
      const q = weekSearch.toLowerCase();
      list = list.filter(w =>
        w.week_code?.toLowerCase().includes(q) ||
        w.week_name?.toLowerCase().includes(q)
      );
    }
    if (weekStatusFilter !== "__all__") {
      list = list.filter(w => w.status === weekStatusFilter);
    }
    return list;
  }, [weeks, weekSearch, weekStatusFilter]);

  const selectedWeek = useMemo(() => weeks.find(w => w.id === selectedWeekId), [weeks, selectedWeekId]);

  const weekAssignments = useMemo(() => {
    if (!selectedWeekId) return [];
    let list = allAssignments.filter(a => a.planning_week_id === selectedWeekId);
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
  }, [selectedWeekId, allAssignments, assignmentSearch, assignmentStatusFilter, assetsMap]);

  // KPIs for selected week
  const kpis = useMemo(() => {
    if (!selectedWeekId) return null;
    const wa = allAssignments.filter(a => a.planning_week_id === selectedWeekId);
    return {
      total:       wa.length,
      planned:     wa.filter(a => a.assignment_status === "Planned").length,
      inProgress:  wa.filter(a => a.assignment_status === "In Progress").length,
      completed:   wa.filter(a => a.assignment_status === "Completed").length,
      critical:    wa.filter(a => a.priority_bucket === "P1" || a.priority_bucket === "Critical").length,
      withIncident:wa.filter(a => incidentsByAsset[a.asset_id]?.length > 0).length,
      withWO:      wa.filter(a => workOrdersByAsset[a.asset_id]?.length > 0).length,
    };
  }, [selectedWeekId, allAssignments, incidentsByAsset, workOrdersByAsset]);

  const handleExportCSV = () => {
    if (!selectedWeek || weekAssignments.length === 0) return;
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
    link.download = `${selectedWeek.week_code}_assignments.csv`;
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

      {/* Week search + filter */}
      <div className="px-3 py-2 border-b border-slate-200 space-y-1.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={weekSearch}
            onChange={e => setWeekSearch(e.target.value)}
            placeholder="Search weeks..."
            className="pl-7 h-7 text-xs"
          />
        </div>
        <Select value={weekStatusFilter} onValueChange={setWeekStatusFilter}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent style={{ zIndex: 99999 }}>
            <SelectItem value="__all__">All statuses</SelectItem>
            {["Active","Draft","Locked","Archived"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Week list */}
      <div className="flex-1 overflow-y-auto">
        {filteredWeeks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">No planning weeks found</p>
          </div>
        )}

        {filteredWeeks.map(week => {
          const weekCount = allAssignments.filter(a => a.planning_week_id === week.id).length;
          const isSelected = selectedWeekId === week.id;

          return (
            <div key={week.id}>
              <button
                onClick={() => setSelectedWeekId(isSelected ? null : week.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                  isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-400" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isSelected ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
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
                    <span className="text-[10px] text-slate-400">{weekCount} assigned</span>
                  </div>
                </div>
              </button>

              {/* Expanded: KPIs + assignments */}
              {isSelected && (
                <div className="bg-indigo-50/30 border-b border-slate-200">
                  {/* KPI row */}
                  {kpis && (
                    <div className="grid grid-cols-4 gap-0 px-4 py-3 border-b border-indigo-100">
                      <KPIChip label="Total" value={kpis.total} color="text-slate-700" />
                      <KPIChip label="Planned" value={kpis.planned} color="text-slate-600" />
                      <KPIChip label="In Prog." value={kpis.inProgress} color="text-blue-600" />
                      <KPIChip label="Done" value={kpis.completed} color="text-emerald-600" />
                    </div>
                  )}
                  {kpis && (kpis.critical > 0 || kpis.withIncident > 0 || kpis.withWO > 0) && (
                    <div className="grid grid-cols-3 gap-0 px-4 pb-3 border-b border-indigo-100">
                      <KPIChip label="Critical" value={kpis.critical} color="text-red-600" />
                      <KPIChip label="Incidents" value={kpis.withIncident} color="text-orange-600" />
                      <KPIChip label="Work Ord." value={kpis.withWO} color="text-amber-600" />
                    </div>
                  )}

                  {/* Assignment search + filter */}
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                      <Input
                        value={assignmentSearch}
                        onChange={e => setAssignmentSearch(e.target.value)}
                        placeholder="Search assignments..."
                        className="pl-6 h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Select value={assignmentStatusFilter} onValueChange={setAssignmentStatusFilter}>
                        <SelectTrigger className="h-7 text-xs flex-1 mr-2"><SelectValue /></SelectTrigger>
                        <SelectContent style={{ zIndex: 99999 }}>
                          <SelectItem value="__all__">All statuses</SelectItem>
                          {["Planned","In Progress","Completed","Deferred","Cancelled"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button onClick={handleExportCSV} title="Export CSV" className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-white border border-slate-200">
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Assignment list */}
                  <div className="max-h-72 overflow-y-auto">
                    {weekAssignments.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">No assignments match filters</div>
                    ) : weekAssignments.map(a => {
                      const asset = assetsMap[a.asset_id];
                      if (!asset) return null;
                      const hasIncident = incidentsByAsset[a.asset_id]?.length > 0;
                      const hasWO = workOrdersByAsset[a.asset_id]?.length > 0;
                      return (
                        <div key={a.id} className="flex items-start gap-2 px-4 py-2.5 border-b border-indigo-50 hover:bg-white/70 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-slate-700">{asset.asset_id}</span>
                              {asset.active_shelter_id && (
                                <span className="text-[10px] text-slate-400">{asset.active_shelter_id}</span>
                              )}
                              {hasIncident && <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" title="Has incidents" />}
                              {hasWO && <Wrench className="h-3 w-3 text-amber-500 shrink-0" title="Has work orders" />}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{asset.city} · {asset.shelter_type}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {a.assignment_status && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${ASSIGNMENT_STATUS_COLORS[a.assignment_status] || "bg-slate-100 text-slate-600"}`}>
                                  {a.assignment_status}
                                </span>
                              )}
                              {a.assignment_type && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                  {a.assignment_type}
                                </span>
                              )}
                              {a.priority_bucket && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium">
                                  {a.priority_bucket}
                                </span>
                              )}
                            </div>
                            {(a.assigned_to || a.team_name) && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {a.assigned_to}{a.assigned_to && a.team_name ? " · " : ""}{a.team_name}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}