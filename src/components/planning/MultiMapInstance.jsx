import React, { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Color mapping per priority + status
const MARKER_COLOR = {
  // Status-based (takes priority)
  Completed: "#22C55E",
  Deferred: "#A78BFA",
  // Priority-based
  P1: "#EF4444",
  P2: "#F97316",
  Planned: "#3B82F6",
  "In Progress": "#F59E0B",
  // Default
  default: "#CBD5E1",
};

function getMarkerColor(assignment) {
  if (!assignment) return MARKER_COLOR.default;
  if (assignment.assignment_status === "Completed") return MARKER_COLOR.Completed;
  if (assignment.assignment_status === "Deferred") return MARKER_COLOR.Deferred;
  if (assignment.priority_bucket === "P1") return MARKER_COLOR.P1;
  if (assignment.priority_bucket === "P2") return MARKER_COLOR.P2;
  if (assignment.assignment_status === "In Progress") return MARKER_COLOR["In Progress"];
  if (assignment.assignment_status === "Planned") return MARKER_COLOR.Planned;
  return MARKER_COLOR.default;
}

function FlyTo({ asset }) {
  const map = useMap();
  const prevId = useRef(null);
  useEffect(() => {
    if (asset && asset.latitude && asset.longitude && asset.id !== prevId.current) {
      prevId.current = asset.id;
      map.flyTo([asset.latitude, asset.longitude], 15, { animate: true, duration: 0.8 });
    }
  }, [asset, map]);
  return null;
}

function FitAll({ points, trigger }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (!fitted.current && points.length > 0) {
      fitted.current = true;
      const lats = points.map(p => p[0]);
      const lngs = points.map(p => p[1]);
      map.fitBounds(
        [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
        { padding: [30, 30], maxZoom: 14 }
      );
    }
  }, [trigger]);
  return null;
}

export default function MultiMapInstance({ assets, assignments, selectedAssetId, onSelectAsset }) {
  const assignmentByAsset = useMemo(() => {
    const m = {};
    assignments.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [assignments]);

  const markers = useMemo(() =>
    assets.filter(a => a.latitude && a.longitude).map(a => ({
      asset: a,
      assignment: assignmentByAsset[a.id],
      lat: a.latitude,
      lng: a.longitude,
      color: getMarkerColor(assignmentByAsset[a.id]),
      isSelected: a.id === selectedAssetId,
    })),
    [assets, assignmentByAsset, selectedAssetId]
  );

  const points = useMemo(() => markers.map(m => [m.lat, m.lng]), [markers.length]);
  const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId), [assets, selectedAssetId]);

  const defaultCenter = [35.1264, 33.4299]; // Cyprus center

  return (
    <div className="w-full h-full" style={{ isolation: "isolate" }}>
      {markers.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
          No assets with coordinates
        </div>
      ) : (
        <MapContainer
          center={defaultCenter}
          zoom={9}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitAll points={points} trigger={points.length} />
          {selectedAsset && <FlyTo asset={selectedAsset} />}
          {markers.map(m => (
            <CircleMarker
              key={m.asset.id}
              center={[m.lat, m.lng]}
              radius={m.isSelected ? 11 : 7}
              pathOptions={{
                fillColor: m.color,
                fillOpacity: m.isSelected ? 1 : 0.85,
                color: m.isSelected ? "#1e293b" : "#fff",
                weight: m.isSelected ? 2.5 : 1.2,
              }}
              eventHandlers={{ click: () => onSelectAsset(m.asset) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-xs font-semibold">{m.asset.active_shelter_id || m.asset.asset_id}</div>
                <div className="text-xs text-slate-500">{m.asset.city}</div>
                {m.assignment ? (
                  <div className="text-xs mt-0.5 space-y-0.5">
                    <div><span className="font-medium">Status:</span> {m.assignment.assignment_status}</div>
                    {m.assignment.priority_bucket && <div><span className="font-medium">Priority:</span> {m.assignment.priority_bucket}</div>}
                    {m.assignment.assignment_type && <div><span className="font-medium">Type:</span> {m.assignment.assignment_type}</div>}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-0.5">Unassigned</div>
                )}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}