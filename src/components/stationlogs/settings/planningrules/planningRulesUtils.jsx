// ─── Constants ──────────────────────────────────────────────────────────────

export const APPLIES_WHEN_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "exists", label: "Exists" },
  { value: "not_exists", label: "Not Exists" },
  { value: "contains", label: "Contains" }
];

export const PLANNING_ITEM_TYPES = [
  { value: "Deadline", label: "Deadline" },
  { value: "Planned Date", label: "Planned Date" },
  { value: "Milestone", label: "Milestone" },
  { value: "Task", label: "Task" }
];

export const BASE_DATE_TYPES = [
  { value: "Work Start Date", label: "Work Start Date" },
  { value: "Final Deadline", label: "Final Deadline" },
  { value: "Priority Deadline", label: "Priority Deadline" },
  { value: "Execution Date", label: "Execution Date" },
  { value: "Execution Finish", label: "Execution Finish" },
  { value: "Another Planning Item", label: "Another Planning Item" }
];

export const OFFSET_DIRECTIONS = [
  { value: "Before", label: "Before" },
  { value: "After", label: "After" },
  { value: "Same Day", label: "Same Day" }
];

// ─── Seed Data ──────────────────────────────────────────────────────────────

export const SEED_PLANNING_RULE_CATEGORIES = [
  { category_name: "RCA", description: "Root Cause Analysis planning items", sort_order: 0 },
  { category_name: "Inspection", description: "Inspection scheduling and deadlines", sort_order: 1 },
  { category_name: "Execution", description: "Work execution planning", sort_order: 2 },
  { category_name: "QA", description: "Quality assurance checkpoints", sort_order: 3 },
  { category_name: "Acceptance", description: "Delivery and acceptance deadlines", sort_order: 4 },
  { category_name: "Permits", description: "Permit and documentation deadlines", sort_order: 5 },
  { category_name: "Documents", description: "Document submission and filing", sort_order: 6 }
];

export const SEED_PLANNING_RULES = [
  // Inspection category
  {
    category_name: "Inspection",
    rule_name: "Inspection Planning Due",
    description: "Deadline to finalize inspection planning",
    applies_when_field: "always",
    applies_when_operator: "exists",
    applies_when_value: "",
    planning_item_name: "Inspection Planning Due",
    planning_item_type: "Deadline",
    base_date_type: "Work Start Date",
    base_planning_rule_id: null,
    offset_direction: "Before",
    offset_days: 3,
    use_working_days: true,
    required: true,
    notes: "Inspection must be planned 3 working days before work starts"
  },

  // RCA category
  {
    category_name: "RCA",
    rule_name: "RCA Submission Deadline",
    description: "Deadline for RCA submission",
    applies_when_field: "requires_rca",
    applies_when_operator: "equals",
    applies_when_value: "true",
    planning_item_name: "RCA Submission",
    planning_item_type: "Deadline",
    base_date_type: "Execution Date",
    base_planning_rule_id: null,
    offset_direction: "Before",
    offset_days: 8,
    use_working_days: true,
    required: true,
    notes: "RCA must be submitted 8 working days before execution"
  },
  {
    category_name: "RCA",
    rule_name: "RCA Approval Deadline",
    description: "Deadline for RCA approval",
    applies_when_field: "requires_rca",
    applies_when_operator: "equals",
    applies_when_value: "true",
    planning_item_name: "RCA Approval",
    planning_item_type: "Deadline",
    base_date_type: "Execution Date",
    base_planning_rule_id: null,
    offset_direction: "Before",
    offset_days: 5,
    use_working_days: true,
    required: true,
    notes: "RCA approval required 5 working days before execution"
  },

  // QA category
  {
    category_name: "QA",
    rule_name: "QA Check Due",
    description: "Deadline for QA check after execution",
    applies_when_field: "always",
    applies_when_operator: "exists",
    applies_when_value: "",
    planning_item_name: "QA Check Due",
    planning_item_type: "Deadline",
    base_date_type: "Execution Finish",
    base_planning_rule_id: null,
    offset_direction: "After",
    offset_days: 2,
    use_working_days: true,
    required: true,
    notes: "QA check must be completed 2 working days after execution finish"
  },

  // Acceptance category
  {
    category_name: "Acceptance",
    rule_name: "Acceptance Due",
    description: "Deadline for final acceptance",
    applies_when_field: "always",
    applies_when_operator: "exists",
    applies_when_value: "",
    planning_item_name: "Acceptance Due",
    planning_item_type: "Deadline",
    base_date_type: "Execution Finish",
    base_planning_rule_id: null,
    offset_direction: "After",
    offset_days: 3,
    use_working_days: true,
    required: true,
    notes: "Acceptance must be completed 3 working days after execution finish"
  }
];

// ─── Helper Functions ──────────────────────────────────────────────────────────

export function getLabelForOperator(operator) {
  const found = APPLIES_WHEN_OPERATORS.find(o => o.value === operator);
  return found ? found.label : operator;
}

export function getLabelForItemType(type) {
  const found = PLANNING_ITEM_TYPES.find(t => t.value === type);
  return found ? found.label : type;
}

export function getLabelForBaseDate(baseDate) {
  const found = BASE_DATE_TYPES.find(b => b.value === baseDate);
  return found ? found.label : baseDate;
}

export function getLabelForDirection(direction) {
  const found = OFFSET_DIRECTIONS.find(d => d.value === direction);
  return found ? found.label : direction;
}

export function formatAppliesToString(field, operator, value) {
  if (field === "always") return "Always";
  const opLabel = getLabelForOperator(operator);
  if (!value || operator === "exists" || operator === "not_exists") {
    return `${field} ${opLabel}`;
  }
  return `${field} ${opLabel} ${value}`;
}

export function formatDateOffsetString(baseDate, direction, days, ruleId) {
  const baseLabel = getLabelForBaseDate(baseDate);
  if (days === 0) return `${baseLabel}`;
  const dayText = days === 1 ? "day" : "days";
  return `${direction} ${days} ${dayText} from ${baseLabel}`;
}