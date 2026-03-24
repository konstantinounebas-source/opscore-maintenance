import React, { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronDown, ChevronUp, X, Plus, Loader2 } from "lucide-react";
import { assignmentStatusColor, priorityBucketColor } from "./planningUtils";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const ASSIGNMENT_TYPES = ["Make Safe", "Corrective"];
const PRIORITIES = ["P1", "P2"];
const STATUSES = ["Planned", "In Progress", "Completed", "Deferred"];

const PANEL_THEME = [
  { border: "border-indigo-300", header: "bg-indigo-50 border-indigo-200 text-indigo-800", label: "Panel 1", dot: "bg-indigo-400" },
  { border: "border-emerald-300", header: "bg-emerald-50 border-emerald-200 text-emerald-800", label: "Panel 2", dot: "bg-emerald-400" },
  { border: "border-amber-300", header: "bg-amber-50 border-amber-200 text-amber-800", label: "Panel 3", dot: "bg-amber-400" },
  { border: "border-purple-300", header: "bg-purple-50 border-purple-200 text-purple-800", label: "Panel 4", dot: "bg-purple-400" },
];

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors ml-0.5">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

function SectionHeader({ title, count, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-50 transition-colors border-b border-slate-100"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        {count != null && <span className="text-[9px] bg-slate-200 text-slate-600 rounded px-1 font-semibold">{count}</span>}
      </div>
      {open ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

const DEFAULT_WEEK_FORM = {
  week_code: "", week_name: "", start_date: "", end_date: "",
};
const DEFAULT_ASGN_FORM = {
  assignment_type: "Corrective", assignment_status: "Planned", priority_bucket: "P2",
  planned_date: "", notes: "",
};

export default function MultiMapControlPanel({
  panelIndex,
  state,
  onUpdate,
  panelData,
  assets,
  weeks,
  crews,
}) {
  const theme = PANEL_THEME[panelIndex];
  const { filteredAssets, filteredAssignments } = panelData;
  const queryClient = useQueryClient();

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [kpiOpen, setKpiOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Asset search
  const [assetSearch, setAssetSearch] = useState("");

  // Create week + assignment form
  const [weekForm, setWeekForm] = useState(DEFAULT_WEEK_FORM);
  const [asgnForm, setAsgnForm] = useState(DEFAULT_ASGN_FORM);
  const [selectedAssetForCreate, setSelectedAssetForCreate] = useState("");
  const [selectedWeekForCreate, setSelectedWeekForCreate] = useState("__new__");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const cities = useMemo(() => [...new Set(assets.map(a => a.city).filter(Boolean))].sort(), [assets]);
  const municipalities = useMemo(() => [...new Set(assets.map(a => a.municipality).filter(Boolean))].sort(), [assets]);
  const activeCrew = useMemo(() => crews.filter(c => c.is_active !== false), [crews]);
  const selectedWeek = useMemo(() => weeks.find(w => w.id === state.selectedWeekId), [weeks, state.selectedWeekId]);

  const kpis = useMemo(() => ({
    total: filteredAssets.length,
    planned: filteredAssignments.filter(a => a.assignment_status === "Planned").length,
    inProgress: filteredAssignments.filter(a => a.assignment_status === "In Progress").length,
    completed: filteredAssignments.filter(a => a.assignment_status === "Completed").length,
    deferred: filteredAssignments.filter(a => a.assignment_status === "Deferred").length,
    p1: filteredAssignments.filter(a => a.priority_bucket === "P1").length,
    p2: filteredAssignments.filter(a => a.priority_bucket === "P2").length,
  }), [filteredAssets, filteredAssignments]);

  const activeFilters = [
    state.filterAssetState, state.filterStatus, state.filterType, state.filterPriority,
    state.filterCrew, state.filterCity, state.filterMunicipality, assetSearch,
  ].filter(Boolean).length;

  const set = (key) => (v) => onUpdate({ [key]: v === "__all__" || v === "__none__" ? "" : v });

  // Asset search filter (applied after all other filters)
  const assetSearchLower = assetSearch.trim().toLowerCase();
  const displayedAssets = assetSearch
    ? filteredAssets.filter(a =>
        (a.active_shelter_id || "").toLowerCase().includes(assetSearchLower) ||
        (a.asset_id || "").toLowerCase().includes(assetSearchLower) ||
        (a.city || "").toLowerCase().includes(assetSearchLower) ||
        (a.location_address || "").toLowerCase().includes(assetSearchLower)
      )
    : filteredAssets;

  // Create week + assignment handler
  const handleCreate = async () => {
    if (!selectedAssetForCreate) { setSaveMsg("Select an asset."); return; }
    setSaving(true); setSaveMsg("");
    try {
      let weekId = selectedWeekForCreate;
      if (selectedWeekForCreate === "__new__") {
        if (!weekForm.week_code || !weekForm.start_date || !weekForm.end_date) {
          setSaveMsg("Fill in Week Code, Start & End dates."); setSaving(false); return;
        }
        const newWeek = await base44.entities.PlanningWeeks.create({
          ...weekForm, status: "Draft",
        });
        weekId = newWeek.id;
        queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      }
      await base44.entities.PlanningAssignments.create({
        planning_week_id: weekId,
        asset_id: selectedAssetForCreate,
        ...asgnForm,
      });
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
      setSaveMsg("✓ Created successfully!");
      setWeekForm(DEFAULT_WEEK_FORM);
      setAsgnForm(DEFAULT_ASGN_FORM);
      setSelectedAssetForCreate("");
      setSelectedWeekForCreate("__new__");
      // auto-select the week in this panel
      onUpdate({ selectedWeekId: weekId });
    } catch (e) {
      setSaveMsg("Error: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className={`flex flex-col h-full rounded-lg border-2 ${theme.border} bg-white overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-2.5 py-1.5 border-b ${theme.header} shrink-0`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${theme.dot}`} />
          <span className="text-[11px] font-bold tracking-wide">{theme.label} — Map {panelIndex + 1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedWeek && (
            <span className="text-[9px] font-mono font-semibold opacity-60">{selectedWeek.week_code}</span>
          )}
          {activeFilters > 0 && (
            <span className="text-[9px] bg-white/70 rounded px-1 py-0.5 font-bold border border-current/20">
              {activeFilters} filter{activeFilters > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* Week Selector */}
        <div className="px-2 pt-2 pb-1.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-1 mb-1">
            <CalendarDays className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Week</span>
          </div>
          <Select value={state.selectedWeekId || "__none__"} onValueChange={set("selectedWeekId")}>
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

        {/* FILTERS */}
        <div className="border-b border-slate-100 shrink-0">
          <SectionHeader title="Filters" count={activeFilters || null} open={filtersOpen} onToggle={() => setFiltersOpen(v => !v)} />
          {filtersOpen && (
            <div className="px-2 py-2 space-y-1.5">
              {/* Active filter chips */}
              {activeFilters > 0 && (
                <div className="flex flex-wrap gap-1 pb-1">
                  {state.filterAssetState && <FilterChip label={state.filterAssetState} onRemove={() => onUpdate({ filterAssetState: "" })} />}
                  {state.filterStatus && <FilterChip label={state.filterStatus} onRemove={() => onUpdate({ filterStatus: "" })} />}
                  {state.filterType && <FilterChip label={state.filterType} onRemove={() => onUpdate({ filterType: "" })} />}
                  {state.filterPriority && <FilterChip label={state.filterPriority} onRemove={() => onUpdate({ filterPriority: "" })} />}
                  {state.filterCrew && <FilterChip label={activeCrew.find(c => c.id === state.filterCrew)?.crew_name || state.filterCrew} onRemove={() => onUpdate({ filterCrew: "" })} />}
                  {state.filterCity && <FilterChip label={state.filterCity} onRemove={() => onUpdate({ filterCity: "" })} />}
                  {state.filterMunicipality && <FilterChip label={state.filterMunicipality} onRemove={() => onUpdate({ filterMunicipality: "" })} />}
                  <button onClick={() => onUpdate({ filterAssetState:"", filterStatus:"", filterType:"", filterPriority:"", filterCrew:"", filterCity:"", filterMunicipality:"" })}
                    className="text-[9px] text-red-500 hover:text-red-700 font-semibold underline ml-1">
                    Clear all
                  </button>
                </div>
              )}

              {/* Asset Search */}
              <FilterRow label="Asset">
                <Input
                  value={assetSearch}
                  onChange={e => setAssetSearch(e.target.value)}
                  placeholder="Search ID / city…"
                  className="h-6 text-[10px] border-slate-200 px-2"
                />
              </FilterRow>

              {/* A. Asset State */}
              <FilterRow label="Asset State">
                <Select value={state.filterAssetState || "__all__"} onValueChange={set("filterAssetState")}>
                  <SelectTrigger className="h-6 text-[10px] border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All states</SelectItem>
                    <SelectItem value="Active">Active / Available</SelectItem>
                    <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="Installed">Installed</SelectItem>
                  </SelectContent>
                </Select>
              </FilterRow>

              {/* B. Assignment Status */}
              <FilterRow label="Status">
                <Select value={state.filterStatus || "__all__"} onValueChange={set("filterStatus")}>
                  <SelectTrigger className="h-6 text-[10px] border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All statuses</SelectItem>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterRow>

              {/* C. Type */}
              <FilterRow label="Type">
                <Select value={state.filterType || "__all__"} onValueChange={set("filterType")}>
                  <SelectTrigger className="h-6 text-[10px] border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    {ASSIGNMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterRow>

              {/* D. Priority — toggle buttons */}
              <FilterRow label="Priority">
                <div className="flex gap-1">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      onClick={() => onUpdate({ filterPriority: state.filterPriority === p ? "" : p })}
                      className={`flex-1 text-[10px] font-bold py-0.5 rounded border transition-all ${
                        state.filterPriority === p
                          ? p === "P1" ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                      }`}
                    >{p}</button>
                  ))}
                </div>
              </FilterRow>

              {/* E. Crew */}
              <FilterRow label="Crew">
                <Select value={state.filterCrew || "__all__"} onValueChange={set("filterCrew")}>
                  <SelectTrigger className="h-6 text-[10px] border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All crews</SelectItem>
                    {activeCrew.map(c => <SelectItem key={c.id} value={c.id}>{c.crew_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterRow>

              {/* F. Location */}
              <FilterRow label="City">
                <Select value={state.filterCity || "__all__"} onValueChange={set("filterCity")}>
                  <SelectTrigger className="h-6 text-[10px] border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All cities</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterRow>
              {municipalities.length > 0 && (
                <FilterRow label="Δήμος">
                  <Select value={state.filterMunicipality || "__all__"} onValueChange={set("filterMunicipality")}>
                    <SelectTrigger className="h-6 text-[10px] border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All municipalities</SelectItem>
                      {municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FilterRow>
              )}
            </div>
          )}
        </div>

        {/* KPI COUNTERS */}
        <div className="border-b border-slate-100 shrink-0">
          <SectionHeader title="KPIs" open={kpiOpen} onToggle={() => setKpiOpen(v => !v)} />
          {kpiOpen && (
            <div className="px-2 py-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-2">
                <KPIItem label="Total" value={kpis.total} bold />
                <KPIItem label="Planned" value={kpis.planned} color="text-blue-600" />
                <KPIItem label="In Progress" value={kpis.inProgress} color="text-amber-600" />
                <KPIItem label="Completed" value={kpis.completed} color="text-emerald-600" />
                <KPIItem label="Deferred" value={kpis.deferred} color="text-purple-600" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-red-50 border border-red-100 rounded py-1 text-center">
                  <div className="text-[9px] text-red-400 font-bold uppercase">P1</div>
                  <div className="text-base font-extrabold text-red-600 leading-none mt-0.5">{kpis.p1}</div>
                </div>
                <div className="flex-1 bg-orange-50 border border-orange-100 rounded py-1 text-center">
                  <div className="text-[9px] text-orange-400 font-bold uppercase">P2</div>
                  <div className="text-base font-extrabold text-orange-600 leading-none mt-0.5">{kpis.p2}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ASSIGNMENT LIST */}
        <div className="flex-1 flex flex-col min-h-0">
          <SectionHeader
            title="Assignments"
            count={filteredAssignments.length || null}
            open={listOpen}
            onToggle={() => setListOpen(v => !v)}
          />
          {listOpen && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredAssignments.length === 0 ? (
                <div className="py-4 text-center text-[10px] text-slate-400">
                  {state.selectedWeekId ? "No assignments match filters" : "Select a week to view assignments"}
                </div>
              ) : (
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-2 py-1 text-slate-500 font-semibold">ID</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">City</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">Type</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">Status</th>
                      <th className="text-left px-1 py-1 text-slate-500 font-semibold">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map(asgn => {
                      const asset = filteredAssets.find(a => a.id === asgn.asset_id);
                      const isSelected = state.selectedAssetId === asgn.asset_id;
                      return (
                        <tr
                          key={asgn.id}
                          onClick={() => onUpdate({ selectedAssetId: isSelected ? null : asgn.asset_id })}
                          className={`cursor-pointer border-b border-slate-50 transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-2 py-0.5 font-mono font-semibold">{asset?.active_shelter_id || asset?.asset_id || "—"}</td>
                          <td className="px-1 py-0.5 text-slate-500 truncate max-w-[50px]">{asset?.city || "—"}</td>
                          <td className="px-1 py-0.5 text-slate-500">{asgn.assignment_type || "—"}</td>
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

function FilterRow({ label, children }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-slate-400 w-16 shrink-0 font-medium">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function KPIItem({ label, value, color = "text-slate-700", bold }) {
  return (
    <div className="flex items-center justify-between py-0.5 gap-1">
      <span className="text-[9px] text-slate-400 leading-none">{label}</span>
      <span className={`text-[11px] font-${bold ? "extrabold" : "semibold"} leading-none ${color}`}>{value}</span>
    </div>
  );
}