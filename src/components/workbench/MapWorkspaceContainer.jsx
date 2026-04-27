import React, { useState, useRef, useEffect } from "react";
import MapWorkspaceCard from "./MapWorkspaceCard";

function getGridClass(count) {
  if (count === 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-1 grid-rows-2";
  return "grid-cols-2 grid-rows-2";
}

const LAYOUT_OPTIONS = [
  {
    count: 1,
    label: "Single Map",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="1.5" />
      </svg>
    ),
  },
  {
    count: 2,
    label: "2 Maps (stacked)",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="8.5" rx="1" />
        <rect x="3" y="12.5" width="18" height="8.5" rx="1" />
      </svg>
    ),
  },
  {
    count: 4,
    label: "4 Maps (2×2)",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="8.5" height="8.5" rx="1" />
        <rect x="12.5" y="3" width="8.5" height="8.5" rx="1" />
        <rect x="3" y="12.5" width="8.5" height="8.5" rx="1" />
        <rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1" />
      </svg>
    ),
  },
];

function LayoutPickerButton({ count, onSetLayout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LAYOUT_OPTIONS.find(o => o.count === count) || LAYOUT_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors text-xs"
        title="Change map layout"
      >
        {current.icon}
        <svg viewBox="0 0 10 6" className="w-2.5 h-2.5 text-slate-400" fill="currentColor">
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {LAYOUT_OPTIONS.map(opt => (
            <button
              key={opt.count}
              onClick={() => { onSetLayout(opt.count); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${count === opt.count ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700"}`}
            >
              <span className={count === opt.count ? "text-indigo-600" : "text-slate-500"}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MapWorkspaceContainer({
  mapWorkspaces,
  onAddMap,
  onRemoveMap,
  onSetLayout,
  allAssets,
  allAssignments,
  globalLayers,
  mapLayerLinks,
  layers,
  layerAssets,
  weeks,
  incidents,
  workOrders,
  incidentsByAsset,
  workOrdersByAsset,
  planningTypes,
  onSaveAssignment,
  onCreateGlobalLayer,
  onDeleteGlobalLayer,
  onAddLayerToMap,
  onRemoveLayerFromMap,
  onToggleMapLayer,
  onCreateLayer,
  onDeleteLayer,
  onAddToLayer,
  onRemoveFromLayer,
  zoomToAsset,
  onZoomCompleted,
  onTriggerZoom,
  onSelectAssetForPanel,
}) {
  const count = mapWorkspaces.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Map Workspaces</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count} active</span>
        </div>
        <LayoutPickerButton count={count} onSetLayout={onSetLayout} />
      </div>

      {/* Grid */}
      <div className={`flex-1 grid gap-2 p-2 overflow-hidden ${getGridClass(count)}`} style={{ minHeight: 0 }}>
        {mapWorkspaces.map((ws, i) => {
          // Filter mapLayerLinks to only this map's links
          const thisMapLinks = (mapLayerLinks || []).filter(ml => ml.map_id === ws.id);
          return (
            <MapWorkspaceCard
                key={ws.id}
                mapId={ws.id}
                mapNumber={i + 1}
                totalMaps={count}
                allAssets={allAssets}
                allAssignments={allAssignments}
                globalLayers={globalLayers || layers}
                mapLayerLinks={thisMapLinks}
                layers={layers}
                layerAssets={layerAssets}
                weeks={weeks}
                incidents={incidents}
                workOrders={workOrders}
                incidentsByAsset={incidentsByAsset}
                workOrdersByAsset={workOrdersByAsset}
                planningTypes={planningTypes}
                onRemove={onRemoveMap}
                onSaveAssignment={onSaveAssignment}
                onCreateGlobalLayer={onCreateGlobalLayer}
                onDeleteGlobalLayer={onDeleteGlobalLayer}
                onAddLayerToMap={onAddLayerToMap}
                onRemoveLayerFromMap={onRemoveLayerFromMap}
                onToggleMapLayer={onToggleMapLayer}
                onCreateLayer={onCreateLayer}
                onDeleteLayer={onDeleteLayer}
                onAddToLayer={onAddToLayer}
                onRemoveFromLayer={onRemoveFromLayer}
                zoomToAsset={zoomToAsset}
                onZoomCompleted={onZoomCompleted}
                onTriggerZoom={onTriggerZoom}
                onSelectAssetForPanel={onSelectAssetForPanel}
                />
          );
        })}
      </div>
    </div>
  );
}