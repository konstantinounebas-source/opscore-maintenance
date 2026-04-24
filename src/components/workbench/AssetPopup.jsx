import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, AlertCircle, Wrench } from "lucide-react";

export default function AssetPopup({
  asset,
  assignment,
  incidents,
  workOrders,
  weeks,
  planningTypes = [],
  onClose,
  onSaveAssignment,
}) {
  const [planningTypeId, setPlanningTypeId] = useState(assignment?.planning_type_id || "");
  const [weekId, setWeekId] = useState(assignment?.planning_week_id || "");
  const [saving, setSaving] = useState(false);

  const assetIncidents = (incidents || []).filter(i => i.related_asset_id === asset?.id || i.asset_id === asset?.asset_id);
  const assetWorkOrders = (workOrders || []).filter(w => w.related_asset_id === asset?.id || w.asset_id === asset?.asset_id);
  
  // Debug logging
  useEffect(() => {
    console.log("AssetPopup - asset.id:", asset?.id);
    if (incidents?.length > 0) {
      console.log("AssetPopup - First incident related_asset_id:", incidents[0]?.related_asset_id);
    }
    if (workOrders?.length > 0) {
      console.log("AssetPopup - First workOrder related_asset_id:", workOrders[0]?.related_asset_id);
    }
  }, [asset?.id, incidents, workOrders]);
  
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

  if (!asset) return null;

  return (
    <div className="fixed bg-white border border-slate-300 rounded-lg shadow-xl p-4 z-50 w-80 max-w-sm" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-bold text-sm text-slate-800">{asset.asset_id}</div>
          <div className="text-xs text-slate-500 mt-0.5">{asset.shelter_type}</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Asset Info */}
      <div className="space-y-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Status:</span>
          <span className="font-medium text-slate-700">{asset.status || "—"}</span>
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
              {filteredWeeks.map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.week_code} - {w.week_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-7 text-xs"
          onClick={handleAssign}
          disabled={saving || !weekId || !planningTypeId || filteredWeeks.length === 0}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {saving ? "Saving..." : assignment ? "Update" : "Assign"}
        </Button>
      </div>
    </div>
  );
}