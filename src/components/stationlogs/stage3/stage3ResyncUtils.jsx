/**
 * Stage 3 Planning Items Resync Utilities
 * Detects when saved planning items are out of sync with recalculated rule dates
 * and writes sync_status back to the database.
 */

/**
 * Detects which saved items differ from their recalculated suggestion dates.
 * allSuggestions must be the FULL set (not filtered by "already saved").
 */
export function detectOutOfSyncItems(savedItems, allSuggestions) {
  const result = [];

  for (const item of savedItems || []) {
    if (item.is_active === false) continue;
    if (item.source !== "Rule") continue; // only rule-based items can go out of sync

    const suggestion = (allSuggestions || []).find(s =>
      s.output_date_key === item.output_date_key ||
      s.rule_id === item.planning_rule_id
    );

    if (!suggestion || !suggestion.calculated_date) continue;
    if (!item.planned_date) continue;

    if (item.planned_date !== suggestion.calculated_date) {
      result.push({
        itemId: item.id,
        name: item.planning_item_name_snapshot || item.planning_item_name,
        ruleName: suggestion.rule_name,
        savedDate: item.planned_date,
        calculatedDate: suggestion.calculated_date,
        baseDateKey: suggestion.base_date_key,
        baseDateValue: suggestion.base_date_value,
        ruleLogicText: suggestion.rule_logic_text,
        wasManuallyEdited: item.was_manually_edited === true,
      });
    }
  }

  return result;
}

/**
 * Writes sync_status back to the DB for all active rule-based saved items.
 * - Out of sync  → sync_status = "Out of Sync"
 * - Back in sync → sync_status = "In Sync"
 */
export async function persistSyncStatus(savedItems, allSuggestions, entityUpdate) {
  const now = new Date().toISOString();

  for (const item of savedItems || []) {
    if (item.is_active === false) continue;
    if (item.source !== "Rule") continue;

    const suggestion = (allSuggestions || []).find(s =>
      s.output_date_key === item.output_date_key ||
      s.rule_id === item.planning_rule_id
    );

    if (!suggestion || !suggestion.calculated_date || !item.planned_date) continue;

    const isOutOfSync = item.planned_date !== suggestion.calculated_date;
    const currentSyncStatus = item.sync_status;

    if (isOutOfSync && currentSyncStatus !== "Out of Sync") {
      // Mark as out of sync and store latest recalculated values
      await entityUpdate(item.id, {
        sync_status: "Out of Sync",
        last_calculated_date: suggestion.calculated_date,
        last_synced_at: now,
      });
    } else if (!isOutOfSync && currentSyncStatus === "Out of Sync") {
      // Item is back in sync — reset
      await entityUpdate(item.id, {
        sync_status: "In Sync",
        last_calculated_date: suggestion.calculated_date,
        last_synced_at: now,
      });
    }
  }
}