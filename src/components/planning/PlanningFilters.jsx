import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, RotateCcw, Filter, ChevronDown, ChevronUp, Layers, X } from "lucide-react";
import { countActiveFilters } from "./planningUtils";

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-indigo-900 transition-colors"><X className="w-3 h-3" /></button>
    </span>
  );
}

const ALL = "all";

export default function PlanningFilters({ filters, onChange, onApply, onReset, assets, assignments, onSelectAsset, layers = [] }) {
  const [expanded, setExpanded] = useState(false);

  const cities        = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const shelterTypes  = [...new Set(assets.map(a => a.shelter_type).filter(Boolean))].sort();
  const assetStatuses = [...new Set(assets.map(a => a.status).filter(Boolean))].sort();
  const teams         = [...new Set(assignments.map(a => a.team_name).filter(Boolean))].sort();
  const zones         = [...new Set(assignments.map(a => a.route_zone).filter(Boolean))].sort();
  const assignees     = [...new Set(assignments.map(a => a.assigned_to).filter(Boolean))].sort();

  const set = (k, v) => onChange({ ...filters, [k]: v });
  const activeCount = countActiveFilters(filters);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
      {/* Always-visible asset selector + search + toggle */}
      <div className="flex items-center gap-2">
        <Select
          value={filters.selected_asset_id || "all"}
          onValueChange={v => {
            const asset = assets.find(a => a.id === v);
            if (asset && onSelectAsset) onSelectAsset(asset);
            onChange({ ...filters, selected_asset_id: v === "all" ? "" : v });
          }}
        >
          <SelectTrigger className="w-52 h-8 text-sm border-slate-200 shrink-0">
            <SelectValue placeholder="Select asset..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">— All Assets —</SelectItem>
            {assets.map(a => (
              <SelectItem key={a.id} value={a.id}>
                <span className="font-mono text-xs mr-1 text-slate-500">{a.active_shelter_id || a.asset_id}</span>
                {a.city && <span className="text-slate-600">{a.city}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search ID, shelter, address..."
            className="pl-8 text-sm h-8"
            value={filters.search || ""}
            onChange={e => set("search", e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={() => setExpanded(v => !v)}>
          <Filter className="w-3 h-3" />
          Filters
          {activeCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{activeCount}</span>
          )}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        {(activeCount > 0 || filters.search) && (
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-slate-500 shrink-0" onClick={onReset}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Active filter chips — always visible when filters are set */}
      {!expanded && activeCount > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {filters.city && <FilterChip label={`City: ${filters.city}`} onRemove={() => set("city", "")} />}
          {filters.shelter_type && <FilterChip label={`Type: ${filters.shelter_type}`} onRemove={() => set("shelter_type", "")} />}
          {filters.asset_status && <FilterChip label={`Condition: ${filters.asset_status}`} onRemove={() => set("asset_status", "")} />}
          {filters.assignment_status && <FilterChip label={`Task: ${filters.assignment_status}`} onRemove={() => set("assignment_status", "")} />}
          {filters.assignment_type && <FilterChip label={`Asgn Type: ${filters.assignment_type}`} onRemove={() => set("assignment_type", "")} />}
          {filters.priority_bucket && <FilterChip label={`Priority: ${filters.priority_bucket}`} onRemove={() => set("priority_bucket", "")} />}
          {filters.team_name && <FilterChip label={`Team: ${filters.team_name}`} onRemove={() => set("team_name", "")} />}
          {filters.route_zone && <FilterChip label={`Zone: ${filters.route_zone}`} onRemove={() => set("route_zone", "")} />}
          {filters.assigned_to && <FilterChip label={`Assignee: ${filters.assigned_to}`} onRemove={() => set("assigned_to", "")} />}
          {filters.layer_id && <FilterChip label={`Layer active`} onRemove={() => set("layer_id", "")} />}
          {filters.has_incident && <FilterChip label="Has Incident" onRemove={() => set("has_incident", false)} />}
          {filters.has_work_order && <FilterChip label="Has Work Order" onRemove={() => set("has_work_order", false)} />}
          {filters.show_unassigned_only && <FilterChip label="Unassigned Only" onRemove={() => set("show_unassigned_only", false)} />}
        </div>
      )}

      {expanded && (
        <>
          <div className="grid grid-cols-2 gap-2">
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
              <Label className="text-xs text-slate-500 mb-1 block" title="Physical condition of the asset">Asset Condition</Label>
              <Select value={filters.asset_status || ALL} onValueChange={v => set("asset_status", v === ALL ? "" : v)}>
                <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All conditions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All conditions</SelectItem>
                  {assetStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block" title="Progress of the assigned task for this week">Task Progress</Label>
              <Select value={filters.assignment_status || ALL} onValueChange={v => set("assignment_status", v === ALL ? "" : v)}>
                <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All task statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All task statuses</SelectItem>
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
            {teams.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Team</Label>
                <Select value={filters.team_name || ALL} onValueChange={v => set("team_name", v === ALL ? "" : v)}>
                  <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All Teams" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Teams</SelectItem>
                    {teams.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {zones.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Route Zone</Label>
                <Select value={filters.route_zone || ALL} onValueChange={v => set("route_zone", v === ALL ? "" : v)}>
                  <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All Zones" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All Zones</SelectItem>
                    {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {assignees.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Assigned To</Label>
                <Select value={filters.assigned_to || ALL} onValueChange={v => set("assigned_to", v === ALL ? "" : v)}>
                  <SelectTrigger className="text-sm h-8"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All</SelectItem>
                    {assignees.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {layers.length > 0 && (
            <div>
              <Label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Layers className="w-3 h-3" /> Layer Filter</Label>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => set("layer_id", "")}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${!filters.layer_id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}
                >All</button>
                {layers.map(l => (
                  <button
                    key={l.id}
                    onClick={() => set("layer_id", filters.layer_id === l.id ? "" : l.id)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${filters.layer_id === l.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color || "#6B7280" }} />
                    {l.name}
                    <span className="text-[10px] opacity-70">({l.assetCount || 0})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={!!filters.has_incident} onCheckedChange={v => set("has_incident", v)} />
              <span className="text-xs text-slate-600">Has Incident</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={!!filters.has_work_order} onCheckedChange={v => set("has_work_order", v)} />
              <span className="text-xs text-slate-600">Has Work Order</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={!!filters.show_unassigned_only} onCheckedChange={v => set("show_unassigned_only", v)} />
              <span className="text-xs text-slate-600">Unassigned Only</span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-8"
              onClick={() => { onApply(); setExpanded(false); }}>
              Apply Filters
            </Button>
          </div>
        </>
      )}
    </div>
  );
}