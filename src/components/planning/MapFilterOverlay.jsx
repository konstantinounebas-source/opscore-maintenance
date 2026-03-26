import React, { useState } from "react";
import { Filter, ChevronDown, ChevronUp, Palette, Layers } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ASSET_STATUSES = ["Active", "Inactive", "Installed", "Pending Installation", "Under Maintenance", "Damaged", "Out of Service"];
const ASSIGNMENT_STATUSES = ["Planned", "In Progress", "Completed", "Deferred"];
const SHELTER_TYPES_FALLBACK = ["Standard Shelter", "Smart Shelter", "Solar Shelter"];

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#1E293B",
];

const COLOR_BY_OPTIONS = [
  { value: "", label: "Default (assignment status)" },
  { value: "status", label: "Asset Status" },
  { value: "shelter_type", label: "Shelter Type" },
  { value: "city", label: "City" },
  { value: "assigned", label: "Assigned / Unassigned" },
  { value: "single", label: "Single color (manual)" },
];

export default function MapFilterOverlay({ state, onUpdate, assets, crews, layers = [] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("filters"); // "filters" | "color" | "layers"

  const set = (key) => (v) => onUpdate({ [key]: v === "__all__" ? "" : v });

  const cities = [...new Set(assets.map(a => a.city).filter(Boolean))].sort();
  const municipalities = [...new Set(assets.map(a => a.municipality).filter(Boolean))].sort();
  const shelterTypes = [...new Set(assets.map(a => a.shelter_type).filter(Boolean))].sort();
  const activeCrew = crews.filter(c => c.is_active !== false);

  const assetOptions = [...assets]
    .sort((a, b) => (a.active_shelter_id || a.asset_id || "").localeCompare(b.active_shelter_id || b.asset_id || ""));

  const activeCount = [
    state.filterAssetStatus, state.filterAssignmentStatus, state.filterShelterType,
    state.filterCity, state.filterMunicipality, state.filterCrew, state.assetSearch,
    state.filterAssigned, state.filterLayerId,
  ].filter(Boolean).length;

  const clearAll = (e) => {
    e.stopPropagation();
    onUpdate({
      filterAssetStatus: "", filterAssignmentStatus: "", filterShelterType: "",
      filterCity: "", filterMunicipality: "", filterCrew: "", assetSearch: "",
      filterAssigned: "", filterLayerId: "",
    });
  };

  const selectedLayer = layers.find(l => l.id === state.filterLayerId);

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
          {state.markerColor && (
            <span className="w-3 h-3 rounded-full border border-white shadow-sm" style={{ background: state.markerColor }} />
          )}
          {selectedLayer && (
            <span className="flex items-center gap-0.5 text-[9px]">
              <span className="w-2 h-2 rounded-full" style={{ background: selectedLayer.color || "#6B7280" }} />
              {selectedLayer.name}
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
        <div className="bg-white border border-slate-200 border-t-0 rounded-b-lg shadow-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-100">
            {[
              { id: "filters", icon: <Filter className="w-2.5 h-2.5" />, label: "Filters" },
              { id: "color",   icon: <Palette className="w-2.5 h-2.5" />, label: "Color" },
              { id: "layers",  icon: <Layers className="w-2.5 h-2.5" />, label: "Layers" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  tab === t.id ? "text-indigo-700 border-b-2 border-indigo-500 bg-indigo-50" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* FILTERS tab */}
          {tab === "filters" && (
            <div className="p-2 space-y-1.5">
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
                <FilterSelect
                  label="Type"
                  value={state.filterShelterType}
                  onChange={set("filterShelterType")}
                  options={(shelterTypes.length ? shelterTypes : SHELTER_TYPES_FALLBACK).map(s => ({ value: s, label: s }))}
                  placeholder="All types"
                />
                <FilterSelect
                  label="Status"
                  value={state.filterAssetStatus}
                  onChange={set("filterAssetStatus")}
                  options={ASSET_STATUSES.map(s => ({ value: s, label: s }))}
                  placeholder="All statuses"
                />
                <FilterSelect
                  label="City"
                  value={state.filterCity}
                  onChange={set("filterCity")}
                  options={cities.map(c => ({ value: c, label: c }))}
                  placeholder="All cities"
                />
                <FilterSelect
                  label="District"
                  value={state.filterMunicipality}
                  onChange={set("filterMunicipality")}
                  options={municipalities.map(m => ({ value: m, label: m }))}
                  placeholder="All districts"
                />
              </div>
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
              <FilterSelect
                label="Asgn Status"
                value={state.filterAssignmentStatus}
                onChange={set("filterAssignmentStatus")}
                options={ASSIGNMENT_STATUSES.map(s => ({ value: s, label: s }))}
                placeholder="Any asgn status"
              />
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

          {/* COLOR tab */}
          {tab === "color" && (
            <div className="p-2 space-y-2">
              <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide">Color markers by</div>
              <Select value={state.colorBy || ""} onValueChange={v => onUpdate({ colorBy: v, markerColor: "" })}>
                <SelectTrigger className="h-6 text-[10px] border-slate-200 w-full">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_BY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Single manual color */}
              {state.colorBy === "single" && (
                <div className="space-y-1.5">
                  <div className="text-[9px] text-slate-400">Pick a marker color</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => onUpdate({ markerColor: c })}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{
                          background: c,
                          borderColor: state.markerColor === c ? "#1e293b" : "transparent",
                          transform: state.markerColor === c ? "scale(1.25)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-400">Custom:</span>
                    <input
                      type="color"
                      value={state.markerColor || "#3B82F6"}
                      onChange={e => onUpdate({ markerColor: e.target.value })}
                      className="w-8 h-6 rounded cursor-pointer border border-slate-200"
                    />
                    {state.markerColor && (
                      <span className="text-[9px] font-mono text-slate-500">{state.markerColor}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Color preview */}
              {state.colorBy && state.colorBy !== "single" && (
                <div className="text-[9px] text-slate-400 bg-slate-50 rounded p-1.5">
                  Assets will be colored by <b>{COLOR_BY_OPTIONS.find(o => o.value === state.colorBy)?.label}</b>.
                  Distinct values get unique colors automatically.
                </div>
              )}

              {!state.colorBy && (
                <div className="text-[9px] text-slate-400 bg-slate-50 rounded p-1.5">
                  Using default colors (P1=red, P2=orange, Planned=blue, etc.)
                </div>
              )}
            </div>
          )}

          {/* LAYERS tab */}
          {tab === "layers" && (
            <div className="p-2 space-y-1.5">
              <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Filter by Layer</div>
              {layers.length === 0 ? (
                <div className="text-[9px] text-slate-400 text-center py-2">No layers yet. Create layers in the right panel.</div>
              ) : (
                <div className="space-y-1">
                  <button
                    onClick={() => onUpdate({ filterLayerId: "" })}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors ${!state.filterLayerId ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    All assets (no layer filter)
                  </button>
                  {layers.map(layer => (
                    <button
                      key={layer.id}
                      onClick={() => onUpdate({ filterLayerId: state.filterLayerId === layer.id ? "" : layer.id })}
                      className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors flex items-center gap-1.5 ${
                        state.filterLayerId === layer.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: layer.color || "#6B7280" }} />
                      <span className="truncate">{layer.name}</span>
                      <span className="ml-auto text-[9px] text-slate-400">{layer.assetCount || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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