import React from "react";
import { MapPin } from "lucide-react";

const MAP_LAYERS = [
  {
    id: "openstreetmap",
    label: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  {
    id: "terrain",
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>',
  },
  {
    id: "cartodb-light",
    label: "CartoDB Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
];

export default function MapLayerSelector({ value = "openstreetmap", onChange }) {
  return (
    <div className="flex items-center gap-1">
      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs border border-slate-300 rounded-md bg-white px-2 py-1 text-slate-700 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {MAP_LAYERS.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { MAP_LAYERS };