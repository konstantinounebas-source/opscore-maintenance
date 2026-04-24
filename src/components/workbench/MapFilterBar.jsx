import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { EMPTY_MAP_FILTERS, countActiveMapFilters, uniqueCities, uniqueShelterTypes } from "./workbenchUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MultiSelectFilter from "./MultiSelectFilter";

const ASSIGNMENT_STATUSES = ["Planned", "In Progress", "Completed", "Deferred", "Cancelled"];
const ASSIGNMENT_TYPES = ["Inspection", "Preventive", "Corrective", "Review", "Mixed"];
const PRIORITIES = ["P1", "P2", "Critical", "High", "Medium", "Low"];
const ASSET_STATUSES = ["Active", "Inactive", "Under Maintenance", "Decommissioned"];

// Fields always visible in the filter bar
const ALWAYS_VISIBLE = ["city", "order_year", "ordered_shelter_type", "installed_shelter_type", "planned_week", "inspection_status"];

// All additional filter fields for "Add Filter" dropdown
const AVAILABLE_FILTER_FIELDS = {
  "shelter_type": "Shelter Type",
  "asset_status": "Asset Status",
  "assignment_status": "Assignment Status",
  "assignment_type": "Assignment Type",
  "priority_bucket": "Priority",
  "category": "Category",
  "asset_stage": "Asset Stage",
  "asset_source": "Asset Source",
  "existing_condition": "Existing Condition",
  "has_bay": "Has Bay",
  "municipality": "Municipality",
  "phase": "Phase",
  "delivery_year": "Delivery Year",
  "team_name": "Team",
};

export default function MapFilterBar({ filters, onChange, assets, weeks = [] }) {
   const [expanded, setExpanded] = useState(false);
   const [customFields, setCustomFields] = useState(new Set());
   const set = (k, v) => {
     // Handle multi-select arrays — convert to JSON string for storage
     const value = Array.isArray(v) && v.length > 0 ? JSON.stringify(v) : "";
     onChange({ ...filters, [k]: value });
   };
   const getValues = (k) => {
     // Parse stored JSON back to array for multi-select
     const stored = filters[k];
     if (!stored) return [];
     try {
       return JSON.parse(stored);
     } catch {
       return [];
     }
   };
   const reset = () => onChange({ ...EMPTY_MAP_FILTERS });
   const activeCount = countActiveMapFilters(filters);
   const cities = uniqueCities(assets);
   const shelterTypes = uniqueShelterTypes(assets);

   // Get unique values for all fields
   const orderYears = [...new Set(assets.map(a => a.order_year).filter(Boolean))].sort((a, b) => a - b);
   const deliveryYears = [...new Set(assets.map(a => a.delivery_year).filter(Boolean))].sort((a, b) => a - b);
   const orderedTypes = [...new Set(assets.map(a => a.ordered_shelter_type).filter(Boolean))].sort();
   const installedTypes = [...new Set(assets.map(a => a.installed_shelter_type).filter(Boolean))].sort();
   const inspectionStatuses = [...new Set(assets.map(a => a.inspection_status).filter(Boolean))].sort();
   const categories = [...new Set(assets.map(a => a.category).filter(Boolean))].sort();
   const assetStages = [...new Set(assets.map(a => a.asset_stage).filter(Boolean))].sort();
   const assetSources = [...new Set(assets.map(a => a.asset_source).filter(Boolean))].sort();
   const existingConditions = [...new Set(assets.map(a => a.existing_condition).filter(Boolean))].sort();
   const hasBayOptions = [...new Set(assets.map(a => a.has_bay).filter(Boolean))].sort();
   const municipalities = [...new Set(assets.map(a => a.municipality).filter(Boolean))].sort();
   const phases = [...new Set(assets.map(a => a.phase).filter(Boolean))].sort();
   const planningWeeks = (weeks || []).map(w => w.week_code).filter(Boolean).sort();
  
  const addCustomField = (field) => {
    setCustomFields(prev => new Set([...prev, field]));
  };
  
  const removeCustomField = (field) => {
    const updated = new Set(customFields);
    updated.delete(field);
    setCustomFields(updated);
    set(field, "");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Search row always visible */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 pointer-events-auto">
        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={filters.search}
          onChange={e => set("search", e.target.value)}
          placeholder="Search by location / asset ID..."
          className="h-7 text-xs px-2 flex-1 border border-input rounded bg-white focus:outline-none focus:ring-1 focus:ring-ring"
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
            {/* City (always visible) */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">City</p>
              <MultiSelectFilter
                options={["Unassigned", ...cities]}
                values={getValues("city")}
                onChange={(v) => set("city", v)}
                placeholder="All cities"
              />
            </div>

            {/* Order Year (always visible) */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Order Year</p>
              <MultiSelectFilter
                options={["Unassigned", ...orderYears.map(String)]}
                values={getValues("order_year")}
                onChange={(v) => set("order_year", v)}
                placeholder="All years"
              />
            </div>

            {/* Type Ordered (always visible) */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Type Ordered</p>
              <MultiSelectFilter
                options={["Unassigned", ...orderedTypes]}
                values={getValues("ordered_shelter_type")}
                onChange={(v) => set("ordered_shelter_type", v)}
                placeholder="All"
              />
            </div>

            {/* Type Installed (always visible) */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Type Installed</p>
              <MultiSelectFilter
                options={["Unassigned", ...installedTypes]}
                values={getValues("installed_shelter_type")}
                onChange={(v) => set("installed_shelter_type", v)}
                placeholder="All"
              />
            </div>

            {/* Planned Week (always visible) */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Planned Week</p>
              <MultiSelectFilter
                options={["Unassigned", ...planningWeeks]}
                values={getValues("planned_week")}
                onChange={(v) => set("planned_week", v)}
                placeholder="All weeks"
              />
            </div>

            {/* Inspection Status (always visible) */}
            <div>
              <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Inspection</p>
              <MultiSelectFilter
                options={["Unassigned", ...inspectionStatuses]}
                values={getValues("inspection_status")}
                onChange={(v) => set("inspection_status", v)}
                placeholder="All"
              />
            </div>

            {/* Dynamic optional filters */}
            {customFields.has("shelter_type") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Shelter Type</p>
                  <button onClick={() => removeCustomField("shelter_type")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.shelter_type || "__all__"} onValueChange={v => set("shelter_type", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All types</SelectItem>
                    {shelterTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("asset_status") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Asset Status</p>
                  <button onClick={() => removeCustomField("asset_status")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.asset_status || "__all__"} onValueChange={v => set("asset_status", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("assignment_status") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Assignment Status</p>
                  <button onClick={() => removeCustomField("assignment_status")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.assignment_status || "__all__"} onValueChange={v => set("assignment_status", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {ASSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("assignment_type") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Assignment Type</p>
                  <button onClick={() => removeCustomField("assignment_type")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.assignment_type || "__all__"} onValueChange={v => set("assignment_type", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {ASSIGNMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("priority_bucket") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Priority</p>
                  <button onClick={() => removeCustomField("priority_bucket")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.priority_bucket || "__all__"} onValueChange={v => set("priority_bucket", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("category") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Category</p>
                  <button onClick={() => removeCustomField("category")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.category || "__all__"} onValueChange={v => set("category", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("asset_stage") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Asset Stage</p>
                  <button onClick={() => removeCustomField("asset_stage")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.asset_stage || "__all__"} onValueChange={v => set("asset_stage", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {assetStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("asset_source") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Asset Source</p>
                  <button onClick={() => removeCustomField("asset_source")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.asset_source || "__all__"} onValueChange={v => set("asset_source", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {assetSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("existing_condition") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Existing Condition</p>
                  <button onClick={() => removeCustomField("existing_condition")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.existing_condition || "__all__"} onValueChange={v => set("existing_condition", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {existingConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("has_bay") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Has Bay</p>
                  <button onClick={() => removeCustomField("has_bay")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.has_bay || "__all__"} onValueChange={v => set("has_bay", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {hasBayOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("municipality") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Municipality</p>
                  <button onClick={() => removeCustomField("municipality")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.municipality || "__all__"} onValueChange={v => set("municipality", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {municipalities.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("phase") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Phase</p>
                  <button onClick={() => removeCustomField("phase")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.phase || "__all__"} onValueChange={v => set("phase", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All</SelectItem>
                    {phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("delivery_year") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Delivery Year</p>
                  <button onClick={() => removeCustomField("delivery_year")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.delivery_year || "__all__"} onValueChange={v => set("delivery_year", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All years" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All years</SelectItem>
                    {deliveryYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {customFields.has("team_name") && (
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Team</p>
                  <button onClick={() => removeCustomField("team_name")} className="text-slate-300 hover:text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <Select value={filters.team_name || "__all__"} onValueChange={v => set("team_name", v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="All teams" /></SelectTrigger>
                  <SelectContent style={{ zIndex: 99999 }}>
                    <SelectItem value="__all__">All teams</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
            
            {/* Add Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 ml-auto text-[11px] text-indigo-600 hover:text-indigo-700 font-medium">
                  <Plus className="h-3 w-3" />
                  Add Filter
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ zIndex: 99999 }}>
                {Object.entries(AVAILABLE_FILTER_FIELDS).map(([fieldKey, fieldLabel]) => (
                  !customFields.has(fieldKey) && (
                    <DropdownMenuItem key={fieldKey} onClick={() => addCustomField(fieldKey)}>
                      {fieldLabel}
                    </DropdownMenuItem>
                  )
                ))}
                {customFields.size === Object.keys(AVAILABLE_FILTER_FIELDS).length && (
                  <div className="px-2 py-1 text-[11px] text-slate-400">All filters added</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}