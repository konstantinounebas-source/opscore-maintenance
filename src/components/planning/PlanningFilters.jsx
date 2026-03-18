import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, RotateCcw, Filter, ChevronDown, ChevronUp } from "lucide-react";

const ALL = "all";

// Count how many non-search filters are active
function activeFilterCount(filters) {
  return ["city", "shelter_type", "asset_status", "assignment_status", "assignment_type", "priority_bucket"]
    .filter(k => filters[k]).length;
}

export default function PlanningFilters({ filters, onChange, onApply, onReset, assets }) {
  const [expanded, setExpanded] = useState(false);
  const cities = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const shelterTypes = [...new Set(assets.map(a => a.shelter_type).filter(Boolean))].sort();
  const assetStatuses = [...new Set(assets.map(a => a.status).filter(Boolean))].sort();

  const set = (k, v) => onChange({ ...filters, [k]: v });
  const activeCount = activeFilterCount(filters);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      {/* Always-visible header row with search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search asset ID, name, shelter ID, address..."
            className="pl-8 text-sm h-8"
            value={filters.search || ""}
            onChange={e => set("search", e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={() => setExpanded(v => !v)}
        >
          <Filter className="w-3 h-3" />
          Filters
          {activeCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        {(activeCount > 0 || filters.search) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-slate-500 shrink-0" onClick={onReset}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Search asset ID, name, shelter ID, address..."
          className="pl-8 text-sm"
          value={filters.search || ""}
          onChange={e => set("search", e.target.value)}
        />
      </div>

      {expanded && <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">City</Label>
          <Select value={filters.city || ALL} onValueChange={v => set("city", v === ALL ? "" : v)}>
            <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All Cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Cities</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Shelter Type</Label>
          <Select value={filters.shelter_type || ALL} onValueChange={v => set("shelter_type", v === ALL ? "" : v)}>
            <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Types</SelectItem>
              {shelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Asset Status</Label>
          <Select value={filters.asset_status || ALL} onValueChange={v => set("asset_status", v === ALL ? "" : v)}>
            <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {assetStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Assignment Status</Label>
          <Select value={filters.assignment_status || ALL} onValueChange={v => set("assignment_status", v === ALL ? "" : v)}>
            <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {["Planned", "In Progress", "Completed", "Deferred", "Cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Assignment Type</Label>
          <Select value={filters.assignment_type || ALL} onValueChange={v => set("assignment_type", v === ALL ? "" : v)}>
            <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {["Inspection", "Preventive", "Corrective", "Review", "Mixed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Priority</Label>
          <Select value={filters.priority_bucket || ALL} onValueChange={v => set("priority_bucket", v === ALL ? "" : v)}>
            <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {["P1", "P2", "Critical", "High", "Medium", "Low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>}

      {expanded && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-8" onClick={() => { onApply(); setExpanded(false); }}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
}