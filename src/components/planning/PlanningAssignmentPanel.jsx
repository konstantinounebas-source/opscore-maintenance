import React, { useState, useMemo } from "react";
import { Search, X, Plus, Trash2, ExternalLink, MapPin, Edit2, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TAB_OPTIONS = [
  { id: "all",        label: "All Assets" },
  { id: "assigned",   label: "Assigned" },
  { id: "unassigned", label: "Unassigned" },
];

const ASGN_STATUS_COLORS = {
  Planned:      "bg-blue-100 text-blue-700",
  "In Progress":"bg-amber-100 text-amber-700",
  Completed:    "bg-emerald-100 text-emerald-700",
  Deferred:     "bg-purple-100 text-purple-700",
  Cancelled:    "bg-slate-100 text-slate-500",
  Unassigned:   "bg-slate-100 text-slate-400",
};

const SORT_OPTIONS = [
  { value: "asset_id",      label: "Asset ID" },
  { value: "city",          label: "City" },
  { value: "shelter_type",  label: "Shelter Type" },
  { value: "status",        label: "Asset Status" },
  { value: "asgn_status",   label: "Asgn Status" },
  { value: "asgn_type",     label: "Asgn Type" },
];

function weekLabel(w) {
  if (!w) return "—";
  return w.week_name || w.week_code || `${w.start_date}`;
}

function weekOfMonth(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.ceil(d.getDate() / 7);
}

function getYear(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getFullYear();
}

export default function PlanningAssignmentPanel({
  assets,
  allAssignments,
  weeks,
  selectedWeekId,
  onSelectWeek,
  highlightedAssetId,
  onHighlightAsset,
  onAssign,
  onEditAssignment,
  onRemoveAssignment,
  onOpenAsset,
  layers = [],
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("asset_id");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Build assignment lookup for selected week
  const weekAssignmentByAsset = useMemo(() => {
    const m = {};
    if (!selectedWeekId) return m;
    allAssignments.filter(a => a.planning_week_id === selectedWeekId).forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [allAssignments, selectedWeekId]);

  // ALL assignments by asset (any week) for "year/week" display when no week selected
  const anyAssignmentByAsset = useMemo(() => {
    const m = {};
    allAssignments.forEach(a => {
      if (!m[a.asset_id]) m[a.asset_id] = a;
    });
    return m;
  }, [allAssignments]);

  const weeksMap = useMemo(() => Object.fromEntries(weeks.map(w => [w.id, w])), [weeks]);
  const selectedWeek = weeksMap[selectedWeekId];

  // Layer lookup by assetId → layer
  const layerByAsset = useMemo(() => {
    const m = {};
    layers.forEach(l => (l.assetIds || []).forEach(id => { m[id] = l; }));
    return m;
  }, [layers]);

  const effectiveAssignment = (assetId) =>
    weekAssignmentByAsset[assetId] || (!selectedWeekId ? anyAssignmentByAsset[assetId] : null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = assets.filter(a => {
      if (tab === "assigned" && !weekAssignmentByAsset[a.id]) return false;
      if (tab === "unassigned" && weekAssignmentByAsset[a.id]) return false;
      if (q) {
        const match =
          (a.active_shelter_id || "").toLowerCase().includes(q) ||
          (a.asset_id || "").toLowerCase().includes(q) ||
          (a.city || "").toLowerCase().includes(q) ||
          (a.shelter_type || "").toLowerCase().includes(q) ||
          (a.municipality || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const asgnA = effectiveAssignment(a.id);
      const asgnB = effectiveAssignment(b.id);
      let cmp = 0;
      if (sortBy === "asset_id")     cmp = (a.active_shelter_id || a.asset_id || "").localeCompare(b.active_shelter_id || b.asset_id || "");
      else if (sortBy === "city")    cmp = (a.city || "").localeCompare(b.city || "");
      else if (sortBy === "shelter_type") cmp = (a.shelter_type || "").localeCompare(b.shelter_type || "");
      else if (sortBy === "status")  cmp = (a.status || "").localeCompare(b.status || "");
      else if (sortBy === "asgn_status") cmp = (asgnA?.assignment_status || "").localeCompare(asgnB?.assignment_status || "");
      else if (sortBy === "asgn_type")   cmp = (asgnA?.assignment_type || "").localeCompare(asgnB?.assignment_type || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [assets, tab, search, sortBy, sortDir, weekAssignmentByAsset, anyAssignmentByAsset, selectedWeekId]);

  const assignedCount   = useMemo(() => assets.filter(a => weekAssignmentByAsset[a.id]).length, [assets, weekAssignmentByAsset]);
  const unassignedCount = assets.length - assignedCount;

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="w-2.5 h-2.5 inline ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 inline ml-0.5" />;
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === rows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(a => a.id)));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assignment Panel</span>
          <Select value={selectedWeekId || "__all__"} onValueChange={v => onSelectWeek(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-7 text-xs border-slate-200 w-44 bg-white">
              <SelectValue placeholder="All weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">— All weeks —</SelectItem>
              {weeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {weekLabel(w)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex gap-3 text-[10px]">
          <span className="text-slate-500">Total: <b className="text-slate-700">{assets.length}</b></span>
          <span className="text-emerald-600">Assigned: <b>{assignedCount}</b></span>
          <span className="text-slate-400">Unassigned: <b>{unassignedCount}</b></span>
          {selectedIds.size > 0 && (
            <span className="text-indigo-600 font-semibold ml-auto">✓ {selectedIds.size} selected</span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {TAB_OPTIONS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-md transition-all ${
                tab === t.id ? "bg-white shadow text-indigo-700 border border-slate-200" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, city, type..."
              className="h-7 pl-6 text-[10px] border-slate-200"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 text-[10px] border-slate-200 w-28 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && selectedWeekId && (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1 gap-1 text-indigo-600 border-indigo-200"
              onClick={() => {
                rows.filter(a => selectedIds.has(a.id) && !weekAssignmentByAsset[a.id]).forEach(a => onAssign(a));
                setSelectedIds(new Set());
              }}>
              <Plus className="w-3 h-3" /> Assign selected
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-slate-400"
              onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        )}

        <div className="text-[9px] text-slate-400">{rows.length} assets shown</div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-[10px] border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-1.5 py-1.5 border-b border-slate-200 w-5">
                <input type="checkbox"
                  checked={selectedIds.size === rows.length && rows.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3 h-3"
                />
              </th>
              <th className="text-left px-1.5 py-1.5 text-slate-500 font-semibold border-b border-slate-200 cursor-pointer hover:text-indigo-600 whitespace-nowrap" onClick={() => toggleSort("asset_id")}>
                Asset ID <SortIcon col="asset_id" />
              </th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort("shelter_type")}>
                Type <SortIcon col="shelter_type" />
              </th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort("city")}>
                City <SortIcon col="city" />
              </th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort("asgn_type")}>
                Asgn Type <SortIcon col="asgn_type" />
              </th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort("asgn_status")}>
                Status <SortIcon col="asgn_status" />
              </th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200 whitespace-nowrap">
                Week
              </th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200">
                Layer
              </th>
              <th className="px-1 py-1.5 border-b border-slate-200" />
            </tr>
          </thead>
          <tbody>
            {rows.map(asset => {
              const asgn = effectiveAssignment(asset.id);
              const week = asgn ? weeksMap[asgn.planning_week_id] : null;
              const layer = layerByAsset[asset.id];
              const isHighlighted = highlightedAssetId === asset.id;
              const isSelected = selectedIds.has(asset.id);
              const wom = week ? weekOfMonth(week.start_date) : null;
              const yr = week ? getYear(week.start_date) : null;

              return (
                <tr
                  key={asset.id}
                  onClick={() => onHighlightAsset(isHighlighted ? null : asset.id)}
                  className={`border-b border-slate-50 cursor-pointer transition-colors ${
                    isHighlighted ? "bg-indigo-50 border-indigo-100" :
                    isSelected ? "bg-indigo-25 bg-indigo-50/40" :
                    "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-1.5 py-1.5" onClick={e => { e.stopPropagation(); toggleSelect(asset.id); }}>
                    <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-3 h-3" />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <div className="font-mono font-semibold text-slate-800 whitespace-nowrap">{asset.active_shelter_id || asset.asset_id}</div>
                    {asset.municipality && <div className="text-[9px] text-slate-400">{asset.municipality}</div>}
                  </td>
                  <td className="px-1 py-1.5 text-slate-500 max-w-[60px] truncate" title={asset.shelter_type}>{asset.shelter_type || "—"}</td>
                  <td className="px-1 py-1.5 text-slate-500 whitespace-nowrap">{asset.city || "—"}</td>
                  <td className="px-1 py-1.5">
                    {asgn?.assignment_type ? (
                      <span className="text-[9px] text-slate-600 bg-slate-100 px-1 py-0.5 rounded whitespace-nowrap">{asgn.assignment_type}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-1 py-1.5">
                    {asgn ? (
                      <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap ${ASGN_STATUS_COLORS[asgn.assignment_status] || "bg-slate-100 text-slate-500"}`}>
                        {asgn.assignment_status}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-1 py-1.5">
                    {week ? (
                      <div>
                        <div className="font-mono text-[9px] text-indigo-600 whitespace-nowrap">{week.week_code || weekLabel(week)}</div>
                        {yr && <div className="text-[8px] text-slate-400">{yr}{wom ? ` · W${wom}` : ""}</div>}
                      </div>
                    ) : <span className="text-slate-300 text-[9px]">—</span>}
                  </td>
                  <td className="px-1 py-1.5">
                    {layer ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: layer.color || "#6B7280" }} />
                        <span className="text-[9px] text-slate-600 truncate max-w-[40px]" title={layer.name}>{layer.name}</span>
                      </span>
                    ) : <span className="text-slate-300 text-[9px]">—</span>}
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      {!asgn && selectedWeekId ? (
                        <button
                          onClick={e => { e.stopPropagation(); onAssign(asset); }}
                          title="Assign to week"
                          className="p-0.5 rounded hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      ) : asgn ? (
                        <button
                          onClick={e => { e.stopPropagation(); onEditAssignment && onEditAssignment(asgn); }}
                          title="Edit assignment"
                          className="p-0.5 rounded hover:bg-amber-100 text-slate-300 hover:text-amber-600 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      ) : null}
                      {asgn && (
                        <button
                          onClick={e => { e.stopPropagation(); onRemoveAssignment(asgn); }}
                          title="Remove assignment"
                          className="p-0.5 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onHighlightAsset(asset.id); }}
                        title="Highlight on map"
                        className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                      {onOpenAsset && (
                        <button
                          onClick={e => { e.stopPropagation(); onOpenAsset(asset); }}
                          title="Open asset details"
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400 text-xs">
                  No assets match current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}