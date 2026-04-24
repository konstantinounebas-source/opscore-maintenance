import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MapWorkspaceCard from "./MapWorkspaceCard";

function getGridClass(count) {
  if (count === 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3) return "grid-cols-2 grid-rows-2";
  return "grid-cols-2 grid-rows-2";
}

export default function MapWorkspaceContainer({
  mapWorkspaces,
  onAddMap,
  onRemoveMap,
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
}) {
  const count = mapWorkspaces.length;
  const canAdd = count < 4;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Map Workspaces</span>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count} active</span>
        </div>
        {canAdd && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onAddMap}>
            <Plus className="h-3.5 w-3.5" /> Add Map
          </Button>
        )}
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
             />
          );
        })}
      </div>
    </div>
  );
}