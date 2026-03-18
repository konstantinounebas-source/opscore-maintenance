import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, ExternalLink, Search, ChevronUp, ChevronDown } from "lucide-react";
import { assignmentStatusColor, priorityBucketColor, pinColorStyle } from "./planningUtils";
import { useNavigate } from "react-router-dom";

// Quick filter chips shown above the table
const QUICK_FILTERS = [
  { label: "P1",         key: "priority_bucket",    value: "P1" },
  { label: "P2",         key: "priority_bucket",    value: "P2" },
  { label: "Critical",   key: "priority_bucket",    value: "Critical" },
  { label: "Planned",    key: "assignment_status",  value: "Planned" },
  { label: "In Progress",key: "assignment_status",  value: "In Progress" },
  { label: "Completed",  key: "assignment_status",  value: "Completed" },
];

export default function AssignmentTable({ assignments, assetsMap, onSelect, selectedId, onEdit, onRemove, selectedIds = [], onSelectionChange }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("asset_id");
  const [sortDir, setSortDir] = useState("asc");
  const [pendingRemoveId, setPendingRemoveId] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null); // { key, value }

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    onSelectionChange(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    const allIds = sorted.map(a => a.id);
    onSelectionChange(prev => prev.length === allIds.length ? [] : allIds);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleQuick = (qf) => {
    setQuickFilter(prev => prev?.key === qf.key && prev?.value === qf.value ? null : qf);
  };

  const enriched = useMemo(() => assignments.map(a => ({
    ...a,
    _asset: assetsMap[a.asset_id] || {},
  })), [assignments, assetsMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter(a => {
      if (q && !a._asset.asset_id?.toLowerCase().includes(q) && !a._asset.asset_name?.toLowerCase().includes(q) &&
          !a._asset.city?.toLowerCase().includes(q) && !a.assigned_to?.toLowerCase().includes(q) &&
          !a.team_name?.toLowerCase().includes(q) && !a.route_zone?.toLowerCase().includes(q)) return false;
      if (quickFilter && a[quickFilter.key] !== quickFilter.value) return false;
      return true;
    });
  }, [enriched, search, quickFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let va = a[sortKey] ?? a._asset[sortKey] ?? "";
    let vb = b[sortKey] ?? b._asset[sortKey] ?? "";
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  }), [filtered, sortKey, sortDir]);

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronUp className="w-3 h-3 opacity-20" />;

  const Th = ({ label, k }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(k)}>
      <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  );

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        <Input placeholder="Search assignments..." className="pl-8 text-sm h-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-1">
        {QUICK_FILTERS.map(qf => {
          const active = quickFilter?.key === qf.key && quickFilter?.value === qf.value;
          return (
            <button key={qf.label} onClick={() => toggleQuick(qf)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${active
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              {qf.label}
            </button>
          );
        })}
        {quickFilter && (
          <button onClick={() => setQuickFilter(null)} className="px-2 py-0.5 rounded-full text-xs border bg-slate-100 text-slate-500 hover:bg-slate-200">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 rounded-lg border border-slate-200">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="w-8 px-2">
                <Checkbox checked={sorted.length > 0 && selectedIds.length === sorted.length}
                  onCheckedChange={toggleAll} className="h-3.5 w-3.5" />
              </th>
              <th className="w-4 px-1" />
              <Th label="Asset ID"   k="asset_id" />
              <Th label="Name"       k="asset_name" />
              <Th label="City"       k="city" />
              <Th label="Type"       k="assignment_type" />
              <Th label="Status"     k="assignment_status" />
              <Th label="Priority"   k="priority_bucket" />
              <Th label="Assigned To" k="assigned_to" />
              <Th label="Team"       k="team_name" />
              <Th label="Zone"       k="route_zone" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 && (
              <tr><td colSpan={12} className="text-center py-10 text-slate-400 text-sm">No assignments match current filters.</td></tr>
            )}
            {sorted.map(a => {
              const isSelected = a.id === selectedId;
              return (
                <tr key={a.id}
                  className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  onClick={() => onSelect(a)}>
                  <td className="px-2 py-2" onClick={e => toggleSelect(a.id, e)}>
                    <Checkbox checked={selectedIds.includes(a.id)} className="h-3.5 w-3.5" />
                  </td>
                  <td className="px-1 py-2">
                    <div className="w-3 h-3 rounded-full border border-white shadow-sm" style={pinColorStyle(a.pin_color)} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 whitespace-nowrap">{a._asset.asset_id || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-900 max-w-[130px] truncate">{a._asset.asset_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{a._asset.city || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{a.assignment_type || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${assignmentStatusColor(a.assignment_status)}`}>
                      {a.assignment_status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {a.priority_bucket
                      ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${priorityBucketColor(a.priority_bucket)}`}>{a.priority_bucket}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[100px] truncate">{a.assigned_to || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[90px] truncate">{a.team_name || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{a.route_zone || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(a)} title="Edit">
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      {a.source_incident_id && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigate(`/IncidentDetail?id=${a.source_incident_id}`)} title="Open Incident">
                          <ExternalLink className="h-3.5 w-3.5 text-indigo-500" />
                        </Button>
                      )}
                      {pendingRemoveId === a.id ? (
                        <>
                          <span className="text-xs text-red-500 mr-0.5">Remove?</span>
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => { onRemove(a); setPendingRemoveId(null); }}>Yes</Button>
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs"
                            onClick={() => setPendingRemoveId(null)}>No</Button>
                        </>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPendingRemoveId(a.id)} title="Remove">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}