import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Save, CheckCircle, Loader2 } from "lucide-react";
import Stage3LeftPanel from "./Stage3LeftPanel";
import Stage3RightPanel from "./Stage3RightPanel";
import {
  calculatePlanningStatus,
  determineItemStatus,
} from "./stage3Utils";
import {
  generateRuleSuggestionsV2,
  detectCircularDependencies,
} from "@/lib/stage3RuleEngine";

export default function Stage3PlanningWorkspace({ log, currentData, asset, onClose, onCompleted }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch stage 3 planning items
  const { data: savedItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["stage3PlanningItems", log.id, refreshTrigger],
    queryFn: () =>
      base44.entities.StationLogStage3PlanningItems.filter(
        { station_log_id: log.id, is_active: true }
      ),
  });

  // Fetch all planning rules
  const { data: allRules = [] } = useQuery({
    queryKey: ["stationLogPlanningRules"],
    queryFn: () => base44.entities.StationLogPlanningRules.list(),
  });

  // Local state for execution dates to allow immediate refresh after save
  const [executionDates, setExecutionDates] = useState({
    execution_date: log.stage_3_execution_date || "",
    execution_finish: log.stage_3_execution_finish || "",
  });

  // Build normalized station data for rule evaluation
  // CRITICAL: Use normalized keys that match rule base_date_key
  const stationData = {
    ...currentData,
    // Stage 1 core dates (normalized keys)
    work_start_date: currentData?.order_received_date,
    final_deadline: currentData?.order_deadline_date,
    priority_deadline: currentData?.order_priority_date,
    // Stage 3 execution dates (from local state for immediate updates)
    execution_date: executionDates.execution_date,
    execution_finish: executionDates.execution_finish,
    // Keep original field names for component reference
    stage_3_execution_date: executionDates.execution_date,
    stage_3_execution_finish: executionDates.execution_finish,
  };

  // Generate suggestions when dates or rules change
  // Dependencies on local state values for immediate updates
  useEffect(() => {
    // Check for circular dependencies
    const activeRules = allRules.filter(r => r.is_active !== false);
    const circularCheck = detectCircularDependencies(activeRules);
    if (circularCheck.hasCycle) {
      console.warn("⚠️ Circular dependency in rules:", circularCheck.errorMessage);
    }

    // Generate all suggestions
    const newSuggestions = generateRuleSuggestionsV2(activeRules, stationData, savedItems);
    
    // Filter out suggestions that are already saved
    const filtered = newSuggestions.filter(
      sugg => !savedItems.find(item => item.output_date_key === sugg.output_date_key)
    );
    setSuggestions(filtered);
  }, [executionDates.execution_date, executionDates.execution_finish, allRules, savedItems]);

  // Calculate Stage 2 summary
  let stage2Summary = null;
  if (log.stage_2_resource_breakdown_json) {
    try {
      const breakdown = JSON.parse(log.stage_2_resource_breakdown_json);
      stage2Summary = {
        totalTime: log.stage_2_total_minutes
          ? `${Math.floor(log.stage_2_total_minutes / 60)}h ${log.stage_2_total_minutes % 60}m`
          : "—",
        worksCount: 0,
        resourceBreakdown: breakdown,
      };
    } catch {}
  }

  const planningStatus = calculatePlanningStatus(savedItems);

  const handleCompleteStage3 = async () => {
    // Check if all required items have dates
    const requiredWithoutDates = savedItems.filter(
      i => i.required && i.is_active !== false && !i.planned_date
    );
    if (requiredWithoutDates.length > 0) {
      alert("All required planning items must have planned dates before completing.");
      return;
    }

    setCompleting(true);
    // Calculate min/max dates from saved items
    const dates = savedItems
      .filter(i => i.planned_date && i.is_active !== false)
      .map(i => i.planned_date)
      .sort();

    const minDate = dates[0] || null;
    const maxDate = dates[dates.length - 1] || null;

    // Extract deadlines and milestones for summary
    const deadlines = savedItems.filter(i => i.planning_item_type === "Deadline" && i.is_active !== false);
    const milestones = savedItems.filter(i => i.planning_item_type === "Milestone" && i.is_active !== false);

    try {
      await base44.entities.StationLog.update(log.id, {
        stage_3_completed: true,
        stage_3_completed_at: new Date().toISOString(),
        stage_3_completed_by: (await base44.auth.me()).email,
        stage_3_planning_status: "Completed",
        stage_3_planned_start: minDate,
        stage_3_planned_finish: maxDate,
        stage_3_deadlines_json: JSON.stringify(deadlines),
        stage_3_milestones_json: JSON.stringify(milestones),
      });
      setCompleting(false);
      onCompleted();
    } catch (err) {
      setCompleting(false);
      alert(`Error: ${err.message}`);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await base44.entities.StationLog.update(log.id, {
      stage_3_planning_status: planningStatus,
    });
    setSaving(false);
  };

  const handleRefresh = () => {
    setRefreshTrigger(t => t + 1);
    queryClient.invalidateQueries({ queryKey: ["stage3PlanningItems"] });
  };

  // Listen for date save events to trigger suggestion recalculation
  useEffect(() => {
    const handleDatesSaved = () => {
      // Force refresh of suggestions by refetching log
      queryClient.invalidateQueries({ queryKey: ["stationLogs"] });
      setRefreshTrigger(t => t + 1);
    };
    window.addEventListener('stage3DatesSaved', handleDatesSaved);
    return () => window.removeEventListener('stage3DatesSaved', handleDatesSaved);
  }, [queryClient]);

  const canComplete =
    planningStatus === "Ready" || (planningStatus === "Draft Planned" && savedItems.length > 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">Stage 3 — Master Planning</h2>
            <div className="flex items-center gap-4 mt-2">
              {asset?.asset_code && (
                <span className="text-xs text-slate-500">
                  <strong>Bus Stop:</strong> {asset.asset_code}
                </span>
              )}
              <Badge className={`text-[10px] ${
                planningStatus === "Ready" ? "bg-green-100 text-green-800" :
                planningStatus === "At Risk" ? "bg-red-100 text-red-800" :
                planningStatus === "Completed" ? "bg-blue-100 text-blue-800" :
                "bg-amber-100 text-amber-800"
              }`}>
                {planningStatus}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-8"
              disabled={saving}
              onClick={handleSaveDraft}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Draft
            </Button>
            <Button
              size="sm"
              className="gap-1 h-8"
              disabled={completing || !canComplete}
              onClick={handleCompleteStage3}
            >
              {completing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Complete Stage 3
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {itemsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <Stage3LeftPanel
              stationData={stationData}
              asset={asset}
              log={log}
              stage2Summary={stage2Summary}
            />
            <Stage3RightPanel
              log={log}
              stationData={stationData}
              savedItems={savedItems}
              suggestions={suggestions}
              onSuggestionAdded={handleRefresh}
              onItemRemoved={handleRefresh}
              onItemUpdated={(itemId, updates) => {
                base44.entities.StationLogStage3PlanningItems.update(itemId, updates);
                handleRefresh();
              }}
              onAddManual={handleRefresh}
              onDatesSaved={(execDate, execFinish) => {
                setExecutionDates({
                  execution_date: execDate,
                  execution_finish: execFinish,
                });
              }}
            />
          </div>
        )}

        {/* Planning Status Helper */}
        <div className="px-6 py-2 bg-blue-50 border-t border-blue-200 text-[10px] text-blue-800">
          <strong>ℹ️ Planning Status:</strong> Calculated from saved planning items only. Suggestions are not included until added.
        </div>
      </div>
    </div>
  );
}