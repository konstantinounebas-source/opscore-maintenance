import React, { useState } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["Planned", "In Progress", "Completed", "Deferred"];
const TYPES = ["Make Safe", "Corrective"];
const PRIORITIES = ["P1", "P2"];
const ASSET_STATES = ["Active", "Under Maintenance", "Installed"];

export default function MapFilterOverlay({ state, onUpdate, assets, crews }) {
  const [open, setOpen] = useState(false);

  const set = (key) => (v) => onUpdate({ [key]: v === "__all__" ? "" : v });

  const cities = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const activeCrew = crews.filter(c => c.is_active !== false);

  // Sorted asset list for dropdown
  const assetOptions = [...assets]
    .sort((a, b) => (a.active_shelter_id || a.asset_id || "").localeCompare(b.active_shelter_id || b.asset_id || ""));

  const activeCount = [
    state.filterAssetState, state.filterStatus, state.filterType,
    state.filterPriority, state.filterCrew, state.filterCity, state.assetSearch
  ].filter(Boolean).length;

  const clearAll = (e) => {
    e.stopPropagation();
    onUpdate({
      filterAssetState: "", filterStatus: "", filterType: "",
      filterPriority: "", filterCrew: "", filterCity: "", assetSearch: ""
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
          {/* Asset search dropdown */}
          <Select value={state.assetSearch || "__all__"} onValueChange={v => onUpdate({ assetSearch: v === "__all__" ? "" : v })}>
            <SelectTrigger className="h-6 text-[10px] border-slate-200 w-full">
              <SelectValue placeholder="All asset IDs" />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              <SelectItem value="__all__">All asset IDs</SelectItem>
              {assetOptions.map(a => (
                <SelectItem key={a.id} value={a.active_shelter_id || a.asset_id}>
                  {a.active_shelter_id || a.asset_id}{a.city ? ` – ${a.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-1.5">
            {/* Asset State */}
            <FilterSelect
              label="Asset State"
              value={state.filterAssetState}
              onChange={set("filterAssetState")}
              options={ASSET_STATES}
              placeholder="All states"
            />
            {/* Status */}
            <FilterSelect
              label="Status"
              value={state.filterStatus}
              onChange={set("filterStatus")}
              options={STATUSES}
              placeholder="All statuses"
            />
            {/* Type */}
            <FilterSelect
              label="Type"
              value={state.filterType}
              onChange={set("filterType")}
              options={TYPES}
              placeholder="All types"
            />
            {/* City */}
            <FilterSelect
              label="City"
              value={state.filterCity}
              onChange={set("filterCity")}
              options={cities}
              placeholder="All cities"
            />
          </div>

          {/* Priority toggle + Crew on same row */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-400 w-12 shrink-0">Priority</span>
            <div className="flex gap-1">
              {PRIORITIES.map(p => (
                <button key={p}
                  onClick={() => onUpdate({ filterPriority: state.filterPriority === p ? "" : p })}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                    state.filterPriority === p
                      ? p === "P1" ? "bg-red-500 text-white border-red-500" : "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                  }`}>{p}</button>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <Select value={state.filterCrew || "__all__"} onValueChange={set("filterCrew")}>
                <SelectTrigger className="h-6 text-[10px] border-slate-200">
                  <SelectValue placeholder="All crews" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All crews</SelectItem>
                  {activeCrew.map(c => <SelectItem key={c.id} value={c.id}>{c.crew_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-slate-400 w-12 shrink-0">{label}</span>
      <Select value={value || "__all__"} onValueChange={onChange}>
        <SelectTrigger className="h-6 text-[10px] border-slate-200 flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}