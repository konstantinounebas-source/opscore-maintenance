import React, { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronDown, ChevronUp, X } from "lucide-react";
import MultiMapInstance from "./MultiMapInstance";
import { assignmentStatusColor, priorityBucketColor } from "./planningUtils";

const ASSIGNMENT_TYPES = ["Make Safe", "Corrective"];
const PRIORITIES = ["P1", "P2"];
const STATUSES = ["Planned", "In Progress", "Completed", "Deferred"];

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors"><X className="w-2.5 h-2.5" /></button>
    </span>
  );
}

function KPIRow({ label, value, color = "text-slate-700" }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className={`text-[11px] font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default function MultiMapPanel({
  panelIndex,
  assets,
  allAssignments,
  weeks,
  crews,
}) {
  const label = `Map ${panelIndex + 1}`;

  // Per-panel state
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCrew, setFilterCrew] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [filterAssetState, setFilterAssetState] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [kpiOpen, setKpiOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);

  // Derived
  const weekAssignments = useMemo(() =>
    selectedWeekId ? allAssignments.filter(a => a.planning_week_id === selectedWeekId) : [],
    [allAssignments, selectedWeekId]
  );

  const assignmentByAsset = useMemo(() => {
    const m = {};
    weekAssignments.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [weekAssignments]);

  const cities = useMemo(() => [...new Set(assets.map(a => a.city).filter(Boolean))].sort(), [assets]);
  const municipalities = useMemo(() => [...new Set(assets.map(a => a.municipality).filter(Boolean))].sort(), [assets]);
  const activeCrew = useMemo(() => crews.filter(c => c.is_active !== false), [crews]);

  const ASSET_STATE_MAP = {
    "Active": ["Delivered", "Active"],
    "Under Maintenance": ["Under Maintenance"],
    "Installed": ["Installed"],
  };

  // Filter pipeline
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Asset state
      if (filterAssetState) {
        const allowed = ASSET_STATE_MAP[filterAssetState] || [filterAssetState];
        if (!allowed.includes(a.status)) return false;
      }
      // City
      if (filterCity && a.city !== filterCity) return false;
      // Municipality
      if (filterMunicipality && a.municipality !== filterMunicipality) return false;

      const asgn = assignmentByAsset[a.id];

      // Assignment filters (only apply if week selected)
      if (selectedWeekId) {
        if (filterStatus && (!asgn || asgn.assignment_status !== filterStatus)) return false;
        if (filterType && (!asgn || asgn.assignment_type !== filterType)) return false;
        if (filterPriority && (!asgn || asgn.priority_bucket !== filterPriority)) return false;
        if (filterCrew && (!asgn || asgn.crew_id !== filterCrew)) return false;
      }

      return true;
    });
  }, [assets, filterAssetState, filterCity, filterMunicipality, filterStatus, filterType, filterPriority, filterCrew, assignmentByAsset, selectedWeekId]);

  const filteredAssignments = useMemo(() => {
    const ids = new Set(filteredAssets.map(a => a.id));
    return weekAssignments.filter(a => ids.has(a.asset_id));
  }, [filteredAssets, weekAssignments]);

  // KPIs
  const kpis = useMemo(() => ({
    total: filteredAssets.length,
    planned: filteredAssignments.filter(a => a.assignment_status === "Planned").length,
    inProgress: filteredAssignments.filter(a => a.assignment_status === "In Progress").length,
    completed: filteredAssignments.filter(a => a.assignment_status === "Completed").length,
    deferred: filteredAssignments.filter(a => a.assignment_status === "Deferred").length,
    p1: filteredAssignments.filter(a => a.priority_bucket === "P1").length,
    p2: filteredAssignments.filter(a => a.priority_bucket === "P2").length,
  }), [filteredAssets, filteredAssignments]);

  const activeFiltersCount = [filterStatus, filterType, filterPriority, filterCrew, filterCity, filterMunicipality, filterAssetState].filter(Boolean).length;

  const handleSelectAsset = (asset) => {
    setSelectedAssetId(prev => prev === asset.id ? null : asset.id);
  };

  const selectedWeek = weeks.find(w => w.id === selectedWeekId);

  const panelColors = ["border-indigo-300", "border-emerald-300", "border-amber-300", "border-purple-300"];
  const panelHeaderColors = ["bg-indigo-50 text-indigo-800", "bg-emerald-50 text-emerald-800", "bg-amber-50 text-amber-800", "bg-purple-50 text-purple-800"];

  return (
    <div className={`flex flex-col h-full border-2 ${panelColors[panelIndex]} rounded-lg overflow-hidden bg-white`}>
      {/* Panel Header */}
      <div className={`px-2.5 py-1.5 flex items-center justify-between shrink-0 ${panelHeaderColors[panelIndex]} border-b`}>
        <span className="text-xs font-bold tracking-wide uppercase">{label}</span>
        {selectedWeek && (
          <span className="text-[10px] font-medium opacity-70">{selectedWeek.week_code}</span>
        )}
        {activeFiltersCount > 0 && (
          <span className="text-[10px] bg-white/60 rounded px-1 py-0.5 font-semibold">{activeFiltersCount} filter{activeFiltersCount > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Scrollable controls area */}
      <div className="flex flex-col overflow-y-auto shrink-0" style={{ maxHeight: "55%" }}>

        {/* Week Selector */}
        <div className="px-2 pt-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1 mb-1">
            <CalendarDays className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Week</span>
          </div>
          <Select value={selectedWeekId} onValueChange={v => setSelectedWeekId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-7 text-xs border-slate-200">
              <SelectValue placeholder="All weeks (no filter)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— All assets, no week —</SelectItem>
              {weeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="font-mono text-xs">{w.week_code}</span>
                  <span className="ml-1.5 text-slate-500">{w.week_name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters Section */}
        <div className="border-b border-slate-100">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Filters</span>
            {filtersOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          {filtersOpen && (
            <div className="px-2 pb-2 space-y-1.5">
              {/* Active Chips */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {filterAssetState && <FilterChip label={filterAssetState} onRemove={() => setFilterAssetState("")} />}
                  {filterStatus && <FilterChip label={filterStatus} onRemove={() => setFilterStatus("")} />}
                  {filterType && <FilterChip label={filterType} onRemove={() => setFilterType("")} />}
                  {filterPriority && <FilterChip label={filterPriority} onRemove={() => setFilterPriority("")} />}
                  {filterCrew && <FilterChip label={activeCrew.find(c => c.id === filterCrew)?.crew_name || filterCrew} onRemove={() => setFilterCrew("")} />}
                  {filterCity && <FilterChip label={filterCity} onRemove={() => setFilterCity("")} />}
                  {filterMunicipality && <FilterChip label={filterMunicipality} onRemove={() => setFilterMunicipality("")} />}
                </div>
              )}

              {/* A. Asset State */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Asset State</div>
                <Select value={filterAssetState} onValueChange={v => setFilterAssetState(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-6 text-xs border-slate-200"><SelectValue placeholder="All states" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All states</SelectItem>
                    <SelectItem value="Active">Active / Available</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Installed">Installed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* B. Assignment Status */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Assignment Status</div>
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-6 text-xs border-slate-200"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* C. Type */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Type</div>
                <Select value={filterType} onValueChange={v => setFilterType(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-6 text-xs border-slate-200"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    {ASSIGNMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* D. Priority */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Priority</div>
                <div className="flex gap-1">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      onClick={() => setFilterPriority(prev => prev === p ? "" : p)}
                      className={`flex-1 text-[10px] font-bold py-0.5 rounded border transition-colors ${
                        filterPriority === p
                          ? p === "P1" ? "bg-red-500 text-white border-red-500" : "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </div>

              {/* E. Crew */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Crew</div>
                <Select value={filterCrew} onValueChange={v => setFilterCrew(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-6 text-xs border-slate-200"><SelectValue placeholder="All crews" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All crews</SelectItem>
                    {activeCrew.map(c => <SelectItem key={c.id} value={c.id}>{c.crew_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* F. Location */}
              <div>
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">City</div>
                <Select value={filterCity} onValueChange={v => setFilterCity(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-6 text-xs border-slate-200"><SelectValue placeholder="All cities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All cities</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {municipalities.length > 0 && (
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Δήμος</div>
                  <Select value={filterMunicipality} onValueChange={v => setFilterMunicipality(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-6 text-xs border-slate-200"><SelectValue placeholder="All municipalities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All municipalities</SelectItem>
                      {municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* KPI Counters */}
        <div className="border-b border-slate-100">
          <button
            onClick={() => setKpiOpen(v => !v)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 transition-colors"
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">KPIs</span>
            {kpiOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>
          {kpiOpen && (
            <div className="px-2 pb-2">
              <KPIRow label="Total assets" value={kpis.total} color="text-slate-800" />
              <KPIRow label="Planned" value={kpis.planned} color="text-blue-700" />
              <KPIRow label="In Progress" value={kpis.inProgress} color="text-amber-700" />
              <KPIRow label="Completed" value={kpis.completed} color="text-emerald-700" />
              <KPIRow label="Deferred" value={kpis.deferred} color="text-purple-700" />
              <div className="flex gap-3 mt-1">
                <div className="flex-1 bg-red-50 rounded px-1.5 py-1 text-center">
                  <div className="text-[9px] text-red-500 font-semibold">P1</div>
                  <div className="text-sm font-bold text-red-700">{kpis.p1}</div>
                </div>
                <div className="flex-1 bg-orange-50 rounded px-1.5 py-1 text-center">
                  <div className="text-[9px] text-orange-500 font-semibold">P2</div>
                  <div className="text-sm font-bold text-orange-700">{kpis.p2}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MultiMapInstance
          assets={filteredAssets}
          assignments={filteredAssignments}
          selectedAssetId={selectedAssetId}
          onSelectAsset={handleSelectAsset}
        />
      </div>

      {/* Assignment List */}
      <div className="shrink-0 border-t border-slate-100" style={{ maxHeight: "28%" }}>
        <button
          onClick={() => setListOpen(v => !v)}
          className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-50 transition-colors"
        >
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            Assignments {filteredAssignments.length > 0 && `(${filteredAssignments.length})`}
          </span>
          {listOpen ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
        </button>
        {listOpen && (
          <div className="overflow-y-auto" style={{ maxHeight: "120px" }}>
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-3 text-[10px] text-slate-400">
                {selectedWeekId ? "No assignments match filters" : "Select a week to see assignments"}
              </div>
            ) : (
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-1.5 py-0.5 text-slate-500 font-medium">ID</th>
                    <th className="text-left px-1.5 py-0.5 text-slate-500 font-medium">City</th>
                    <th className="text-left px-1.5 py-0.5 text-slate-500 font-medium">Type</th>
                    <th className="text-left px-1.5 py-0.5 text-slate-500 font-medium">Status</th>
                    <th className="text-left px-1.5 py-0.5 text-slate-500 font-medium">Pri</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(asgn => {
                    const asset = filteredAssets.find(a => a.id === asgn.asset_id);
                    const isSelected = selectedAssetId === asgn.asset_id;
                    return (
                      <tr
                        key={asgn.id}
                        onClick={() => {
                          setSelectedAssetId(prev => prev === asgn.asset_id ? null : asgn.asset_id);
                        }}
                        className={`cursor-pointer border-b border-slate-50 transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-1.5 py-0.5 font-mono">{asset?.active_shelter_id || asset?.asset_id || "—"}</td>
                        <td className="px-1.5 py-0.5 text-slate-500 truncate max-w-[60px]">{asset?.city || "—"}</td>
                        <td className="px-1.5 py-0.5 text-slate-500">{asgn.assignment_type || "—"}</td>
                        <td className="px-1.5 py-0.5">
                          <span className={`inline-block px-1 rounded text-[9px] font-medium ${assignmentStatusColor(asgn.assignment_status)}`}>
                            {asgn.assignment_status}
                          </span>
                        </td>
                        <td className="px-1.5 py-0.5">
                          {asgn.priority_bucket && (
                            <span className={`inline-block px-1 rounded text-[9px] font-bold ${priorityBucketColor(asgn.priority_bucket)}`}>
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
  );
}