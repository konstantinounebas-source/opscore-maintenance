/**
 * Stage 3 Planning Items Resync Utilities
 * Detects when saved planning items are out of sync with recalculated rule dates
 */

/**
 * Compare saved items with regenerated suggestions to detect out-of-sync items
 * @param {Array} savedItems - Current saved planning items (from database)
 * @param {Array} suggestions - Newly regenerated suggestions (from rule engine)
 * @returns {Array} Array of out-of-sync items with metadata
 */
export function detectOutOfSyncItems(savedItems, suggestions) {
  const outOfSync = [];

  for (const savedItem of savedItems) {
    // Skip inactive items
    if (savedItem.is_active === false) continue;

    // Only check rule-based items (not manual or template)
    if (savedItem.source !== "Rule") continue;

    // Skip items that have been manually edited by user
    if (savedItem.was_manually_edited) continue;

    // Find matching suggestion by planning_rule_id first
    let matchingSuggestion = suggestions.find(
      s => s.rule_id === savedItem.planning_rule_id
    );

    // Fallback: match by output_date_key
    if (!matchingSuggestion) {
      matchingSuggestion = suggestions.find(
        s => s.output_date_key === savedItem.output_date_key
      );
    }

    // No matching suggestion found - rule may have changed
    if (!matchingSuggestion) continue;

    // Compare dates: if saved != recalculated, it's out of sync
    if (savedItem.planned_date !== matchingSuggestion.calculated_date) {
      outOfSync.push({
        itemId: savedItem.id,
        itemName: savedItem.planning_item_name_snapshot,
        ruleName: savedItem.planning_rule_name_snapshot,
        ruleId: savedItem.planning_rule_id,
        outputDateKey: savedItem.output_date_key,
        baseDateKey: savedItem.base_date_key,
        outputFlowStageId: savedItem.output_flow_stage_id,
        savedDate: savedItem.planned_date,
        calculatedDate: matchingSuggestion.calculated_date,
        lastCalculatedDate: savedItem.last_calculated_date,
        originalCalculatedDate: savedItem.original_calculated_date,
        wasManuallyEdited: savedItem.was_manually_edited,
      });
    }
  }

  return outOfSync;
}