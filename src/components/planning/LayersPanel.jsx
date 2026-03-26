import React, { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280", "#1E293B",
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-4 h-4 rounded-full border-2 transition-all"
          style={{
            background: c,
            borderColor: value === c ? "#1e293b" : "transparent",
            transform: value === c ? "scale(1.2)" : "scale(1)",
          }}
        />
      ))}
      <input
        type="color"
        value={value || "#3B82F6"}
        onChange={e => onChange(e.target.value)}
        className="w-4 h-4 rounded cursor-pointer border border-slate-200"
        title="Custom color"
      />
    </div>
  );
}

export default function LayersPanel({ layers, assets, onCreateLayer, onDeleteLayer, onUpdateLayer, onAddAsset, onRemoveAsset }) {
  const [newLayerName, setNewLayerName] = useState("");
  const [newLayerColor, setNewLayerColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [addingAssetTo, setAddingAssetTo] = useState(null);
  const [assetSearch, setAssetSearch] = useState("");

  const handleCreate = () => {
    if (!newLayerName.trim()) return;
    onCreateLayer({ name: newLayerName.trim(), color: newLayerColor });
    setNewLayerName("");
    setNewLayerColor("#3B82F6");
    setCreating(false);
  };

  const handleEdit = (layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
    setEditColor(layer.color || "#3B82F6");
  };

  const handleSaveEdit = (layer) => {
    onUpdateLayer(layer.id, { name: editName, color: editColor });
    setEditingId(null);
  };

  const layerAssetIds = (layer) => new Set(layer.assetIds || []);

  const filteredAssets = assets.filter(a => {
    const q = assetSearch.toLowerCase();
    return !q || (a.active_shelter_id || a.asset_id || "").toLowerCase().includes(q) || (a.city || "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Layers</span>
          <span className="text-[10px] text-slate-400">({layers.length})</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2"
          onClick={() => setCreating(v => !v)}
        >
          <Plus className="w-3 h-3" /> New Layer
        </Button>
      </div>

      {/* Create new layer */}
      {creating && (
        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 space-y-1.5 shrink-0">
          <Input
            placeholder="Layer name..."
            value={newLayerName}
            onChange={e => setNewLayerName(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <ColorPicker value={newLayerColor} onChange={setNewLayerColor} />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700 flex-1" onClick={handleCreate} disabled={!newLayerName.trim()}>
              <Check className="w-3 h-3 mr-1" /> Create
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setCreating(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {layers.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            <Layers className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            No layers yet.<br />Create a layer to group assets.
          </div>
        )}

        {layers.map(layer => {
          const assetIds = layerAssetIds(layer);
          const layerAssets = assets.filter(a => assetIds.has(a.id));
          const isExpanded = expandedId === layer.id;
          const isEditing = editingId === layer.id;
          const isAddingAsset = addingAssetTo === layer.id;

          return (
            <div key={layer.id} className="border-b border-slate-100">
              {/* Layer header row */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-slate-50 transition-colors">
                <button onClick={() => setExpandedId(isExpanded ? null : layer.id)} className="text-slate-400 hover:text-slate-600">
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: layer.color || "#6B7280" }} />

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-5 text-[10px] flex-1"
                      onKeyDown={e => e.key === "Enter" && handleSaveEdit(layer)}
                      autoFocus
                    />
                    <button onClick={() => handleSaveEdit(layer)} className="text-emerald-500 hover:text-emerald-700">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="flex-1 text-[11px] font-semibold text-slate-700 truncate">{layer.name}</span>
                )}

                <span className="text-[9px] text-slate-400 shrink-0">{assetIds.size} assets</span>

                {!isEditing && (
                  <div className="flex gap-0.5">
                    <button onClick={() => handleEdit(layer)} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors">
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => onDeleteLayer(layer.id)} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded layer details */}
              {isExpanded && (
                <div className="px-3 pb-2 space-y-1.5">
                  {/* Color edit */}
                  {isEditing && (
                    <ColorPicker value={editColor} onChange={setEditColor} />
                  )}

                  {/* Assets in layer */}
                  {layerAssets.length > 0 && (
                    <div className="space-y-0.5">
                      {layerAssets.map(a => (
                        <div key={a.id} className="flex items-center justify-between py-0.5 px-1.5 rounded bg-slate-50 text-[10px]">
                          <span className="font-mono font-semibold text-slate-700">{a.active_shelter_id || a.asset_id}</span>
                          <span className="text-slate-400">{a.city || ""}</span>
                          <button
                            onClick={() => onRemoveAsset(layer.id, a.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add asset to layer */}
                  {isAddingAsset ? (
                    <div className="space-y-1">
                      <Input
                        placeholder="Search asset..."
                        value={assetSearch}
                        onChange={e => setAssetSearch(e.target.value)}
                        className="h-6 text-[10px]"
                        autoFocus
                      />
                      <div className="max-h-28 overflow-y-auto space-y-0.5 border border-slate-100 rounded p-1">
                        {filteredAssets.filter(a => !assetIds.has(a.id)).slice(0, 30).map(a => (
                          <button
                            key={a.id}
                            onClick={() => { onAddAsset(layer.id, a.id); }}
                            className="w-full text-left text-[10px] px-1.5 py-0.5 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2"
                          >
                            <span className="font-mono font-semibold">{a.active_shelter_id || a.asset_id}</span>
                            <span className="text-slate-400">{a.city}</span>
                          </button>
                        ))}
                        {filteredAssets.filter(a => !assetIds.has(a.id)).length === 0 && (
                          <div className="text-[10px] text-slate-400 text-center py-1">No more assets</div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px] w-full" onClick={() => { setAddingAssetTo(null); setAssetSearch(""); }}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingAssetTo(layer.id); setAssetSearch(""); }}
                      className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add assets to layer
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}