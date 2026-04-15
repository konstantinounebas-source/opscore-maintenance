import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, Plus, Trash2, Eye, EyeOff, Check, X, Palette } from "lucide-react";

const LAYER_COLORS = ["#6366F1","#EC4899","#F59E0B","#10B981","#3B82F6","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16"];

// Field definitions for rule-based coloring
const VISUAL_FIELDS = [
  { id: "assignment_status", label: "Assignment Status", category: "planning" },
  { id: "assignment_type", label: "Assignment Type", category: "planning" },
  { id: "priority_bucket", label: "Priority Bucket", category: "planning" },
  { id: "asset_status", label: "Asset Status", category: "asset" },
  { id: "city", label: "City", category: "asset" },
  { id: "shelter_type", label: "Shelter Type", category: "asset" },
  { id: "has_incident", label: "Has Open Incident", category: "incident" },
  { id: "has_work_order", label: "Has Open Work Order", category: "workorder" },
  { id: "team_name", label: "Team Name", category: "planning" },
  { id: "assigned_to", label: "Assigned To", category: "planning" },
];

export default function VisualLayerManager({
  manualLayers,
  visualRules,
  layerAssets,
  allAssets,
  allAssignments,
  incidentsByAsset,
  workOrdersByAsset,
  visibleLayerIds,
  activeVisualRule,
  onToggleLayer,
  onCreateManualLayer,
  onDeleteManualLayer,
  onSetVisualRule,
  compact = false,
}) {
  const [creatingManual, setCreatingManual] = useState(false);
  const [creatingVisual, setCreatingVisual] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(LAYER_COLORS[0]);
  const [selectedField, setSelectedField] = useState("");
  const [selectedValues, setSelectedValues] = useState([]);

  // Extract unique values for selected field
  const fieldValues = useMemo(() => {
    if (!selectedField) return [];
    
    const values = new Set();
    
    if (selectedField === "assignment_status") {
      allAssignments.forEach(a => {
        if (a.assignment_status) values.add(a.assignment_status);
      });
    } else if (selectedField === "assignment_type") {
      allAssignments.forEach(a => {
        if (a.assignment_type) values.add(a.assignment_type);
      });
    } else if (selectedField === "priority_bucket") {
      allAssignments.forEach(a => {
        if (a.priority_bucket) values.add(a.priority_bucket);
      });
    } else if (selectedField === "team_name") {
      allAssignments.forEach(a => {
        if (a.team_name) values.add(a.team_name);
      });
    } else if (selectedField === "assigned_to") {
      allAssignments.forEach(a => {
        if (a.assigned_to) values.add(a.assigned_to);
      });
    } else if (selectedField === "asset_status") {
      allAssets.forEach(a => {
        if (a.status) values.add(a.status);
      });
    } else if (selectedField === "city") {
      allAssets.forEach(a => {
        if (a.city) values.add(a.city);
      });
    } else if (selectedField === "shelter_type") {
      allAssets.forEach(a => {
        if (a.shelter_type) values.add(a.shelter_type);
      });
    } else if (selectedField === "has_incident") {
      values.add("Yes");
      values.add("No");
    } else if (selectedField === "has_work_order") {
      values.add("Yes");
      values.add("No");
    }
    
    return Array.from(values).sort();
  }, [selectedField, allAssets, allAssignments]);

  const handleCreateManual = () => {
    if (!newName.trim()) return;
    onCreateManualLayer({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(LAYER_COLORS[0]);
    setCreatingManual(false);
  };

  const handleApplyVisualRule = () => {
    if (!selectedField || selectedValues.length === 0) return;
    const fieldLabel = VISUAL_FIELDS.find(f => f.id === selectedField)?.label || selectedField;
    onSetVisualRule({
      field: selectedField,
      values: selectedValues,
      label: `${fieldLabel}: ${selectedValues.join(", ")}`,
    });
    setSelectedField("");
    setSelectedValues([]);
    setCreatingVisual(false);
  };

  const toggleValue = (value) => {
    setSelectedValues(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="space-y-3">
      {/* Manual Layers Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Manual Layers</span>
            {manualLayers.length > 0 && <span className="text-[10px] text-slate-400">({manualLayers.length})</span>}
          </div>
          <button onClick={() => setCreatingManual(v => !v)} className="text-indigo-600 hover:text-indigo-800">
            {creatingManual ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>

        {creatingManual && (
          <div className="border border-indigo-200 rounded-lg p-2 space-y-2 bg-indigo-50/30">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Layer name..."
              className="h-7 text-xs"
              onKeyDown={e => e.key === "Enter" && handleCreateManual()}
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
              <Button size="sm" className="h-7 text-xs flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateManual} disabled={!newName.trim()}>
                <Check className="h-3 w-3 mr-1" /> Create
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreatingManual(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {manualLayers.length === 0 && !creatingManual && (
          <p className="text-xs text-slate-400 py-1">No manual layers yet.</p>
        )}

        {manualLayers.map(layer => {
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
              {onDeleteManualLayer && (
                <button onClick={() => onDeleteManualLayer(layer.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="h-px bg-slate-200" />

      {/* Visual Rules Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Color Rules</span>
          </div>
          <button onClick={() => setCreatingVisual(v => !v)} className="text-indigo-600 hover:text-indigo-800">
            {creatingVisual ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>

        {creatingVisual && (
          <div className="border border-indigo-200 rounded-lg p-2 space-y-2 bg-indigo-50/30">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Color / Group By</label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {VISUAL_FIELDS.map(field => (
                    <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedField && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Values</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {fieldValues.map(value => (
                    <label key={value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <Checkbox
                        checked={selectedValues.includes(value)}
                        onCheckedChange={() => toggleValue(value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleApplyVisualRule}
                disabled={!selectedField || selectedValues.length === 0}
              >
                <Check className="h-3 w-3 mr-1" /> Apply
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreatingVisual(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {activeVisualRule && (
          <div className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-indigo-50 border border-indigo-200">
            <Palette className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-700 truncate font-medium">{activeVisualRule.label}</p>
            </div>
            <button
              onClick={() => onSetVisualRule(null)}
              className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {!activeVisualRule && !creatingVisual && (
          <p className="text-xs text-slate-400 py-1">No color rules active.</p>
        )}
      </div>
    </div>
  );
}