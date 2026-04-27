import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, AlertCircle, Wrench, MapPin, Camera, Eye, Plus } from "lucide-react";
import MapillaryViewer from "./MapillaryViewer";

export default function AssetPopup({
  asset,
  popupPos,
  assignment,
  incidents,
  workOrders,
  weeks,
  planningTypes = [],
  onClose,
  onSaveAssignment,
  onZoomToAsset,
  onShowPhotos,
  onOpenSidePanel,
}) {
  const [planningTypeId, setPlanningTypeId] = useState(assignment?.planning_type_id || "");
  const [weekId, setWeekId] = useState(assignment?.planning_week_id || "");
  const [saving, setSaving] = useState(false);
  const [showMapillary, setShowMapillary] = useState(false);

  const assetIncidents = (incidents || []).filter(i => i.related_asset_id === asset?.id || i.asset_id === asset?.asset_id);
  const assetWorkOrders = (workOrders || []).filter(w => w.related_asset_id === asset?.id || w.asset_id === asset?.asset_id);
  
  const assignedWeek = assignment ? weeks.find(w => w.id === assignment.planning_week_id) : null;
  const assignedType = assignment ? planningTypes.find(pt => pt.id === assignment.planning_type_id) : null;
  
  const filteredWeeks = planningTypeId 
    ? (weeks || []).filter(w => w.planning_type_id === planningTypeId)
    : (weeks || []);

  const handleAssign = async () => {
    if (!weekId) return;
    setSaving(true);
    try {
      const formData = {
        planning_type_id: planningTypeId,
        planning_week_id: weekId,
        asset_id: asset.id,
      };
      await onSaveAssignment(formData, assignment?.id);
    } catch (err) {
      console.error("Error saving assignment:", err);
    }
    setSaving(false);
  };

  const handleClearAssignment = async () => {
    setSaving(true);
    try {
      if (assignment?.id) {
        const formData = {
          planning_type_id: "",
          planning_week_id: "",
          asset_id: asset.id,
        };
        await onSaveAssignment(formData, assignment.id);
      }
    } catch (err) {
      console.error("Error clearing assignment:", err);
    }
    setSaving(false);
  };

  if (!asset) return null;

  return (
    <div 
      className="fixed bg-white border border-slate-300 rounded-lg shadow-xl p-4 w-80 max-w-sm" 
      style={{ top: popupPos?.y || 'auto', left: popupPos?.x || 'auto', zIndex: 50 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-bold text-sm text-slate-800">{asset.asset_id || asset.id}</div>
          <div className="text-xs text-slate-500 mt-0.5">{asset.shelter_type || asset.category || "—"}</div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onZoomToAsset?.(asset); }} 
            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
            title="Zoom to location"
          >
            <MapPin className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onShowPhotos?.(asset); }} 
            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
            title="View photos"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMapillary(true); }} 
            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
            title="Street view"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Asset Info */}
      <div className="space-y-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Status:</span>
          <span className="font-medium text-slate-700">{asset.status || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Assigned Week:</span>
          {assignment ? (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs gap-1 px-2"
              onClick={() => {
                if (assignment.planning_week_id && window.__planningReviewAddWeek) {
                  window.__planningReviewAddWeek(assignment.planning_week_id);
                }
              }}
              title="Add this week to Planning Review"
            >
              <Plus className="h-3 w-3" />
              {assignedWeek?.week_code || "—"}
            </Button>
          ) : (
            <span className="text-amber-600 font-medium">Unassigned</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Shelter Type:</span>
          <span className="font-medium text-slate-700">{asset.ordered_shelter_type || "—"}</span>
        </div>
        {assetIncidents.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>{assetIncidents.length} incident{assetIncidents.length !== 1 ? "s" : ""}</span>
          </div>
        )}
        {assetWorkOrders.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-orange-600">
            <Wrench className="h-3 w-3" />
            <span>{assetWorkOrders.length} work order{assetWorkOrders.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Assignment Form */}
      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-semibold text-slate-600">Planning Type</label>
          <Select value={planningTypeId} onValueChange={setPlanningTypeId}>
            <SelectTrigger className="mt-1 text-xs h-7">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {planningTypes.map(pt => (
                <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600">Planning Week</label>
          <Select value={weekId} onValueChange={setWeekId} disabled={!planningTypeId}>
            <SelectTrigger className="mt-1 text-xs h-7">
              <SelectValue placeholder={planningTypeId ? "Select week..." : "Select type first"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Unassigned</SelectItem>
              {filteredWeeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.week_code} - {w.week_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-7 text-xs"
              onClick={handleAssign}
              disabled={saving || !weekId || !planningTypeId || filteredWeeks.length === 0}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {saving ? "Saving..." : assignment ? "Update" : "Assign"}
            </Button>
            {assignment && (
              <Button
                className="bg-red-500 hover:bg-red-600 h-7 text-xs"
                onClick={handleClearAssignment}
                disabled={saving}
              >
                Unassign
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onOpenSidePanel?.(); }}
          >
            Open Side Panel
          </Button>
        </div>
      </div>

      {/* Mapillary Viewer */}
      <MapillaryViewer 
        asset={asset} 
        isOpen={showMapillary} 
        onClose={() => setShowMapillary(false)} 
      />
    </div>
  );
}