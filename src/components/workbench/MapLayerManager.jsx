import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Trash2, Eye, EyeOff, Check, X } from "lucide-react";

const LAYER_COLORS = ["#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16"];

export default function MapLayerManager({ layers, layerAssets, visibleLayerIds, onToggleLayer, onCreateLayer, onDeleteLayer, compact = false }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LAYER_COLORS[0]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateLayer({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(LAYER_COLORS[0]);
    setCreating(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Layers</span>
          {layers.length > 0 && <span className="text-[10px] text-slate-400">({layers.length})</span>}
        </div>
        <button onClick={() => setCreating(v => !v)} className="text-indigo-600 hover:text-indigo-800">
          {creating ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>

      {creating && (
        <div className="border border-indigo-200 rounded-lg p-2 space-y-2 bg-indigo-50/30">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Layer name..."
            className="h-7 text-xs"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {LAYER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="h-5 w-5 rounded-full border-2 transition-all"
                style={{ backgroundColor: c, borderColor: newColor === c ? "#1e293b" : "transparent" }}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleCreate} disabled={!newName.trim()}>
              <Check className="h-3 w-3 mr-1" /> Create
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {layers.length === 0 && !creating && (
        <p className="text-xs text-slate-400 py-1">No layers yet.</p>
      )}

      {layers.map(layer => {
        const assetCount = layerAssets.filter(la => la.planning_layer_id === layer.id).length;
        const isVisible = visibleLayerIds.includes(layer.id);
        return (
          <div key={layer.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: layer.color || "#94A3B8" }} />
            <span className={`text-xs flex-1 truncate ${isVisible ? "text-slate-700" : "text-slate-400"}`}>{layer.name}</span>
            <span className="text-[10px] text-slate-400 shrink-0">{assetCount}</span>
            <button onClick={() => onToggleLayer(layer.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity">
              {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            {onDeleteLayer && (
              <button onClick={() => onDeleteLayer(layer.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}