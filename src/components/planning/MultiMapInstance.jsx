import React, { useMemo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Default color mapping
const MARKER_COLOR = {
  Completed: "#22C55E",
  Deferred: "#A78BFA",
  P1: "#EF4444",
  P2: "#F97316",
  Planned: "#3B82F6",
  "In Progress": "#F59E0B",
  default: "#CBD5E1",
};

// Auto color palette for color-by modes
const AUTO_PALETTE = [
  "#3B82F6", "#EF4444", "#22C55E", "#F97316", "#8B5CF6",
  "#14B8A6", "#EC4899", "#EAB308", "#6B7280", "#1E293B",
];

function getDefaultColor(assignment) {
  if (!assignment) return MARKER_COLOR.default;
  if (assignment.assignment_status === "Completed") return MARKER_COLOR.Completed;
  if (assignment.assignment_status === "Deferred") return MARKER_COLOR.Deferred;
  if (assignment.priority_bucket === "P1") return MARKER_COLOR.P1;
  if (assignment.priority_bucket === "P2") return MARKER_COLOR.P2;
  if (assignment.assignment_status === "In Progress") return MARKER_COLOR["In Progress"];
  if (assignment.assignment_status === "Planned") return MARKER_COLOR.Planned;
  return MARKER_COLOR.default;
}

function buildColorByMap(assets, assignments, colorBy) {
  if (!colorBy || colorBy === "single") return null;
  const assignmentByAsset = {};
  assignments.forEach(a => { assignmentByAsset[a.asset_id] = a; });

  const values = new Set();
  assets.forEach(a => {
    if (colorBy === "status") values.add(a.status || "Unknown");
    else if (colorBy === "shelter_type") values.add(a.shelter_type || "Unknown");
    else if (colorBy === "city") values.add(a.city || "Unknown");
    else if (colorBy === "assigned") values.add(assignmentByAsset[a.id] ? "Assigned" : "Unassigned");
  });

  const map = {};
  const sorted = [...values].sort();
  sorted.forEach((v, i) => { map[v] = AUTO_PALETTE[i % AUTO_PALETTE.length]; });
  return { map, assignmentByAsset };
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

export default function MultiMapInstance({ assets, assignments, selectedAssetId, onSelectAsset, markerColor, colorBy, layers = [], filterLayerId }) {
  const assignmentByAsset = useMemo(() => {
    const m = {};
    assignments.forEach(a => { m[a.asset_id] = a; });
    return m;
  }, [assignments]);

  // Build color-by lookup
  const colorByData = useMemo(() => buildColorByMap(assets, assignments, colorBy), [assets, assignments, colorBy]);

  // Layer asset lookup
  const activeLayer = useMemo(() => layers.find(l => l.id === filterLayerId), [layers, filterLayerId]);
  const layerAssetIds = useMemo(() => {
    if (!activeLayer) return null;
    return new Set(activeLayer.assetIds || []);
  }, [activeLayer]);

  const markers = useMemo(() => {
    return assets
      .filter(a => a.latitude && a.longitude)
      .filter(a => !layerAssetIds || layerAssetIds.has(a.id))
      .map(a => {
        const assignment = assignmentByAsset[a.id];

        let color;
        if (colorBy === "single" && markerColor) {
          color = markerColor;
        } else if (colorByData) {
          // Color by field
          let key;
          if (colorBy === "status") key = a.status || "Unknown";
          else if (colorBy === "shelter_type") key = a.shelter_type || "Unknown";
          else if (colorBy === "city") key = a.city || "Unknown";
          else if (colorBy === "assigned") key = assignmentByAsset[a.id] ? "Assigned" : "Unassigned";
          color = colorByData.map[key] || MARKER_COLOR.default;
        } else {
          color = getDefaultColor(assignment);
        }

        // Layer color override if asset belongs to active layer
        if (activeLayer && layerAssetIds && layerAssetIds.has(a.id) && activeLayer.color) {
          color = activeLayer.color;
        }

        return {
          asset: a,
          assignment,
          lat: a.latitude,
          lng: a.longitude,
          color,
          isSelected: a.id === selectedAssetId,
        };
      });
  }, [assets, assignmentByAsset, selectedAssetId, markerColor, colorBy, colorByData, layerAssetIds, activeLayer]);

  // Build dynamic legend
  const legend = useMemo(() => {
    if (colorBy === "single" && markerColor) {
      return [{ color: markerColor, label: "All filtered assets" }];
    }
    if (colorByData) {
      return Object.entries(colorByData.map).map(([label, color]) => ({ color, label }));
    }
    // Default legend — only show what's present
    const items = [];
    const has = (check) => markers.some(m => m.color === MARKER_COLOR[check]);
    if (has("P1")) items.push({ color: MARKER_COLOR.P1, label: "P1" });
    if (has("P2")) items.push({ color: MARKER_COLOR.P2, label: "P2" });
    if (has("Planned")) items.push({ color: MARKER_COLOR.Planned, label: "Planned" });
    if (has("In Progress")) items.push({ color: MARKER_COLOR["In Progress"], label: "In Progress" });
    if (has("Completed")) items.push({ color: MARKER_COLOR.Completed, label: "Completed" });
    if (has("Deferred")) items.push({ color: MARKER_COLOR.Deferred, label: "Deferred" });
    if (markers.some(m => m.color === MARKER_COLOR.default)) items.push({ color: MARKER_COLOR.default, label: "Unassigned" });
    return items;
  }, [markers, colorBy, markerColor, colorByData]);

  const points = useMemo(() => markers.map(m => [m.lat, m.lng]), [markers.length]);
  const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId), [assets, selectedAssetId]);
  const defaultCenter = [35.1264, 33.4299];

  return (
    <div className="w-full h-full" style={{ isolation: "isolate" }}>
      {markers.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
          No assets with coordinates
        </div>
      ) : (
        <MapContainer center={defaultCenter} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
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
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-0.5">Unassigned</div>
                )}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      )}

      {/* Dynamic color legend */}
      {legend.length > 0 && (
        <div className="absolute bottom-1.5 left-1.5 z-[500] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1.5 shadow-sm">
            <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[180px]">
              {legend.slice(0, 8).map(item => (
                <div key={item.color + item.label} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white shadow-sm" style={{ background: item.color }} />
                  <span className="text-[9px] text-slate-600 font-medium truncate max-w-[60px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}