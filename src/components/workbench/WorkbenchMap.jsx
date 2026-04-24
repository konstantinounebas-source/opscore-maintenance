import React, { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getMapPinColor } from "./workbenchUtils";
import { MAP_LAYERS } from "./MapLayerSelector";

function FitBounds({ points, fitKey, zoomToAsset, onZoomCompleted }) {
  const map = useMap();
  const prevKey = useRef(null);
  useEffect(() => {
    if (points.length > 0 && fitKey !== prevKey.current) {
      prevKey.current = fitKey;
      const lats = points.map(p => p.lat);
      const lngs = points.map(p => p.lng);
      map.fitBounds(
        [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        { padding: [30, 30], maxZoom: 14 }
      );
    }
  }, [fitKey, points.length]);

  useEffect(() => {
     if (zoomToAsset?.latitude && zoomToAsset?.longitude) {
       map.setView([zoomToAsset.latitude, zoomToAsset.longitude], 16);
       onZoomCompleted?.();
     }
   }, [zoomToAsset, map, onZoomCompleted]);

  return null;
}

export default function WorkbenchMap({
  assets,
  allAssignments,
  selectedAssetId,
  onSelectAsset,
  colorMode,
  layers,
  layerAssets,
  incidentsByAsset,
  workOrdersByAsset,
  activeVisualRule,
  colorRules,
  colorOverrides,
  zoomToAsset,
  onZoomCompleted,
  mapLayer = "openstreetmap",
}) {
  const assignmentByAsset = useMemo(() => {
    const m = {};
    allAssignments.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [allAssignments]);

  const markers = useMemo(() =>
    assets.filter(a => a.latitude && a.longitude).map(a => {
      const assignment = assignmentByAsset[a.id];
      let color = getMapPinColor({
        asset: a,
        assignment,
        colorMode,
        layers,
        layerAssets,
        incidentsByAsset,
        workOrdersByAsset,
        activeVisualRule,
        colorRules,
      });
      // Apply color overrides from legend
      if (colorOverrides) {
        for (const [label, overrideColor] of Object.entries(colorOverrides)) {
          let matchesLabel = false;
          switch (colorMode) {
            case "city": matchesLabel = a.city === label; break;
            case "municipality": matchesLabel = a.municipality === label; break;
            case "shelter_type": matchesLabel = a.shelter_type === label; break;
            case "ordered_shelter_type": matchesLabel = a.ordered_shelter_type === label; break;
            case "installed_shelter_type": matchesLabel = a.installed_shelter_type === label; break;
            case "phase": matchesLabel = a.phase === label; break;
            case "order_year": matchesLabel = String(a.order_year) === label; break;
            case "asset_status": matchesLabel = a.status === label; break;
            case "asset_stage": matchesLabel = a.asset_stage === label; break;
            case "asset_source": matchesLabel = a.asset_source === label; break;
            case "existing_condition": matchesLabel = a.existing_condition === label; break;
            case "has_bay": matchesLabel = a.has_bay === label; break;
            case "inspection_status": matchesLabel = a.inspection_status === label; break;
            case "category": matchesLabel = a.category === label; break;
            case "assignment_status": matchesLabel = (assignment?.assignment_status || "Unassigned") === label; break;
            case "assignment_type": matchesLabel = (assignment?.assignment_type || "Unassigned") === label; break;
            case "priority": 
              let priorLabel = "Unassigned";
              if (assignment) {
                if (assignment.priority_bucket === "P1" || assignment.priority_bucket === "Critical") priorLabel = "P1 / Critical";
                else if (assignment.priority_bucket === "P2" || assignment.priority_bucket === "High") priorLabel = "P2 / High";
                else priorLabel = assignment.priority_bucket;
              }
              matchesLabel = priorLabel === label; break;
            case "assigned_state": matchesLabel = (assignment ? "Assigned" : "Unassigned") === label; break;
            case "incident_presence": matchesLabel = ((incidentsByAsset[a.id]?.length > 0 ? "Has Incidents" : "No Incidents")) === label; break;
            case "work_order_presence": matchesLabel = ((workOrdersByAsset[a.id]?.length > 0 ? "Has Work Orders" : "No Work Orders")) === label; break;
            case "planned_week": 
              let weekLabel = "Unassigned";
              if (assignment?.planning_week_id) {
                // Find week label (would need weeks prop, for now just use id)
                weekLabel = `Week ${assignment.planning_week_id}`;
              }
              matchesLabel = weekLabel === label; break;
          }
          if (matchesLabel) { color = overrideColor; break; }
        }
      }
      return {
        asset: a,
        assignment,
        lat: a.latitude,
        lng: a.longitude,
        color,
        isSelected: a.id === selectedAssetId,
      };
    }),
    [assets, assignmentByAsset, colorMode, layers, layerAssets, incidentsByAsset, workOrdersByAsset, selectedAssetId, activeVisualRule, colorRules, colorOverrides]
  );

  const fitKey = useMemo(() => assets.map(a => a.id).join(","), [assets]);
  const defaultCenter = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [35.16, 33.36];
  
  const tileLayer = useMemo(() => {
    const layer = MAP_LAYERS.find(l => l.id === mapLayer);
    return layer || MAP_LAYERS[0];
  }, [mapLayer]);

  if (markers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <div className="text-center py-8">
          <div className="text-slate-400 text-sm mb-1">No assets with coordinates</div>
          <div className="text-xs text-slate-300">Assets need latitude/longitude to appear on the map</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200" style={{ isolation: "isolate", height: "100%", width: "100%" }}>
      <MapContainer center={defaultCenter} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <TileLayer
          attribution={tileLayer.attribution}
          url={tileLayer.url}
        />
        <FitBounds points={markers} fitKey={fitKey} zoomToAsset={zoomToAsset} onZoomCompleted={onZoomCompleted} />
        {markers.map(m => (
          <CircleMarker
            key={m.asset.id}
            center={[m.lat, m.lng]}
            radius={m.isSelected ? 13 : 8}
            pathOptions={{
              fillColor: m.color,
              fillOpacity: 0.92,
              color: m.isSelected ? "#1e293b" : "#fff",
              weight: m.isSelected ? 3 : 1.5,
            }}
            eventHandlers={{ click: (e) => onSelectAsset(m.asset, e) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.97}>
              <div className="text-xs font-bold">{m.asset.asset_id}</div>
              {m.asset.active_shelter_id && <div className="text-xs text-slate-500">{m.asset.active_shelter_id}</div>}
              <div className="text-xs text-slate-500">{m.asset.city}</div>
              {m.assignment ? (
                <div className="text-xs mt-0.5">
                  {m.assignment.assignment_status} · {m.assignment.priority_bucket || "—"}
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-0.5 italic">Unassigned</div>
              )}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}