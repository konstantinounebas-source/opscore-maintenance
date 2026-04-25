import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Default seed data — used as fallback if DB is empty
const SEED_OPTIONS = [
  // order_priority
  { category: "order_priority", value: "Low", label: "Low", sort_order: 1 },
  { category: "order_priority", value: "Medium", label: "Medium", sort_order: 2 },
  { category: "order_priority", value: "High", label: "High", sort_order: 3 },
  { category: "order_priority", value: "Critical", label: "Critical", sort_order: 4 },
  // installation_type
  { category: "installation_type", value: "New", label: "New", sort_order: 1 },
  { category: "installation_type", value: "Replacement", label: "Replacement", sort_order: 2 },
  { category: "installation_type", value: "Relocation", label: "Relocation", sort_order: 3 },
  { category: "installation_type", value: "Removal", label: "Removal", sort_order: 4 },
  // intervention_scope
  { category: "intervention_scope", value: "Shelter Only", label: "Shelter Only", sort_order: 1 },
  { category: "intervention_scope", value: "Civil Works", label: "Civil Works", sort_order: 2 },
  { category: "intervention_scope", value: "Full Installation", label: "Full Installation", sort_order: 3 },
  { category: "intervention_scope", value: "Marking Only", label: "Marking Only", sort_order: 4 },
  // road_side
  { category: "road_side", value: "Left", label: "Left", sort_order: 1 },
  { category: "road_side", value: "Right", label: "Right", sort_order: 2 },
  { category: "road_side", value: "Center Island", label: "Center Island", sort_order: 3 },
  // traffic_direction
  { category: "traffic_direction", value: "One Way", label: "One Way", sort_order: 1 },
  { category: "traffic_direction", value: "Two Way", label: "Two Way", sort_order: 2 },
  // existing_infrastructure_type
  { category: "existing_infrastructure_type", value: "None", label: "None", sort_order: 1 },
  { category: "existing_infrastructure_type", value: "Old Shelter", label: "Old Shelter", sort_order: 2 },
  { category: "existing_infrastructure_type", value: "Pole", label: "Pole", sort_order: 3 },
  { category: "existing_infrastructure_type", value: "Sign Only", label: "Sign Only", sort_order: 4 },
  { category: "existing_infrastructure_type", value: "Other", label: "Other", sort_order: 5 },
  // pavement_type
  { category: "pavement_type", value: "Asphalt", label: "Asphalt", sort_order: 1 },
  { category: "pavement_type", value: "Concrete", label: "Concrete", sort_order: 2 },
  { category: "pavement_type", value: "Tiles", label: "Tiles", sort_order: 3 },
  { category: "pavement_type", value: "Soil", label: "Soil", sort_order: 4 },
  // utility_type
  { category: "utility_type", value: "Electric", label: "Electric", sort_order: 1 },
  { category: "utility_type", value: "Water", label: "Water", sort_order: 2 },
  { category: "utility_type", value: "Telecom", label: "Telecom", sort_order: 3 },
  { category: "utility_type", value: "Sewer", label: "Sewer", sort_order: 4 },
  { category: "utility_type", value: "Unknown", label: "Unknown", sort_order: 5 },
  // traffic_impact_level
  { category: "traffic_impact_level", value: "Low", label: "Low", sort_order: 1 },
  { category: "traffic_impact_level", value: "Medium", label: "Medium", sort_order: 2 },
  { category: "traffic_impact_level", value: "High", label: "High", sort_order: 3 },
  // permit_type
  { category: "permit_type", value: "Municipality", label: "Municipality", sort_order: 1 },
  { category: "permit_type", value: "Police", label: "Police", sort_order: 2 },
  { category: "permit_type", value: "PWD", label: "PWD", sort_order: 3 },
  { category: "permit_type", value: "Multiple", label: "Multiple", sort_order: 4 },
  // risk_level
  { category: "risk_level", value: "Low", label: "Low", sort_order: 1 },
  { category: "risk_level", value: "Medium", label: "Medium", sort_order: 2 },
  { category: "risk_level", value: "High", label: "High", sort_order: 3 },
  // revision_source
  { category: "revision_source", value: "A.A. Order", label: "A.A. Order", sort_order: 1 },
  { category: "revision_source", value: "A.A. Instruction", label: "A.A. Instruction", sort_order: 2 },
  { category: "revision_source", value: "Site Finding", label: "Site Finding", sort_order: 3 },
  { category: "revision_source", value: "Internal Review", label: "Internal Review", sort_order: 4 },
  { category: "revision_source", value: "QA Finding", label: "QA Finding", sort_order: 5 },
  { category: "revision_source", value: "Delivery", label: "Delivery", sort_order: 6 },
  { category: "revision_source", value: "Acceptance", label: "Acceptance", sort_order: 7 },
  { category: "revision_source", value: "Other", label: "Other", sort_order: 8 },
  // order_type
  { category: "order_type", value: "New Installation", label: "New Installation", sort_order: 1 },
  { category: "order_type", value: "Replacement", label: "Replacement", sort_order: 2 },
  { category: "order_type", value: "Relocation", label: "Relocation", sort_order: 3 },
  { category: "order_type", value: "Removal", label: "Removal", sort_order: 4 },
  // shelter_type
  { category: "shelter_type", value: "Standard", label: "Standard", sort_order: 1 },
  { category: "shelter_type", value: "Premium", label: "Premium", sort_order: 2 },
  { category: "shelter_type", value: "Mini", label: "Mini", sort_order: 3 },
  { category: "shelter_type", value: "Custom", label: "Custom", sort_order: 4 },
  // task_priority
  { category: "task_priority", value: "Low", label: "Low", sort_order: 1 },
  { category: "task_priority", value: "Medium", label: "Medium", sort_order: 2 },
  { category: "task_priority", value: "High", label: "High", sort_order: 3 },
  { category: "task_priority", value: "Critical", label: "Critical", sort_order: 4 },
  // task_status
  { category: "task_status", value: "Open", label: "Open", sort_order: 1 },
  { category: "task_status", value: "In Progress", label: "In Progress", sort_order: 2 },
  { category: "task_status", value: "Completed", label: "Completed", sort_order: 3 },
  { category: "task_status", value: "Cancelled", label: "Cancelled", sort_order: 4 },
  // approval_status
  { category: "approval_status", value: "Pending", label: "Pending", sort_order: 1 },
  { category: "approval_status", value: "Approved", label: "Approved", sort_order: 2 },
  { category: "approval_status", value: "Rejected", label: "Rejected", sort_order: 3 },
  // authority_instruction_status
  { category: "authority_instruction_status", value: "Pending", label: "Pending", sort_order: 1 },
  { category: "authority_instruction_status", value: "Acknowledged", label: "Acknowledged", sort_order: 2 },
  { category: "authority_instruction_status", value: "Implemented", label: "Implemented", sort_order: 3 },
  { category: "authority_instruction_status", value: "Cancelled", label: "Cancelled", sort_order: 4 },
  // milestone_category
  { category: "milestone_category", value: "Order", label: "Order", sort_order: 1 },
  { category: "milestone_category", value: "Planning", label: "Planning", sort_order: 2 },
  { category: "milestone_category", value: "Inspection", label: "Inspection", sort_order: 3 },
  { category: "milestone_category", value: "Approval", label: "Approval", sort_order: 4 },
  { category: "milestone_category", value: "Execution", label: "Execution", sort_order: 5 },
  { category: "milestone_category", value: "Delivery", label: "Delivery", sort_order: 6 },
];

let seedingDone = false;

async function seedIfEmpty(allOptions) {
  if (seedingDone || allOptions.length > 0) { seedingDone = true; return; }
  await base44.entities.StationLogDropdownOptions.bulkCreate(
    SEED_OPTIONS.map(o => ({ ...o, is_active: true }))
  );
  seedingDone = true;
}

export function useStationLogDropdowns() {
  const queryClient = useQueryClient();

  const { data: allOptions = [], isLoading } = useQuery({
    queryKey: ["stationLogDropdownOptions"],
    queryFn: async () => {
      const opts = await base44.entities.StationLogDropdownOptions.list();
      await seedIfEmpty(opts);
      if (opts.length === 0) {
        return SEED_OPTIONS.map((o, i) => ({ ...o, id: `seed-${i}`, is_active: true }));
      }
      return opts;
    },
    staleTime: 60000,
  });

  // Returns sorted active labels for a category
  function getOptions(category) {
    return allOptions
      .filter(o => o.category === category && o.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.label ?? "").localeCompare(b.label ?? ""))
      .map(o => o.label || o.value);
  }

  // Build SELECT_OPTIONS map for all categories
  const selectOptions = {};
  const categories = [...new Set(allOptions.map(o => o.category))];
  categories.forEach(cat => { selectOptions[cat] = getOptions(cat); });

  const refreshDropdowns = () => queryClient.invalidateQueries({ queryKey: ["stationLogDropdownOptions"] });

  return { allOptions, selectOptions, getOptions, isLoading, refreshDropdowns };
}