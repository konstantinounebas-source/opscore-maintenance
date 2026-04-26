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
  const result = [];

  for (const item of savedItems) {
    if (item.is_active === false) continue;

    const suggestion = suggestions.find(s =>
      s.rule_id === item.planning_rule_id ||
      s.output_date_key === item.output_date_key
    );

    if (!suggestion) continue;

    if (!item.planned_date || !suggestion.calculated_date) continue;

    if (item.planned_date !== suggestion.calculated_date) {
      result.push({
        id: item.id,
        name: item.planning_item_name_snapshot || item.planning_item_name,
        ruleName: suggestion.rule_name || item.planning_rule_name_snapshot,
        savedDate: item.planned_date,
        newDate: suggestion.calculated_date,
        baseDate: suggestion.base_date_key
      });
    }
  }

  return result;
}