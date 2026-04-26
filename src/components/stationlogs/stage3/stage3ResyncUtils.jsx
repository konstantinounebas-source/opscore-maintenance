/**
 * Stage 3 Planning Items Resync Utilities
 * Detects when saved planning items are out of sync with recalculated rule dates
 */

/**
 * Compare saved items with regenerated suggestions to detect out-of-sync items
 * @param {Array} savedItems - Current saved planning items
 * @param {Array} suggestions - Newly regenerated suggestions
 * @returns {Array} Array of out-of-sync items with metadata
 */
export function detectOutOfSyncItems(savedItems, suggestions) {
  const outOfSync = [];
  
  for (const savedItem of savedItems) {
    if (savedItem.source !== "Rule" || !savedItem.is_active || savedItem.was_manually_edited) {
      continue; // Skip manual items and manually edited items
    }

    // Find matching suggestion by planning_rule_id first, then by output_date_key
    let matchingSuggestion = suggestions.find(s => s.rule_id === savedItem.planning_rule_id);
    if (!matchingSuggestion) {
      matchingSuggestion = suggestions.find(s => s.output_date_key === savedItem.output_date_key);
    }

    if (!matchingSuggestion) {
      // Rule may have been deleted or no longer applies
      continue;
    }

    // Compare dates: if saved != calculated, it's out of sync
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

/**
 * Update saved item with new calculated date and sync status
 */
export async function updateItemWithNewDate(itemId, newDate, baseEntity) {
  return baseEntity.update(itemId, {
    planned_date: newDate,
    sync_status: "In Sync",
    last_synced_at: new Date().toISOString(),
  });
}

/**
 * Bulk update multiple out-of-sync items to recalculated dates
 */
export async function bulkUpdateOutOfSyncItems(itemIds, newDates, baseEntity) {
  return Promise.all(
    itemIds.map((id, idx) =>
      baseEntity.update(id, {
        planned_date: newDates[idx],
        sync_status: "In Sync",
        last_synced_at: new Date().toISOString(),
      })
    )
  );
}

/**
 * Mark item as manually edited (prevent auto-update)
 */
export async function markAsManuallyEdited(itemId, baseEntity) {
  return baseEntity.update(itemId, {
    was_manually_edited: true,
    sync_status: "Manually Edited",
  });
}

/**
 * Build warning message for out-of-sync item
 */
export function buildOutOfSyncWarning(outOfSyncItem) {
  return {
    title: `Out of Sync: ${outOfSyncItem.itemName}`,
    message: `The calculated date for "${outOfSyncItem.itemName}" has changed. Your saved date may no longer reflect the current rule calculation.`,
    details: {
      "Rule": outOfSyncItem.ruleName,
      "Base Date": outOfSyncItem.baseDateKey,
      "Your Saved Date": outOfSyncItem.savedDate,
      "Recalculated Date": outOfSyncItem.calculatedDate,
      "Previous Calculation": outOfSyncItem.lastCalculatedDate || "N/A",
    },
    isManuallyEdited: outOfSyncItem.wasManuallyEdited,
  };
}