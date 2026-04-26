/**
 * Stage 3 Rule Evaluation Engine
 * 
 * Handles:
 * - Rule condition evaluation (applies_when logic)
 * - Base date resolution (Stage 1, Stage 3, generated)
 * - Date calculation with offsets (including working days)
 * - Circular dependency detection
 * - Clear error/warning reporting
 */

import { addDays, parseISO } from "date-fns";

/**
 * Available core date keys in station data
 */
export const CORE_DATE_KEYS = {
  work_start_date: { label: "Work Start Date", source: "Stage 1 (order_received_date)" },
  final_deadline: { label: "Final Deadline", source: "Stage 1 (order_deadline_date)" },
  priority_deadline: { label: "Priority Deadline", source: "Stage 1 (order_priority_date)" },
  execution_date: { label: "Execution Date", source: "Stage 3 (stage_3_execution_date)" },
  execution_finish: { label: "Execution Finish", source: "Stage 3 (stage_3_execution_finish)" },
};

/**
 * Detect circular dependencies in rules
 * Returns { hasCycle: boolean, cycle: Array<rule_id> | null, errorMessage: string | null }
 */
export function detectCircularDependencies(rules) {
  const ruleMap = new Map(rules.map(r => [r.id, r]));
  const visiting = new Set();
  const visited = new Set();
  
  function hasCycle(ruleId, path) {
    if (visiting.has(ruleId)) {
      return { found: true, cycle: [...path, ruleId] };
    }
    if (visited.has(ruleId)) {
      return { found: false };
    }
    
    visiting.add(ruleId);
    const rule = ruleMap.get(ruleId);
    
    // Check if this rule depends on another rule's output
    if (rule && rule.base_date_key) {
      const depRule = Array.from(ruleMap.values()).find(
        r => r.output_date_key === rule.base_date_key && r.id !== ruleId
      );
      if (depRule) {
        const result = hasCycle(depRule.id, [...path, ruleId]);
        if (result.found) return result;
      }
    }
    
    visiting.delete(ruleId);
    visited.add(ruleId);
    return { found: false };
  }
  
  for (const rule of rules) {
    if (!visited.has(rule.id)) {
      const result = hasCycle(rule.id, []);
      if (result.found) {
        const cycleStr = result.cycle.map(id => {
          const r = ruleMap.get(id);
          return r ? r.rule_name : id;
        }).join(" → ");
        return {
          hasCycle: true,
          cycle: result.cycle,
          errorMessage: `Circular dependency detected: ${cycleStr}`,
        };
      }
    }
  }
  
  return { hasCycle: false, cycle: null, errorMessage: null };
}

/**
 * Resolve a base_date_key to an actual date value
 * Returns { date: string | null, found: boolean, source: string, warning: string | null }
 */
export function resolveBaseDateWithTracking(baseKey, stationData, stage3Items, generatedDateMap = {}) {
  if (!baseKey) {
    return { date: null, found: false, source: null, warning: "Base date key is empty" };
  }

  // 1. Check core dates in stationData (Stage 1 and Stage 3 execution dates)
  if (stationData && stationData[baseKey]) {
    const dateValue = stationData[baseKey];
    return {
      date: dateValue,
      found: true,
      source: `Station Data (${CORE_DATE_KEYS[baseKey]?.source || baseKey})`,
      warning: null,
    };
  }

  // 2. Check generatedDateMap (dates generated in current pass, for chaining)
  if (generatedDateMap && generatedDateMap[baseKey]) {
    return {
      date: generatedDateMap[baseKey],
      found: true,
      source: `Generated in current pass: ${baseKey}`,
      warning: null,
    };
  }

  // 3. Check saved planning items (already saved rules)
  if (stage3Items && stage3Items.length > 0) {
    const item = stage3Items.find(
      i => i.output_date_key === baseKey && i.is_active !== false && i.planned_date
    );
    if (item) {
      return {
        date: item.planned_date,
        found: true,
        source: `Saved rule: ${item.rule_name || item.planning_item_name}`,
        warning: null,
      };
    }
  }

  // Not found
  const source = CORE_DATE_KEYS[baseKey]?.label || baseKey;
  return {
    date: null,
    found: false,
    source,
    warning: `Missing base date: ${source}. This rule cannot generate a suggestion until this date is provided.`,
  };
}

/**
 * Calculate date with offset, respecting working days
 * Returns { date: string | null, error: string | null }
 */
export function calculateDateWithOffset(baseDate, offsetDirection, offsetDays, useWorkingDays = true) {
  if (!baseDate) {
    return { date: null, error: "No base date provided" };
  }

  try {
    const parsed = typeof baseDate === "string" ? parseISO(baseDate) : baseDate;
    let result;

    if (offsetDays === 0) {
      result = parsed;
    } else if (offsetDirection === "Before") {
      if (useWorkingDays) {
        result = new Date(parsed);
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
      if (useWorkingDays) {
        result = new Date(parsed);
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

    return { date: result.toISOString().split("T")[0], error: null };
  } catch (err) {
    return { date: null, error: `Date calculation error: ${err.message}` };
  }
}

/**
 * Evaluate "applies_when" condition
 */
export function evaluateAppliesWhen(rule, stationData) {
  const { applies_when_field, applies_when_operator, applies_when_value } = rule;

  if (applies_when_field === "always") {
    return true;
  }

  const fieldValue = stationData ? stationData[applies_when_field] : undefined;

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
 * Generate rule suggestions with comprehensive validation
 * 
 * Returns array of suggestion objects:
 * {
 *   rule_id, rule_name, planning_item_name, planning_item_type,
 *   output_date_key, output_flow_stage_id, output_flow_stage_name,
 *   base_date_key, calculated_date,
 *   required, status,
 *   applies: boolean,
 *   validationWarning: string | null,
 *   missing_base_date: string | null
 * }
 */
export function generateRuleSuggestionsV2(activeRules, stationData, stage3Items) {
  const generatedDateMap = {}; // Track calculated dates for chaining
  const processedRules = new Set(); // Rules successfully processed
  const suggestionMap = new Map(); // Map rule.id → suggestion object
  const circularRuleIds = new Set(); // Rules in circular dependencies

  // Detect circular dependencies upfront
  const circularCheck = detectCircularDependencies(activeRules);
  if (circularCheck.hasCycle) {
    console.warn("⚠️", circularCheck.errorMessage);
    circularCheck.cycle.forEach(id => circularRuleIds.add(id));
  }

  // Dependency-aware multi-pass evaluation
  let passCount = 0;
  const maxPasses = activeRules.length + 2;

  while (passCount < maxPasses) {
    passCount++;
    let processedInThisPass = 0;

    for (const rule of activeRules) {
      // Skip already processed or circular rules
      if (processedRules.has(rule.id) || circularRuleIds.has(rule.id)) {
        continue;
      }

      // Check if rule applies
      if (!evaluateAppliesWhen(rule, stationData)) {
        processedRules.add(rule.id);
        continue;
      }

      // Resolve base date: stationData → generatedDateMap → saved items
      const baseResolution = resolveBaseDateWithTracking(
        rule.base_date_key,
        stationData,
        stage3Items,
        generatedDateMap
      );

      if (!baseResolution.found) {
        // Base date missing - skip this rule for now, may resolve in next pass
        continue;
      }

      // Calculate date with offset
      const calcResult = calculateDateWithOffset(
        baseResolution.date,
        rule.offset_direction,
        rule.offset_days,
        rule.use_working_days
      );

      if (calcResult.error) {
        // Calculation failed - mark as error and move on
        suggestionMap.set(rule.id, {
          rule_id: rule.id,
          rule_name: rule.rule_name,
          planning_item_name: rule.planning_item_name,
          planning_item_type: rule.planning_item_type,
          output_date_key: rule.output_date_key,
          output_flow_stage_id: rule.output_flow_stage_id,
          output_flow_stage_name: rule.output_flow_stage_name,
          base_date_key: rule.base_date_key,
          calculated_date: null,
          required: rule.required,
          status: "Error",
          applies: true,
          validationWarning: calcResult.error,
          missing_base_date: null,
        });
        processedRules.add(rule.id);
        continue;
      }

      // Success: store generated date for downstream rules and mark processed
      generatedDateMap[rule.output_date_key] = calcResult.date;
      processedInThisPass++;

      suggestionMap.set(rule.id, {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        planning_item_name: rule.planning_item_name,
        planning_item_type: rule.planning_item_type,
        output_date_key: rule.output_date_key || null,
        output_flow_stage_id: rule.output_flow_stage_id || null,
        output_flow_stage_name: rule.output_flow_stage_name,
        base_date_key: rule.base_date_key,
        calculated_date: calcResult.date,
        required: rule.required,
        status: "Suggested",
        applies: true,
        validationWarning: null,
        missing_base_date: null,
      });
      processedRules.add(rule.id);
    }

    // Exit if no progress made (prevents infinite loops, indicates circular/unresolved deps)
    if (processedInThisPass === 0) {
      break;
    }
  }

  // Handle circular dependency rules
  for (const ruleId of circularRuleIds) {
    const rule = activeRules.find(r => r.id === ruleId);
    if (rule && evaluateAppliesWhen(rule, stationData)) {
      suggestionMap.set(ruleId, {
        rule_id: ruleId,
        rule_name: rule.rule_name,
        planning_item_name: rule.planning_item_name,
        planning_item_type: rule.planning_item_type,
        output_date_key: rule.output_date_key,
        output_flow_stage_id: rule.output_flow_stage_id,
        output_flow_stage_name: rule.output_flow_stage_name,
        base_date_key: rule.base_date_key,
        calculated_date: null,
        required: rule.required,
        status: "Blocked",
        applies: true,
        validationWarning: circularCheck.errorMessage,
        missing_base_date: null,
      });
    }
  }

  // Mark remaining unprocessed rules as Blocked (missing base date)
  for (const rule of activeRules) {
    if (!suggestionMap.has(rule.id)) {
      // Only block if the rule applies
      if (!evaluateAppliesWhen(rule, stationData)) {
        continue;
      }

      // Check if base date is resolvable
      const baseResolution = resolveBaseDateWithTracking(
        rule.base_date_key,
        stationData,
        stage3Items,
        generatedDateMap
      );

      suggestionMap.set(rule.id, {
        rule_id: rule.id,
        rule_name: rule.rule_name,
        planning_item_name: rule.planning_item_name,
        planning_item_type: rule.planning_item_type,
        output_date_key: rule.output_date_key,
        output_flow_stage_id: rule.output_flow_stage_id,
        output_flow_stage_name: rule.output_flow_stage_name,
        base_date_key: rule.base_date_key,
        calculated_date: null,
        required: rule.required,
        status: "Blocked",
        applies: true,
        validationWarning: baseResolution.warning,
        missing_base_date: baseResolution.source,
      });
    }
  }

  // Return sorted suggestions (maintain order)
  return activeRules
    .map(r => suggestionMap.get(r.id))
    .filter(s => s !== undefined);
}