import React, { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getMapPinColor } from "./workbenchUtils";

function FitBounds({ points, fitKey }) {
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
}) {
  const assignmentByAsset = useMemo(() => {
    const m = {};
    allAssignments.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [allAssignments]);

  const markers = useMemo(() =>
    assets.filter(a => a.latitude && a.longitude).map(a => {
      const assignment = assignmentByAsset[a.id];
      const color = getMapPinColor({
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
      return {
        asset: a,
        assignment,
        lat: a.latitude,
        lng: a.longitude,
        color,
        isSelected: a.id === selectedAssetId,
      };
    }),
    [assets, assignmentByAsset, colorMode, layers, layerAssets, incidentsByAsset, workOrdersByAsset, selectedAssetId, activeVisualRule, colorRules]
  );

  const fitKey = useMemo(() => assets.map(a => a.id).join(","), [assets]);
  const defaultCenter = markers.length > 0 ? [markers[0].lat, markers[0].lng] : [35.16, 33.36];

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={markers} fitKey={fitKey} />
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
            eventHandlers={{ click: () => onSelectAsset(m.asset) }}
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