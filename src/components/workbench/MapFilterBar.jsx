import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { EMPTY_MAP_FILTERS, countActiveMapFilters, uniqueCities, uniqueShelterTypes } from "./workbenchUtils";

const ASSIGNMENT_STATUSES = ["Planned", "In Progress", "Completed", "Deferred", "Cancelled"];
const ASSIGNMENT_TYPES = ["Inspection", "Preventive", "Corrective", "Review", "Mixed"];
const PRIORITIES = ["P1", "P2", "Critical", "High", "Medium", "Low"];
const ASSET_STATUSES = ["Active", "Inactive", "Under Maintenance", "Decommissioned"];

export default function MapFilterBar({ filters, onChange, assets }) {
  const [expanded, setExpanded] = useState(false);
  const set = (k, v) => onChange({ ...filters, [k]: v });
  const reset = () => onChange({ ...EMPTY_MAP_FILTERS });
  const activeCount = countActiveMapFilters(filters);
  const cities = uniqueCities(assets);
  const shelterTypes = uniqueShelterTypes(assets);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Search row always visible */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <Input
          value={filters.search}
          onChange={e => set("search", e.target.value)}
          placeholder="Search assets..."
          className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-1 flex-1"
        />
        <button
          onClick={() => setExpanded(v => !v)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors shrink-0 ${
            activeCount > 0 ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <SlidersHorizontal className="h-3 w-3" />
          {activeCount > 0 && <span className="font-semibold">{activeCount}</span>}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {activeCount > 0 && (
          <button onClick={reset} className="text-slate-400 hover:text-slate-600 p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-2 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">City</p>
              <Select value={filters.city || "__all__"} onValueChange={v => set("city", v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All cities" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__all__">All cities</SelectItem>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Type</p>
              <Select value={filters.shelter_type || "__all__"} onValueChange={v => set("shelter_type", v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__all__">All types</SelectItem>
                  {shelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Asset Status</p>
              <Select value={filters.asset_status || "__all__"} onValueChange={v => set("asset_status", v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__all__">All</SelectItem>
                  {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Assignment Status</p>
              <Select value={filters.assignment_status || "__all__"} onValueChange={v => set("assignment_status", v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__all__">All</SelectItem>
                  {ASSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Assignment Type</p>
              <Select value={filters.assignment_type || "__all__"} onValueChange={v => set("assignment_type", v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__all__">All</SelectItem>
                  {ASSIGNMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Priority</p>
              <Select value={filters.priority_bucket || "__all__"} onValueChange={v => set("priority_bucket", v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent style={{ zIndex: 99999 }}>
                  <SelectItem value="__all__">All</SelectItem>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
              <input type="checkbox" checked={filters.show_unassigned_only} onChange={e => set("show_unassigned_only", e.target.checked)} className="rounded" />
              Unassigned only
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
              <input type="checkbox" checked={filters.has_incident} onChange={e => set("has_incident", e.target.checked)} className="rounded" />
              Has incident
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
              <input type="checkbox" checked={filters.has_work_order} onChange={e => set("has_work_order", e.target.checked)} className="rounded" />
              Has WO
            </label>
          </div>
        </div>
      )}
    </div>
  );
}