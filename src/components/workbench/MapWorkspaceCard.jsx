import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Maximize2, RotateCcw, ChevronDown, ChevronUp, Layers } from "lucide-react";
import MapFilterBar from "./MapFilterBar";
import MapColorModeSelector from "./MapColorModeSelector";
import MapLegend from "./MapLegend";
import VisualLayerManager from "./VisualLayerManager";
import WorkbenchMap from "./WorkbenchMap";
import AssetActionDrawer from "./AssetActionDrawer";
import { EMPTY_MAP_FILTERS, applyMapFilters, getLegendEntries } from "./workbenchUtils";

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
  onRemove,
  onSaveAssignment,
  onCreateLayer,
  onDeleteLayer,
  onAddToLayer,
  onRemoveFromLayer,
}) {
  // ── Per-map isolated state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState({ ...EMPTY_MAP_FILTERS });
  const [colorMode, setColorMode] = useState("default");
  const [visibleLayerIds, setVisibleLayerIds] = useState([]);
  const [activeVisualRule, setActiveVisualRule] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showLayers, setShowLayers] = useState(false);

  const toggleLayer = (layerId) => {
    setVisibleLayerIds(prev =>
      prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
    );
  };

  const resetMap = () => {
    setFilters({ ...EMPTY_MAP_FILTERS });
    setColorMode("default");
    setVisibleLayerIds([]);
    setActiveVisualRule(null);
    setSelectedAsset(null);
  };

  // ── Derived: filtered assets for this map only ─────────────────────────────
  const assignmentByAssetId = useMemo(() => {
    const m = {};
    allAssignments.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [allAssignments]);

  // Only apply layer visibility as additional filter when layers panel controls it
  const activeLayerFilter = visibleLayerIds.length > 0 ? visibleLayerIds : null;

  const filteredAssets = useMemo(() =>
    applyMapFilters(allAssets, filters, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, activeLayerFilter, layerAssets),
    [allAssets, filters, assignmentByAssetId, incidentsByAsset, workOrdersByAsset, activeLayerFilter, layerAssets]
  );

  // Per-map active color rules (sorted by priority desc)
  const colorRules = useMemo(() => {
    if (!globalLayers || !mapLayerLinks) return null;
    return mapLayerLinks
      .filter(ml => ml.is_enabled !== false)
      .map(ml => {
        const layer = globalLayers.find(l => l.id === ml.layer_id);
        return layer ? { ...layer, _priority: ml.priority_override ?? layer.default_priority ?? 0 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b._priority - a._priority);
  }, [globalLayers, mapLayerLinks]);

  const hasColorRules = colorRules && colorRules.length > 0;

  const legendEntries = useMemo(() =>
    getLegendEntries(colorMode, layers, filteredAssets, allAssignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule, hasColorRules ? colorRules : null),
    [colorMode, layers, filteredAssets, allAssignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule, colorRules, hasColorRules]
  );

  const currentAssignment = selectedAsset ? (assignmentByAssetId[selectedAsset.id] || null) : null;

  return (
    <div className="flex h-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Main workspace */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Map header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Map {mapNumber}</span>
            <div className="h-3 w-px bg-slate-300 shrink-0" />
            <MapColorModeSelector value={colorMode} onChange={setColorMode} />
            <div className="flex items-center gap-2 ml-1">
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.is_ordered}
                  onChange={e => setFilters(f => ({ ...f, is_ordered: e.target.checked }))}
                  className="rounded w-3 h-3"
                />
                Ordered
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.is_implementation_phase}
                  onChange={e => setFilters(f => ({ ...f, is_implementation_phase: e.target.checked }))}
                  className="rounded w-3 h-3"
                />
                Implementation
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-500 hover:text-slate-700 select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={filters.has_work_order}
                  onChange={e => setFilters(f => ({ ...f, has_work_order: e.target.checked }))}
                  className="rounded w-3 h-3"
                />
                Has WO
              </label>
            </div>
            <button
              onClick={() => setShowLayers(v => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors shrink-0 ${
                showLayers ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {visibleLayerIds.length > 0 && <span className="font-semibold">{visibleLayerIds.length}</span>}
            </button>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={resetMap} title="Reset map" className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {totalMaps > 1 && (
              <button onClick={() => onRemove(mapId)} title="Close map" className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-2 py-1.5 border-b border-slate-100 shrink-0">
          <MapFilterBar filters={filters} onChange={setFilters} assets={allAssets} />
        </div>

        {/* Layer manager (collapsed by default) */}
        {showLayers && (
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
              compact
            />
          </div>
        )}

        {/* Map canvas — fills remaining space */}
        <div className="relative overflow-hidden p-1.5" style={{ flex: "1 1 0", minHeight: 0, height: 0 }}>
          <WorkbenchMap
            assets={filteredAssets}
            allAssignments={allAssignments}
            selectedAssetId={selectedAsset?.id}
            onSelectAsset={setSelectedAsset}
            colorMode={colorMode}
            layers={layers}
            layerAssets={layerAssets}
            incidentsByAsset={incidentsByAsset}
            workOrdersByAsset={workOrdersByAsset}
            activeVisualRule={activeVisualRule}
            colorRules={colorRules}
          />
          <MapLegend entries={legendEntries} />
        </div>

        {/* Asset count footer */}
        <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <span className="text-[10px] text-slate-400">
            {filteredAssets.filter(a => a.latitude && a.longitude).length} σημεία στον χάρτη
            {filteredAssets.length !== allAssets.length && (
              <span className="ml-1 text-slate-300">· {filteredAssets.length} of {allAssets.length} assets</span>
            )}
            {selectedAsset && <span className="ml-2 text-indigo-500 font-medium">· {selectedAsset.asset_id} selected</span>}
          </span>
        </div>
      </div>

      {/* Asset action drawer — slides in */}
      {selectedAsset && (
        <AssetActionDrawer
          asset={selectedAsset}
          assignment={currentAssignment}
          incidents={incidents}
          workOrders={workOrders}
          weeks={weeks}
          layers={layers}
          layerAssets={layerAssets}
          onClose={() => setSelectedAsset(null)}
          onSaveAssignment={onSaveAssignment}
          onAddToLayer={onAddToLayer}
          onRemoveFromLayer={onRemoveFromLayer}
        />
      )}
    </div>
  );
}