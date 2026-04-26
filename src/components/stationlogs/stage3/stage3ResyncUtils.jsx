/**
 * Stage 3 Planning Items Resync Utilities
 * Detects when saved planning items are out of sync with recalculated rule dates
 */

export function detectOutOfSyncItems(savedItems, suggestions) {
  const result = [];

  for (const item of savedItems || []) {
    if (item.is_active === false) continue;

    const suggestion = (suggestions || []).find(s =>
      s.status === "Suggested" &&
      (
        s.rule_id === item.planning_rule_id ||
        s.output_date_key === item.output_date_key
      )
    );

    if (!suggestion) continue;
    if (!item.planned_date || !suggestion.calculated_date) continue;

    if (item.planned_date !== suggestion.calculated_date) {
      result.push({
        itemId: item.id,
        itemName: item.planning_item_name_snapshot || item.planning_item_name,
        ruleName: suggestion.rule_name,
        savedDate: item.planned_date,
        calculatedDate: suggestion.calculated_date,
        baseDateKey: suggestion.base_date_key,
        lastCalculatedDate: item.last_calculated_date,
        wasManuallyEdited: item.was_manually_edited === true,
      });
    }
  }

  return result;
}