import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Maximize2, RotateCcw, ChevronDown, ChevronUp, Layers, Search } from "lucide-react";
import MapFilterBar from "./MapFilterBar";
import MapColorModeSelector from "./MapColorModeSelector";
import MapLegend from "./MapLegend";
import VisualLayerManager from "./VisualLayerManager";
import WorkbenchMap from "./WorkbenchMap";

import { EMPTY_MAP_FILTERS, applyMapFilters, getLegendEntries } from "./workbenchUtils";
import MapViewSaveLoad from "./MapViewSaveLoad";
import AssetPopup from "./AssetPopup";
import MapLayerSelector from "./MapLayerSelector";

export default function MapWorkspaceCard({
  mapId,
  mapNumber,
  totalMaps,
  allAssets,
  allAssignments,
  // New architecture
  globalLayers,
  mapLayerLinks,
  onCreateGlobalLayer,
  onDeleteGlobalLayer,
  onAddLayerToMap,
  onRemoveLayerFromMap,
  onToggleMapLayer,
  // Legacy props (kept for backward compat)
  layers,
  layerAssets,
  weeks,
  incidents,
  workOrders,
  incidentsByAsset,
  workOrdersByAsset,
  planningTypes,
  onRemove,
  onSaveAssignment,
  onCreateLayer,
  onDeleteLayer,
  onAddToLayer,
  onRemoveFromLayer,
  zoomToAsset,
  onZoomCompleted,
  onTriggerZoom,
  onSelectAssetForPanel,
}) {
  // ── Per-map isolated state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState({ ...EMPTY_MAP_FILTERS });
  const [colorMode, setColorMode] = useState("ordered_shelter_type");

  const handleColorModeChange = (mode) => {
    setColorMode(mode);
    setColorOverrides({});
    setHiddenValues(new Set());
  };

  const handleLoadView = ({ colorMode: cm, colorOverrides: co, hiddenValues: hv, filters: f }) => {
    setColorMode(cm);
    setColorOverrides(co);
    setHiddenValues(hv instanceof Set ? hv : new Set(hv || []));
    setFilters(f);
  };
  const [visibleLayerIds, setVisibleLayerIds] = useState([]);
  const [activeVisualRule, setActiveVisualRule] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [showLayers, setShowLayers] = useState(false);
  const [colorOverrides, setColorOverrides] = useState({}); // label -> hex
  const [hiddenValues, setHiddenValues] = useState(new Set());
  const [mapLayer, setMapLayer] = useState("openstreetmap");

  const handleColorOverride = (label, color) => {
    setColorOverrides((prev) => ({ ...prev, [label]: color }));
  };

  const toggleLayer = (layerId) => {
    setVisibleLayerIds((prev) =>
    prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId]
    );
  };

  const resetMap = () => {
    setFilters({ ...EMPTY_MAP_FILTERS });
    setColorMode("default");
    setVisibleLayerIds([]);
    setActiveVisualRule(null);
    setSelectedAsset(null);
    setPopupPos(null);
    setColorOverrides({});
    setHiddenValues(new Set());
    setMapLayer("openstreetmap");
  };

  // ── Derived: filtered assets for this map only ─────────────────────────────
  const assignmentByAssetId = useMemo(() => {
    const m = {};
    allAssignments.forEach((a) => {m[a.asset_id] = a;});
    return m;
  }, [allAssignments]);

  // Only apply layer visibility as additional filter when layers panel controls it
  const activeLayerFilter = visibleLayerIds.length > 0 ? visibleLayerIds : null;

  const filteredAssets = useMemo(() =>
  applyMapFilters(allAssets, filters, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, activeLayerFilter, layerAssets, weeks),
  [allAssets, filters, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, activeLayerFilter, layerAssets, weeks]
  );

  // Per-map active color rules (sorted by priority desc)
  const colorRules = useMemo(() => {
    if (!globalLayers || !mapLayerLinks) return null;
    return mapLayerLinks.
    filter((ml) => ml.is_enabled !== false).
    map((ml) => {
      const layer = globalLayers.find((l) => l.id === ml.layer_id);
      return layer ? { ...layer, _priority: ml.priority_override ?? layer.default_priority ?? 0 } : null;
    }).
    filter(Boolean).
    sort((a, b) => b._priority - a._priority);
  }, [globalLayers, mapLayerLinks]);

  const hasColorRules = colorRules && colorRules.length > 0;

  const legendEntries = useMemo(() => {
    const base = getLegendEntries(colorMode, layers, filteredAssets, allAssignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule, null, assignmentByAssetId, weeks);
    // Apply color overrides
    return base.map((e) => colorOverrides[e.label] ? { ...e, color: colorOverrides[e.label] } : e);
  }, [colorMode, layers, filteredAssets, allAssignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule, colorOverrides, assignmentByAssetId, weeks]);

  // Assets visible on map = filtered - hidden by legend
  const visibleAssets = useMemo(() => {
    let results = filteredAssets;
    
    // Apply legend filtering
    if (hiddenValues.size > 0) {
      results = results.filter((a) => {
        const asgn = assignmentByAssetId[a.id];
        let matchLabel = null;

        switch (colorMode) {
          case "city":matchLabel = a.city;break;
          case "municipality":matchLabel = a.municipality;break;
          case "shelter_type":matchLabel = a.shelter_type;break;
          case "ordered_shelter_type":matchLabel = a.ordered_shelter_type;break;
          case "installed_shelter_type":matchLabel = a.installed_shelter_type;break;
          case "phase":matchLabel = a.phase;break;
          case "order_year":matchLabel = String(a.order_year);break;
          case "asset_status":matchLabel = a.status;break;
          case "asset_stage":matchLabel = a.asset_stage;break;
          case "asset_source":matchLabel = a.asset_source;break;
          case "existing_condition":matchLabel = a.existing_condition;break;
          case "has_bay":matchLabel = a.has_bay;break;
          case "inspection_status":matchLabel = a.inspection_status;break;
          case "category":matchLabel = a.category;break;
          case "assignment_status":matchLabel = asgn?.assignment_status || "Unassigned";break;
          case "assignment_type":matchLabel = asgn?.assignment_type || "Unassigned";break;
          case "priority":
            if (!asgn) matchLabel = "Unassigned";else
            if (asgn.priority_bucket === "P1" || asgn.priority_bucket === "Critical") matchLabel = "P1 / Critical";else
            if (asgn.priority_bucket === "P2" || asgn.priority_bucket === "High") matchLabel = "P2 / High";else
            matchLabel = asgn.priority_bucket;
            break;
          case "assigned_state":matchLabel = asgn ? "Assigned" : "Unassigned";break;
          case "incident_presence":matchLabel = incidentsByAsset[a.id]?.length > 0 ? "Has Incidents" : "No Incidents";break;
          case "work_order_presence":matchLabel = workOrdersByAsset[a.id]?.length > 0 ? "Has Work Orders" : "No Work Orders";break;
          case "planned_week":
            if (asgn?.planning_week_id) {
              const week = weeks.find((w) => w.id === asgn.planning_week_id);
              matchLabel = week ? `${week.week_code} - ${week.week_name}` : asgn.planning_week_id;
            } else {
              matchLabel = "Unassigned";
            }
            break;
          default:matchLabel = null;
        }

        return !matchLabel || !hiddenValues.has(matchLabel);
      });
    }
    
    return results;
  }, [filteredAssets, hiddenValues, colorMode, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, weeks]);

  const currentAssignment = selectedAsset ? assignmentByAssetId[selectedAsset.id] || null : null;

  return (
    <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Main workspace */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Map header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Map {mapNumber}</span>
            <div className="h-3 w-px bg-slate-300 shrink-0" />
            <MapColorModeSelector value={colorMode} onChange={handleColorModeChange} />
            <div className="flex items-center gap-2 ml-1">
              <MapLayerSelector value={mapLayer} onChange={setMapLayer} />
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={!filters.is_ordered && !filters.is_implementation_phase && !filters.has_work_order && !filters.show_unassigned_only}
                  onChange={(e) => {if (e.target.checked) setFilters({ ...EMPTY_MAP_FILTERS });}}
                  className="rounded w-3 h-3" />

                All
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.is_ordered}
                  onChange={(e) => setFilters((f) => ({ ...f, is_ordered: e.target.checked }))}
                  className="rounded w-3 h-3" />

                Ordered
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.is_implementation_phase}
                  onChange={(e) => setFilters((f) => ({ ...f, is_implementation_phase: e.target.checked }))}
                  className="rounded w-3 h-3" />

                Implementation
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.has_work_order}
                  onChange={(e) => setFilters((f) => ({ ...f, has_work_order: e.target.checked }))}
                  className="rounded w-3 h-3" />

                Has WO
              </label>
            </div>
            







            
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <MapViewSaveLoad
              colorMode={colorMode}
              colorOverrides={colorOverrides}
              hiddenValues={hiddenValues}
              filters={filters}
              onLoad={handleLoadView} />
            
            <button onClick={resetMap} title="Reset map" className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {totalMaps > 1 &&
            <button onClick={() => onRemove(mapId)} title="Close map" className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50">
                <X className="h-3.5 w-3.5" />
              </button>
            }
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-2 py-1.5 border-b border-slate-100 shrink-0">
          <MapFilterBar filters={filters} onChange={setFilters} assets={allAssets} weeks={weeks} />
        </div>

        {/* Layer manager (collapsed by default) */}
        {showLayers &&
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 shrink-0 max-h-64 overflow-y-auto">
            <VisualLayerManager
            globalLayers={globalLayers || layers}
            mapLayerLinks={mapLayerLinks || []}
            allAssets={allAssets}
            allAssignments={allAssignments}
            layerAssets={layerAssets}
            onCreateGlobalLayer={onCreateGlobalLayer || onCreateLayer}
            onDeleteGlobalLayer={onDeleteGlobalLayer || onDeleteLayer}
            onAddLayerToMap={onAddLayerToMap ? (layerId) => onAddLayerToMap(mapId, layerId) : undefined}
            onRemoveLayerFromMap={onRemoveLayerFromMap}
            onToggleMapLayer={onToggleMapLayer}
            compact />
          
          </div>
        }

        {/* Map canvas — fills remaining space */}
         <div className="relative overflow-hidden p-1.5" style={{ flex: "1 1 0", minHeight: 0, height: 0 }}>
           <WorkbenchMap
             assets={visibleAssets}
             allAssignments={allAssignments}
             selectedAssetId={selectedAsset?.id}
             onSelectAsset={(asset) => {
               setSelectedAsset(asset);
               setPopupPos({ x: 50, y: 50 });
             }}
             colorMode={colorMode}
             layers={layers}
             layerAssets={layerAssets}
             incidentsByAsset={incidentsByAsset}
             workOrdersByAsset={workOrdersByAsset}
             activeVisualRule={activeVisualRule}
             colorRules={colorRules}
             colorOverrides={colorOverrides}
             hiddenValues={hiddenValues}
             legendEntries={legendEntries}
             zoomToAsset={zoomToAsset}
             onZoomCompleted={() => onZoomCompleted?.()}
             mapLayer={mapLayer} />
          
           <MapLegend
            entries={legendEntries}
            onColorOverride={handleColorOverride}
            onHiddenChange={setHiddenValues}
            hiddenValues={hiddenValues} />
          

           {/* Asset Popup */}
           {selectedAsset && popupPos &&
           <AssetPopup
             asset={selectedAsset}
             popupPos={popupPos}
             assignment={assignmentByAssetId[selectedAsset.id] || null}
             incidents={incidents || []}
             workOrders={workOrders || []}
             weeks={weeks || []}
             planningTypes={planningTypes || []}
             onClose={() => {
               setSelectedAsset(null);
               setPopupPos(null);
             }}
             onSaveAssignment={onSaveAssignment}
             onZoomToAsset={onTriggerZoom}
             onOpenSidePanel={() => {
               setSelectedAsset(null);
               setPopupPos(null);
               onSelectAssetForPanel?.(selectedAsset);
             }} />

          }
         </div>

        {/* Asset count footer */}
        <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <span className="text-[10px] text-slate-400">
            {filteredAssets.filter((a) => a.latitude && a.longitude).length} σημεία στον χάρτη
            {filteredAssets.length !== allAssets.length &&
            <span className="ml-1 text-slate-300">· {filteredAssets.length} of {allAssets.length} assets</span>
            }
            {selectedAsset && <span className="ml-2 text-indigo-500 font-medium">· {selectedAsset.asset_id} selected</span>}
          </span>
        </div>
      </div>


    </div>);

}