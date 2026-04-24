import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Plus, Trash2, Eye, EyeOff, Check, X, Pencil, GripVertical } from "lucide-react";
import { COLOR_RULE_FIELDS, resolveFieldValue } from "./workbenchUtils.jsx";

const PRESET_COLORS = ["#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16","#14B8A6","#F43F5E"];

function ColorPicker({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="h-5 w-5 rounded-full border-2 transition-all"
            style={{ backgroundColor: c, borderColor: value === c ? "#1e293b" : "transparent" }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-7 w-9 rounded border border-slate-200 cursor-pointer p-0.5"
        />
        <span className="text-[10px] text-slate-400 font-mono">{value}</span>
        <div className="h-5 w-5 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

export default function VisualLayerManager({
  // Global layer library
  globalLayers,
  // Per-map linked layers (WorkbenchMapLayers records for this map)
  mapLayerLinks,
  // Assets / assignments for extracting field values
  allAssets,
  allAssignments,
  layerAssets,
  // Callbacks
  onCreateGlobalLayer,
  onDeleteGlobalLayer,
  onAddLayerToMap,
  onRemoveLayerFromMap,
  onToggleMapLayer,
  onUpdateMapLayer,
  // Legacy support
  manualLayers,
  visibleLayerIds,
  activeVisualRule,
  onToggleLayer,
  onCreateManualLayer,
  onDeleteManualLayer,
  onSetVisualRule,
  compact = false,
}) {
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1); // 1=field, 2=value, 3=color, 4=label
  const [form, setForm] = useState({ field: "", value: "", color: PRESET_COLORS[0], label: "", priority: 0 });
  const [showAddExisting, setShowAddExisting] = useState(false);

  // Determine if we're in new or legacy mode
  const isNewMode = !!onCreateGlobalLayer;

  // Unique values for the selected field
  const fieldValues = useMemo(() => {
    if (!form.field) return [];
    const values = new Set();
    const fieldDef = COLOR_RULE_FIELDS.find(f => f.id === form.field);
    if (!fieldDef) return [];

    if (fieldDef.source === "assignment") {
      allAssignments.forEach(a => {
        const v = a[form.field];
        if (v) values.add(String(v));
      });
    } else if (fieldDef.source === "asset") {
      allAssets.forEach(a => {
        const v = a[fieldDef.assetKey || form.field];
        if (v) values.add(String(v));
      });
    }
    return Array.from(values).sort();
  }, [form.field, allAssets, allAssignments]);

  // Layers already linked to this map
  const linkedLayerIds = new Set((mapLayerLinks || []).map(ml => ml.layer_id));

  // Global layers NOT yet on this map
  const availableToAdd = (globalLayers || []).filter(l => !linkedLayerIds.has(l.id));

  // Per-map active layers (sorted by priority)
  const activeMapLayers = useMemo(() => {
    if (!mapLayerLinks || !globalLayers) return [];
    return mapLayerLinks
      .map(ml => {
        const layer = globalLayers.find(l => l.id === ml.layer_id);
        return layer ? { ...layer, _mapLink: ml } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        const pa = a._mapLink.priority_override ?? a.default_priority ?? 0;
        const pb = b._mapLink.priority_override ?? b.default_priority ?? 0;
        return pb - pa;
      });
  }, [mapLayerLinks, globalLayers]);

  const resetForm = () => {
    setForm({ field: "", value: "", color: PRESET_COLORS[0], label: "", priority: 0 });
    setStep(1);
    setCreating(false);
  };

  const handleSave = () => {
    if (!form.field || !form.value || !form.color) return;
    const label = form.label.trim() || `${COLOR_RULE_FIELDS.find(f => f.id === form.field)?.label || form.field}: ${form.value}`;
    onCreateGlobalLayer({
      color_by_field: form.field,
      color_by_value: form.value,
      color_hex: form.color,
      label,
      layer_type: "rule_based",
      default_priority: Number(form.priority) || 0,
      is_active: true,
    });
    resetForm();
  };

  // Check for duplicate
  const isDuplicate = form.field && form.value && (globalLayers || []).some(
    l => l.color_by_field === form.field && l.color_by_value === form.value
  );

  // ── Legacy mode fallback (if old props provided) ─────────────────────────────
  if (!isNewMode) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Layers</span>
          </div>
        </div>
        {(manualLayers || []).map(layer => {
          const isVisible = (visibleLayerIds || []).includes(layer.id);
          return (
            <div key={layer.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: layer.color || "#94A3B8" }} />
              <span className={`text-xs flex-1 truncate ${isVisible ? "text-slate-700" : "text-slate-400"}`}>{layer.name || layer.label}</span>
              <button onClick={() => onToggleLayer?.(layer.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity">
                {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </button>
              {onDeleteManualLayer && (
                <button onClick={() => onDeleteManualLayer(layer.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">


      {activeMapLayers.map(layer => {
        const link = layer._mapLink;
        const enabled = link.is_enabled !== false;
        const fieldLabel = COLOR_RULE_FIELDS.find(f => f.id === layer.color_by_field)?.label || layer.color_by_field;
        return (
          <div
            key={layer.id}
            className={`flex items-center gap-2 group px-2 py-1.5 rounded-md border transition-colors ${
              enabled
                ? "border-slate-200 hover:bg-slate-50"
                : "border-slate-100 bg-slate-50/50 opacity-50"
            }`}
          >
            <div className="h-3.5 w-3.5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: layer.color_hex }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">
                {layer.label || `${fieldLabel}: ${layer.color_by_value}`}
              </p>
              <p className="text-[9px] text-slate-400 truncate">{fieldLabel} = {layer.color_by_value}</p>
            </div>
            <button
              onClick={() => onToggleMapLayer(link.id, !enabled)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity shrink-0"
              title={enabled ? "Disable on this map" : "Enable on this map"}
            >
              {enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onRemoveLayerFromMap(link.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity shrink-0"
              title="Remove from this map"
            >
              <X className="h-3 w-3" />
            </button>
            {onDeleteGlobalLayer && (
              <button
                onClick={() => onDeleteGlobalLayer(layer.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity shrink-0"
                title="Delete rule globally"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}