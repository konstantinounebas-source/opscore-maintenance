import React, { useState } from "react";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ASSET_STATUSES = ["Active", "Inactive", "Installed", "Pending Installation", "Under Maintenance", "Damaged", "Out of Service"];
const ASSIGNMENT_STATUSES = ["Planned", "In Progress", "Completed", "Deferred"];
const SHELTER_TYPES_FALLBACK = ["Standard Shelter", "Smart Shelter", "Solar Shelter"];

export default function MapFilterOverlay({ state, onUpdate, assets, crews }) {
  const [open, setOpen] = useState(false);

  const set = (key) => (v) => onUpdate({ [key]: v === "__all__" ? "" : v });

  const cities = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const municipalities = [...new Set(assets.map(a => a.municipality).filter(Boolean))].sort();
  const shelterTypes = [...new Set(assets.map(a => a.shelter_type).filter(Boolean))].sort();
  const activeCrew = crews.filter(c => c.is_active !== false);

  // Sorted asset list for dropdown
  const assetOptions = [...assets]
    .sort((a, b) => (a.active_shelter_id || a.asset_id || "").localeCompare(b.active_shelter_id || b.asset_id || ""));

  const activeCount = [
    state.filterAssetStatus, state.filterAssignmentStatus, state.filterShelterType,
    state.filterCity, state.filterMunicipality, state.filterCrew, state.assetSearch,
    state.filterAssigned,
  ].filter(Boolean).length;

  const clearAll = (e) => {
    e.stopPropagation();
    onUpdate({
      filterAssetStatus: "", filterAssignmentStatus: "", filterShelterType: "",
      filterCity: "", filterMunicipality: "", filterCrew: "", assetSearch: "", filterAssigned: "",
    });
  };

  return (
    <div
      className="absolute top-7 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-56px)]"
      style={{ maxWidth: 400 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg shadow-md text-[10px] font-semibold transition-all
          ${open ? "bg-slate-800 text-white rounded-b-none" : "bg-white/90 backdrop-blur-sm text-slate-700 border border-slate-200"}`}
      >
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${open ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <span onClick={clearAll}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${open ? "hover:bg-white/20" : "hover:bg-red-50 text-red-500"} transition-colors`}>
              Clear
            </span>
          )}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="bg-white border border-slate-200 border-t-0 rounded-b-lg shadow-xl p-2 space-y-1.5">

          {/* Asset ID dropdown */}
          <FilterSelect
            label="Asset ID"
            value={state.assetSearch}
            onChange={v => onUpdate({ assetSearch: v === "__all__" ? "" : v })}
            options={assetOptions.map(a => ({
              value: a.active_shelter_id || a.asset_id,
              label: `${a.active_shelter_id || a.asset_id}${a.city ? ` – ${a.city}` : ""}`
            }))}
            placeholder="All assets"
          />

          <div className="grid grid-cols-2 gap-1.5">
            {/* Shelter Type */}
            <FilterSelect
              label="Type"
              value={state.filterShelterType}
              onChange={set("filterShelterType")}
              options={(shelterTypes.length ? shelterTypes : SHELTER_TYPES_FALLBACK).map(s => ({ value: s, label: s }))}
              placeholder="All types"
            />
            {/* Asset Status */}
            <FilterSelect
              label="Status"
              value={state.filterAssetStatus}
              onChange={set("filterAssetStatus")}
              options={ASSET_STATUSES.map(s => ({ value: s, label: s }))}
              placeholder="All statuses"
            />
            {/* City */}
            <FilterSelect
              label="City"
              value={state.filterCity}
              onChange={set("filterCity")}
              options={cities.map(c => ({ value: c, label: c }))}
              placeholder="All cities"
            />
            {/* Municipality */}
            <FilterSelect
              label="District"
              value={state.filterMunicipality}
              onChange={set("filterMunicipality")}
              options={municipalities.map(m => ({ value: m, label: m }))}
              placeholder="All districts"
            />
          </div>

          {/* Assignment Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 w-14 shrink-0">Assigned</span>
            <div className="flex gap-1">
              {["Assigned", "Unassigned"].map(opt => (
                <button key={opt}
                  onClick={() => onUpdate({ filterAssigned: state.filterAssigned === opt ? "" : opt })}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${
                    state.filterAssigned === opt
                      ? opt === "Assigned" ? "bg-emerald-500 text-white border-emerald-500" : "bg-slate-500 text-white border-slate-500"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Assignment status */}
          <FilterSelect
            label="Asgn Status"
            value={state.filterAssignmentStatus}
            onChange={set("filterAssignmentStatus")}
            options={ASSIGNMENT_STATUSES.map(s => ({ value: s, label: s }))}
            placeholder="Any asgn status"
          />

          {/* Crew */}
          {activeCrew.length > 0 && (
            <FilterSelect
              label="Crew"
              value={state.filterCrew}
              onChange={set("filterCrew")}
              options={activeCrew.map(c => ({ value: c.id, label: c.crew_name }))}
              placeholder="All crews"
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-slate-400 w-14 shrink-0">{label}</span>
      <Select value={value || "__all__"} onValueChange={onChange}>
        <SelectTrigger className="h-6 text-[10px] border-slate-200 flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}