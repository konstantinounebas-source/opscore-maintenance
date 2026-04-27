/**
 * useStage3SyncStatus
 *
 * Runs out-of-sync detection for Stage 3 planning items at the main view level
 * (StationLogAccordion / StationLogDetail) — without requiring the workspace to be opened.
 *
 * Automatically:
 * 1. Builds normalized stationData (same as Stage3PlanningWorkspace)
 * 2. Fetches active planning rules
 * 3. Generates rule suggestions
 * 4. Detects out-of-sync items
 * 5. Persists sync_status to DB
 */

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { generateRuleSuggestionsV2 } from "@/lib/stage3RuleEngine";
import { persistSyncStatus } from "@/components/stationlogs/stage3/stage3ResyncUtils";

export function useStage3SyncStatus({ log, currentData, savedItems, enabled = true, onPersisted }) {
  const persistingRef = useRef(false);

  // Fetch all planning rules (cached globally)
  const { data: allRules = [] } = useQuery({
    queryKey: ["stationLogPlanningRules"],
    queryFn: () => base44.entities.StationLogPlanningRules.list(),
    enabled,
  });

  // Build normalized stationData — mirrors Stage3PlanningWorkspace exactly
  const stationData = {
    ...(currentData || {}),
    work_start_date: currentData?.order_received_date || null,
    final_deadline: currentData?.order_deadline_date || null,
    priority_deadline: currentData?.order_priority_date || null,
    execution_date: log?.stage_3_execution_date || null,
    execution_finish: log?.stage_3_execution_finish || null,
    stage_3_execution_date: log?.stage_3_execution_date || null,
    stage_3_execution_finish: log?.stage_3_execution_finish || null,
  };

  // Run detection + persistence whenever relevant data changes
  useEffect(() => {
    if (!enabled) return;
    if (!savedItems || savedItems.length === 0) return;
    if (!allRules || allRules.length === 0) return;
    if (persistingRef.current) return;

    const ruleItems = savedItems.filter(i => i.is_active !== false && i.source === "Rule");
    if (ruleItems.length === 0) return;

    persistingRef.current = true;

    const activeRules = allRules.filter(r => r.is_active !== false);
    const allSuggestions = generateRuleSuggestionsV2(activeRules, stationData, savedItems);

    persistSyncStatus(
      savedItems,
      allSuggestions,
      (id, updates) => base44.entities.StationLogStage3PlanningItems.update(id, updates)
    )
      .then(() => { if (onPersisted) onPersisted(); })
      .catch(err => console.warn("[useStage3SyncStatus] persistSyncStatus error:", err))
      .finally(() => { persistingRef.current = false; });

  }, [
    enabled,
    allRules,
    savedItems,
    stationData.work_start_date,
    stationData.final_deadline,
    stationData.priority_deadline,
    stationData.execution_date,
    stationData.execution_finish,
  ]);
}