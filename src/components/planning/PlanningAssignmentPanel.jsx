import React, { useState, useMemo } from "react";
import { Search, X, Plus, Trash2, ExternalLink, MapPin, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TAB_OPTIONS = [
  { id: "all", label: "All Assets" },
  { id: "assigned", label: "Assigned" },
  { id: "unassigned", label: "Unassigned" },
];

const STATUS_COLORS = {
  Planned: "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Deferred: "bg-purple-100 text-purple-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export default function PlanningAssignmentPanel({
  assets,
  allAssignments,
  weeks,
  selectedWeekId,
  onSelectWeek,
  highlightedAssetId,
  onHighlightAsset,
  onAssign,
  onRemoveAssignment,
  onOpenAsset,
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("asset_id");

  // Build assignment lookup (all weeks, not just selected)
  const assignmentByAsset = useMemo(() => {
    const m = {};
    allAssignments.forEach(a => {
      if (!m[a.asset_id]) m[a.asset_id] = [];
      m[a.asset_id].push(a);
    });
    return m;
  }, [allAssignments]);

  const weekAssignmentByAsset = useMemo(() => {
    const m = {};
    if (!selectedWeekId) return m;
    allAssignments.filter(a => a.planning_week_id === selectedWeekId).forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [allAssignments, selectedWeekId]);

  const selectedWeek = useMemo(() => weeks.find(w => w.id === selectedWeekId), [weeks, selectedWeekId]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets
      .filter(a => {
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
      })
      .sort((a, b) => {
        if (sortBy === "asset_id") return (a.active_shelter_id || a.asset_id || "").localeCompare(b.active_shelter_id || b.asset_id || "");
        if (sortBy === "city") return (a.city || "").localeCompare(b.city || "");
        if (sortBy === "shelter_type") return (a.shelter_type || "").localeCompare(b.shelter_type || "");
        if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
        return 0;
      });
  }, [assets, tab, search, sortBy, weekAssignmentByAsset]);

  const assignedCount = useMemo(() =>
    assets.filter(a => weekAssignmentByAsset[a.id]).length,
    [assets, weekAssignmentByAsset]
  );
  const unassignedCount = assets.length - assignedCount;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Assignment Panel</span>
          <Select value={selectedWeekId || "__all__"} onValueChange={v => onSelectWeek(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-7 text-xs border-slate-200 w-44 bg-white">
              <SelectValue placeholder="All weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">— All weeks —</SelectItem>
              {weeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="font-mono text-[10px]">{w.week_code}</span>
                  <span className="ml-1 text-slate-500 text-[10px]">{w.week_name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary counts */}
        <div className="flex gap-3 text-[10px] mb-2">
          <span className="text-slate-500">Total: <b className="text-slate-700">{assets.length}</b></span>
          <span className="text-emerald-600">Assigned: <b>{assignedCount}</b></span>
          <span className="text-slate-400">Unassigned: <b>{unassignedCount}</b></span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5 mb-2">
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
              placeholder="Search asset ID, city, type..."
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
              <SelectItem value="asset_id">Sort: ID</SelectItem>
              <SelectItem value="city">Sort: City</SelectItem>
              <SelectItem value="shelter_type">Sort: Type</SelectItem>
              <SelectItem value="status">Sort: Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-[9px] text-slate-400 mt-1">{rows.length} assets shown</div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-[10px] border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="text-left px-2 py-1.5 text-slate-500 font-semibold border-b border-slate-200">Asset ID</th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200">Type</th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200">City</th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200">Status</th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200">Week</th>
              <th className="text-left px-1 py-1.5 text-slate-500 font-semibold border-b border-slate-200">Asgn</th>
              <th className="px-1 py-1.5 border-b border-slate-200"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(asset => {
              const asgn = weekAssignmentByAsset[asset.id];
              const isHighlighted = highlightedAssetId === asset.id;
              const week = asgn ? weeks.find(w => w.id === asgn.planning_week_id) : null;

              return (
                <tr
                  key={asset.id}
                  onClick={() => onHighlightAsset(isHighlighted ? null : asset.id)}
                  className={`border-b border-slate-50 cursor-pointer transition-colors ${
                    isHighlighted ? "bg-indigo-50 border-indigo-100" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-2 py-1.5">
                    <div className="font-mono font-semibold text-slate-800">{asset.active_shelter_id || asset.asset_id}</div>
                    {asset.municipality && <div className="text-[9px] text-slate-400">{asset.municipality}</div>}
                  </td>
                  <td className="px-1 py-1.5 text-slate-500 max-w-[50px] truncate">{asset.shelter_type || "—"}</td>
                  <td className="px-1 py-1.5 text-slate-500">{asset.city || "—"}</td>
                  <td className="px-1 py-1.5">
                    <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium ${
                      asset.status === "Active" ? "bg-emerald-50 text-emerald-700" :
                      asset.status === "Under Maintenance" ? "bg-amber-50 text-amber-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {asset.status || "—"}
                    </span>
                  </td>
                  <td className="px-1 py-1.5 font-mono text-[9px] text-slate-500">
                    {week ? week.week_code : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-1 py-1.5">
                    {asgn ? (
                      <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-medium ${STATUS_COLORS[asgn.assignment_status] || "bg-slate-100 text-slate-500"}`}>
                        {asgn.assignment_status}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      {!asgn && selectedWeekId && (
                        <button
                          onClick={e => { e.stopPropagation(); onAssign(asset); }}
                          title="Assign to week"
                          className="p-0.5 rounded hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
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
                <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
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