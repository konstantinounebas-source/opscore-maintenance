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

  const legendEntries = useMemo(() =>
    getLegendEntries(colorMode, layers, filteredAssets, allAssignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule),
    [colorMode, layers, filteredAssets, allAssignments, incidentsByAsset, workOrdersByAsset, layerAssets, activeVisualRule]
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
              manualLayers={layers}
              visualRules={activeVisualRule ? [activeVisualRule] : []}
              layerAssets={layerAssets}
              allAssets={allAssets}
              allAssignments={allAssignments}
              incidentsByAsset={incidentsByAsset}
              workOrdersByAsset={workOrdersByAsset}
              visibleLayerIds={visibleLayerIds}
              activeVisualRule={activeVisualRule}
              onToggleLayer={toggleLayer}
              onCreateManualLayer={onCreateLayer}
              onDeleteManualLayer={onDeleteLayer}
              onSetVisualRule={setActiveVisualRule}
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
          />
          <MapLegend entries={legendEntries} />
        </div>

        {/* Asset count footer */}
        <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <span className="text-[10px] text-slate-400">
            {filteredAssets.length} of {allAssets.length} assets shown
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