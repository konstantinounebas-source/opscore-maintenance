import { addDays, isAfter, isBefore, isEqual, parseISO } from "date-fns";

/**
 * Core Stage 1 date constraints
 */
export const CORE_STAGE1_DATES = {
  work_start_date: { label: "Work Start Date", stage: 1 },
  final_deadline: { label: "Final Deadline", stage: 1 },
  priority_deadline: { label: "Priority Deadline", stage: 1 },
};

/**
 * Stage 3 planning driver dates
 */
export const STAGE3_DRIVER_DATES = {
  execution_date: { label: "Execution Date", stage: 3 },
  execution_finish: { label: "Execution Finish", stage: 3 },
};

/**
 * Resolve a base_date_key to an actual date value
 * Checks: stationData (Stage 1 + Stage 3 dates), saved planning items
 */
export function resolveBaseDate(baseKey, stationData, stage3Items) {
  if (!baseKey) return null;

  // Priority 1: Check direct stationData (Stage 1 core dates + Stage 3 execution dates)
  if (stationData && stationData[baseKey]) {
    return stationData[baseKey];
  }

  // Priority 2: Check saved planning items (for chained rules)
  if (stage3Items && stage3Items.length > 0) {
    const item = stage3Items.find(i => i.output_date_key === baseKey && i.is_active !== false);
    if (item && item.planned_date) {
      return item.planned_date;
    }
  }

  return null;
}

/**
 * Calculate date with offset
 */
export function calculateDateWithOffset(baseDate, offsetDirection, offsetDays, useWorkingDays = true) {
  if (!baseDate) return null;

  try {
    const parsed = typeof baseDate === "string" ? parseISO(baseDate) : baseDate;
    let result;

    if (offsetDays === 0) {
      result = parsed;
    } else if (offsetDirection === "Before") {
      // For "Before", subtract days (offset is always positive value)
      if (useWorkingDays) {
        // Simple working days: subtract days, skip weekends
        result = parsed;
        let daysRemaining = offsetDays;
        while (daysRemaining > 0) {
          result = addDays(result, -1);
          const dow = result.getDay();
          if (dow !== 0 && dow !== 6) {
            daysRemaining--;
          }
        }
      } else {
        result = addDays(parsed, -offsetDays);
      }
    } else if (offsetDirection === "After") {
      // For "After", add days
      if (useWorkingDays) {
        result = parsed;
        let daysRemaining = offsetDays;
        while (daysRemaining > 0) {
          result = addDays(result, 1);
          const dow = result.getDay();
          if (dow !== 0 && dow !== 6) {
            daysRemaining--;
          }
        }
      } else {
        result = addDays(parsed, offsetDays);
      }
    } else {
      // "Same Day"
      result = parsed;
    }

    return result.toISOString().split("T")[0];
  } catch (err) {
    console.error("Error calculating date:", err);
    return null;
  }
}

/**
 * Evaluate "applies_when" logic
 */
export function evaluateAppliesWhen(rule, stationData) {
  const { applies_when_field, applies_when_operator, applies_when_value } = rule;

  // Always apply
  if (applies_when_field === "always") {
    return true;
  }

  const fieldValue = stationData[applies_when_field];

  switch (applies_when_operator) {
    case "exists":
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    case "not_exists":
      return fieldValue === undefined || fieldValue === null || fieldValue === "";
    case "equals":
      return String(fieldValue) === String(applies_when_value);
    case "not_equals":
      return String(fieldValue) !== String(applies_when_value);
    case "contains":
      return String(fieldValue).includes(String(applies_when_value));
    default:
      return true;
  }
}

/**
 * Generate rule suggestions for current session
 * Rules with base dates in stationData are calculated first
 * Rules depending on generated dates use saved items only
 */
export function generateRuleSuggestions(rules, stationData, stage3Items) {
  const suggestions = [];
  
  // Sort rules: core dates first, then those depending on saved items
  const sortedRules = [...rules].sort((a, b) => {
    const aIsCore = a.base_date_key && CORE_STAGE1_DATES[a.base_date_key] || STAGE3_DRIVER_DATES[a.base_date_key];
    const bIsCore = b.base_date_key && CORE_STAGE1_DATES[b.base_date_key] || STAGE3_DRIVER_DATES[b.base_date_key];
    if (aIsCore && !bIsCore) return -1;
    if (!aIsCore && bIsCore) return 1;
    return 0;
  });

  return sortedRules
    .filter(r => r.is_active !== false)
    .map(rule => {
      // Check if applies
      if (!evaluateAppliesWhen(rule, stationData)) {
        return null;
      }

      // Resolve base date
      const baseDate = resolveBaseDate(rule.base_date_key, stationData, stage3Items);

      if (!baseDate) {
        // Cannot calculate - missing base date
        const keyDisplay = rule.base_date_key 
          ? rule.base_date_key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
          : 'unknown';
        
        return {
          rule_id: rule.id,
          rule_name: rule.rule_name,
          category_id: rule.category_id,
          category_name: rule.category_name,
          output_date_key: rule.output_date_key,
          output_flow_stage_id: rule.output_flow_stage_id,
          output_flow_stage_name: rule.output_flow_stage_name,
          planning_item_name: rule.planning_item_name,
          planning_item_type: rule.planning_item_type,
          base_date_key: rule.base_date_key,
          calculated_date: null,
          status: "Blocked",
          missing_base_date: keyDisplay || 'base date not set on rule',
          required: rule.required,
        };
      }

      // Calculate suggested date
      const calculatedDate = calculateDateWithOffset(
        baseDate,
        rule.offset_direction,
        rule.offset_days,
        rule.use_working_days
      );

      return {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        category_id: rule.category_id,
        category_name: rule.category_name,
        output_date_key: rule.output_date_key,
        output_flow_stage_id: rule.output_flow_stage_id,
        output_flow_stage_name: rule.output_flow_stage_name,
        planning_item_name: rule.planning_item_name,
        planning_item_type: rule.planning_item_type,
        base_date_key: rule.base_date_key,
        calculated_date: calculatedDate,
        status: "Not Due",
        required: rule.required,
      };
    })
    .filter(Boolean);
}

/**
 * Calculate planning status based on saved items
 */
export function calculatePlanningStatus(items) {
  if (!items || items.length === 0) {
    return "Not Planned";
  }

  const requiredItems = items.filter(i => i.required && i.is_active !== false);

  if (requiredItems.length === 0) {
    return "Draft Planned";
  }

  const today = new Date().toISOString().split("T")[0];
  const withoutDates = requiredItems.filter(i => !i.planned_date);
  const overdue = requiredItems.filter(i => i.planned_date && isBefore(parseISO(i.planned_date), parseISO(today)));

  if (withoutDates.length > 0 || overdue.length > 0) {
    return "At Risk";
  }

  return "Ready";
}

/**
 * Determine item status based on planned_date
 */
export function determineItemStatus(plannedDate) {
  if (!plannedDate) return "Not Due";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = parseISO(plannedDate);
  planned.setHours(0, 0, 0, 0);

  const daysUntil = Math.floor((planned.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return "Overdue";
  if (daysUntil === 0) return "Due Today";
  if (daysUntil <= 3) return "Due Soon";
  return "Planned";
}