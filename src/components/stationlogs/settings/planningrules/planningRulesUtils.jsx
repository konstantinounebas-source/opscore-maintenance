// ─── Workflow Stages ────────────────────────────────────────────────────────

export const WORKFLOW_STAGES = [
  { id: 1, name: "Order + Location" },
  { id: 2, name: "Work Categorization & Time Estimation" },
  { id: 3, name: "Master Planning" },
  { id: 4, name: "Inspection Planning" },
  { id: 5, name: "Inspection Execution" },
  { id: 6, name: "Inspection Approval Gate" },
  { id: 7, name: "Work Instruction" },
  { id: 8, name: "Draft Weekly Schedule" },
  { id: 9, name: "RCA" },
  { id: 10, name: "RCA Approval Gate" },
  { id: 11, name: "Schedule Verification" },
  { id: 12, name: "Work Execution" },
  { id: 13, name: "Filing / Station Log" },
  { id: 14, name: "QA Check" },
  { id: 15, name: "Delivery / Acceptance" },
  { id: 16, name: "Snagging / Rework" },
  { id: 17, name: "Final Acceptance" },
  { id: 18, name: "Invoicing" }
];

// ─── Constants ──────────────────────────────────────────────────────────────

export const APPLIES_WHEN_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "exists", label: "Exists" },
  { value: "not_exists", label: "Not Exists" },
  { value: "contains", label: "Contains" }
];

export const APPLIES_WHEN_FIELDS = [
  { value: "always", label: "Always" },
  { value: "shelter_type", label: "Shelter Type" },
  { value: "municipality", label: "Municipality" },
  { value: "risk_level", label: "Risk Level" },
  { value: "requires_permits", label: "Requires Permits" },
  { value: "requires_rca", label: "Requires RCA" },
  { value: "priority_deadline", label: "Priority Deadline" },
  { value: "final_deadline", label: "Final Deadline" },
  { value: "work_start_date", label: "Work Start Date" },
  { value: "stage2_resource_type", label: "Stage 2 Resource Type" },
  { value: "stage2_work_item", label: "Stage 2 Work Item" }
];

export const PLANNING_ITEM_TYPES = [
  { value: "Deadline", label: "Deadline" },
  { value: "Planned Date", label: "Planned Date" },
  { value: "Milestone", label: "Milestone" },
  { value: "Task", label: "Task" }
];

// Core base dates (Stage 1 and Stage 3)
const CORE_BASE_DATES = [
  { key: "work_start_date", name: "Work Start Date", stage: 1, stage_name: "Order + Location" },
  { key: "final_deadline", name: "Final Deadline", stage: 1, stage_name: "Order + Location" },
  { key: "priority_deadline", name: "Priority Deadline", stage: 1, stage_name: "Order + Location" },
  { key: "execution_date", name: "Execution Date", stage: 3, stage_name: "Master Planning" },
  { key: "execution_finish", name: "Execution Finish", stage: 3, stage_name: "Master Planning" }
];

export const OFFSET_DIRECTIONS = [
  { value: "Before", label: "Before" },
  { value: "After", label: "After" },
  { value: "Same Day", label: "Same Day" }
];

/**
 * Get available base date options including core dates and generated dates from existing rules.
 * @param {Array} allRules - All active planning rules
 * @returns {Array} Options grouped by category
 */
export function getAvailableBaseDateOptions(allRules = []) {
  const options = [];

  // Group 1: Core Station Dates
  options.push({ group: "Core Station Dates", items: CORE_BASE_DATES });

  // Group 2: Generated Rule Dates (from active rules with output_date_key)
  const generatedDates = (allRules || [])
    .filter(r => r.is_active !== false && r.output_date_key && r.output_flow_stage_id)
    .map(r => ({
      key: r.output_date_key,
      name: r.planning_item_name,
      stage: r.output_flow_stage_id,
      stage_name: r.output_flow_stage_name
    }));

  if (generatedDates.length > 0) {
    options.push({ group: "Generated Rule Dates", items: generatedDates });
  }

  return options;
}

/**
 * Infer base_date_key from old base_date_type for backwards compatibility.
 */
export function inferBaseDateKeyFromType(baseDateType) {
  const mapping = {
    "Work Start Date": "work_start_date",
    "Final Deadline": "final_deadline",
    "Priority Deadline": "priority_deadline",
    "Execution Date": "execution_date",
    "Execution Finish": "execution_finish"
  };
  return mapping[baseDateType] || baseDateType;
}

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
    output_date_key: "inspection_planning_due",
    output_flow_stage_id: 4,
    output_flow_stage_name: "Inspection Planning",
    base_date_type: "Work Start Date",
    base_date_key: "work_start_date",
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
    rule_name: "RCA Approval Deadline",
    description: "Deadline for RCA approval",
    applies_when_field: "requires_rca",
    applies_when_operator: "equals",
    applies_when_value: "true",
    planning_item_name: "RCA Approval Deadline",
    planning_item_type: "Deadline",
    output_date_key: "rca_approval_deadline",
    output_flow_stage_id: 10,
    output_flow_stage_name: "RCA Approval Gate",
    base_date_type: "Execution Date",
    base_date_key: "execution_date",
    base_planning_rule_id: null,
    offset_direction: "Before",
    offset_days: 5,
    use_working_days: true,
    required: true,
    notes: "RCA approval required 5 working days before execution"
  },
  {
    category_name: "RCA",
    rule_name: "RCA Submission Deadline",
    description: "Deadline for RCA submission",
    applies_when_field: "requires_rca",
    applies_when_operator: "equals",
    applies_when_value: "true",
    planning_item_name: "RCA Submission Deadline",
    planning_item_type: "Deadline",
    output_date_key: "rca_submission_deadline",
    output_flow_stage_id: 9,
    output_flow_stage_name: "RCA",
    base_date_type: "Another Planning Item",
    base_date_key: "rca_approval_deadline",
    base_planning_rule_id: null,
    offset_direction: "Before",
    offset_days: 3,
    use_working_days: true,
    required: true,
    notes: "RCA must be submitted 3 working days before RCA approval deadline"
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
    output_date_key: "qa_check_due",
    output_flow_stage_id: 14,
    output_flow_stage_name: "QA Check",
    base_date_type: "Execution Finish",
    base_date_key: "execution_finish",
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
    output_date_key: "acceptance_due",
    output_flow_stage_id: 15,
    output_flow_stage_name: "Delivery / Acceptance",
    base_date_type: "Another Planning Item",
    base_date_key: "qa_check_due",
    base_planning_rule_id: null,
    offset_direction: "After",
    offset_days: 3,
    use_working_days: true,
    required: true,
    notes: "Acceptance must be completed 3 working days after QA check due"
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

export function formatDateOffsetString(baseDateKey, direction, days) {
  if (days === 0) return `${baseDateKey}`;
  const dayText = days === 1 ? "day" : "days";
  return `${direction} ${days} ${dayText} from ${baseDateKey}`;
}

export function getWorkflowStageName(stageId) {
  const stage = WORKFLOW_STAGES.find(s => s.id === stageId);
  return stage ? stage.name : `Stage ${stageId}`;
}