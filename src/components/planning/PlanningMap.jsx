import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { pinColorStyle } from "./planningUtils";

// Fit map bounds to visible markers
function FitBounds({ points }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length > 0) {
      const lats = points.map(p => p.lat);
      const lngs = points.map(p => p.lng);
      map.fitBounds(
        [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        { padding: [40, 40], maxZoom: 14 }
      );
    }
  }, [points.length]);
  return null;
}

export default function PlanningMap({ assets, assignments, selectedAssetId, onSelectAsset }) {
  const assignmentByAsset = useMemo(() => {
    const map = {};
    assignments.forEach(a => { map[a.asset_id] = a; });
    return map;
  }, [assignments]);

  const markers = useMemo(() =>
    assets.filter(a => a.latitude && a.longitude).map(a => ({
      asset: a,
      assignment: assignmentByAsset[a.id],
      lat: a.latitude,
      lng: a.longitude,
      color: assignmentByAsset[a.id]?.pin_color || "#9CA3AF",
      isSelected: a.id === selectedAssetId,
    })),
    [assets, assignmentByAsset, selectedAssetId]
  );

  const defaultCenter = markers.length > 0
    ? [markers[0].lat, markers[0].lng]
    : [37.98, 23.73]; // Athens default

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200">
      {markers.length === 0 && (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-1">No assets with coordinates to display</div>
            <div className="text-xs text-slate-300">Add latitude/longitude to assets to see them on the map</div>
          </div>
        </div>
      )}
      {markers.length > 0 && (
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={markers} />
          {markers.map(m => (
            <CircleMarker
              key={m.asset.id}
              center={[m.lat, m.lng]}
              radius={m.isSelected ? 12 : 8}
              pathOptions={{
                fillColor: m.color,
                fillOpacity: 0.9,
                color: m.isSelected ? "#1e293b" : "#fff",
                weight: m.isSelected ? 2.5 : 1.5,
              }}
              eventHandlers={{ click: () => onSelectAsset(m.asset) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-xs font-medium">{m.asset.asset_id}</div>
                <div className="text-xs text-slate-600">{m.asset.asset_name}</div>
                {m.assignment && (
                  <div className="text-xs mt-0.5">
                    <span className="font-medium">Status: </span>{m.assignment.assignment_status}
                    {m.assignment.priority_bucket && <> · <span className="font-medium">Priority: </span>{m.assignment.priority_bucket}</>}
                  </div>
                )}
                {!m.assignment && <div className="text-xs text-slate-400 mt-0.5">Not assigned this week</div>}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}