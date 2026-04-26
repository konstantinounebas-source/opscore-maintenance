import React, { useState } from "react";
import { AlertCircle, RefreshCw, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function Stage3OutOfSyncWarning({ outOfSyncItems = [], onResync }) {
  const [updatingIds, setUpdatingIds] = useState(new Set());

  if (!outOfSyncItems || outOfSyncItems.length === 0) {
    return null;
  }

  const handleUpdateSingle = async (item) => {
    setUpdatingIds(prev => new Set([...prev, item.itemId]));
    try {
      await base44.entities.StationLogStage3PlanningItems.update(item.itemId, {
        planned_date: item.calculatedDate,
        last_calculated_date: item.calculatedDate,
        sync_status: "In Sync",
        last_synced_at: new Date().toISOString(),
      });
      onResync?.();
    } catch (err) {
      alert(`Error updating ${item.itemName}: ${err.message}`);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(item.itemId);
        return next;
      });
    }
  };

  const handleKeepSaved = async (item) => {
    setUpdatingIds(prev => new Set([...prev, item.itemId]));
    try {
      await base44.entities.StationLogStage3PlanningItems.update(item.itemId, {
        last_calculated_date: item.calculatedDate,
        sync_status: "Manually Edited",
        was_manually_edited: true,
        last_synced_at: new Date().toISOString(),
      });
      onResync?.();
    } catch (err) {
      alert(`Error updating ${item.itemName}: ${err.message}`);
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(item.itemId);
        return next;
      });
    }
  };

  const handleUpdateAll = async () => {
    setUpdatingIds(new Set(outOfSyncItems.map(i => i.itemId)));
    try {
      await Promise.all(
        outOfSyncItems.map(item =>
          base44.entities.StationLogStage3PlanningItems.update(item.itemId, {
            planned_date: item.calculatedDate,
            last_calculated_date: item.calculatedDate,
            sync_status: "In Sync",
            last_synced_at: new Date().toISOString(),
          })
        )
      );
      onResync?.();
    } catch (err) {
      alert(`Error updating items: ${err.message}`);
    } finally {
      setUpdatingIds(new Set());
    }
  };

  return (
    <div className="space-y-2 p-3 bg-amber-50 border border-amber-300 rounded-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs font-bold text-amber-800 uppercase">
          {outOfSyncItems.length} Item(s) Out of Sync
        </p>
      </div>

      <p className="text-[10px] text-amber-700">
        Base dates or rules have changed. Saved dates no longer match recalculated values.
      </p>

      {/* Individual items */}
      <div className="space-y-2">
        {outOfSyncItems.map(item => (
          <div
            key={item.itemId}
            className={`p-2 rounded border ${
              item.wasManuallyEdited
                ? "bg-red-50 border-red-200"
                : "bg-white border-amber-100"
            } space-y-1`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">
                  {item.itemName}
                </p>
                <p className="text-[10px] text-slate-500">{item.ruleName}</p>
              </div>
              {item.wasManuallyEdited && (
                <Badge className="text-[9px] bg-red-100 text-red-800 flex-shrink-0">
                  Manually Edited
                </Badge>
              )}
            </div>

            {/* Date comparison */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-slate-50 p-1 rounded">
                <p className="font-semibold text-slate-500 uppercase">Your Saved Date</p>
                <p className="text-slate-800 font-mono">{item.savedDate}</p>
              </div>
              <div className="bg-blue-50 p-1 rounded">
                <p className="font-semibold text-blue-600 uppercase">Recalculated Date</p>
                <p className="text-blue-800 font-mono">{item.calculatedDate}</p>
              </div>
            </div>

            {/* Details */}
            <div className="text-[10px] text-slate-500 space-y-0.5 p-1 bg-slate-50 rounded">
              <p><strong>Base:</strong> {item.baseDateKey}</p>
              {item.lastCalculatedDate && (
                <p><strong>Previous:</strong> {item.lastCalculatedDate}</p>
              )}
            </div>

            {/* Warning if manually edited */}
            {item.wasManuallyEdited && (
              <p className="text-[10px] text-red-700 italic">
                ⚠️ This item was manually edited. Auto-update is disabled.
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-1 pt-1">
              {!item.wasManuallyEdited ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-6 text-[9px] gap-0.5"
                    disabled={updatingIds.has(item.itemId)}
                    onClick={() => handleUpdateSingle(item)}
                  >
                    {updatingIds.has(item.itemId) ? (
                      <>
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-2.5 w-2.5" />
                        Update
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-6 text-[9px] gap-0.5"
                    disabled={updatingIds.has(item.itemId)}
                    onClick={() => handleKeepSaved(item)}
                  >
                    {updatingIds.has(item.itemId) ? (
                      <>
                        <X className="h-2.5 w-2.5" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-2.5 w-2.5" />
                        Keep Saved
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-[10px] text-slate-600 py-1 px-2 bg-slate-50 rounded flex-1 text-center">
                  Manual edit locked
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk update button */}
      {outOfSyncItems.length > 1 && !outOfSyncItems.some(i => i.wasManuallyEdited) && (
        <Button
          size="sm"
          className="w-full h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
          disabled={updatingIds.size > 0}
          onClick={handleUpdateAll}
        >
          {updatingIds.size > 0 ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              Updating All...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Update All Out-of-Sync Items
            </>
          )}
        </Button>
      )}
    </div>
  );
}