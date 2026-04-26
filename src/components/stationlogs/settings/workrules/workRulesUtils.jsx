// Utility functions and constants for Work Rules

export const STAGE1_FIELDS = [
  { key: "shelter_type",                label: "Shelter Type",               field_type: "enum" },
  { key: "installation_type",           label: "Installation Type",           field_type: "enum" },
  { key: "intervention_scope",          label: "Intervention Scope",          field_type: "enum" },
  { key: "pavement_type",               label: "Pavement Type",               field_type: "enum" },
  { key: "existing_infrastructure_type",label: "Existing Infrastructure Type",field_type: "enum" },
  { key: "traffic_impact_level",        label: "Traffic Impact Level",        field_type: "enum" },
  { key: "risk_level",                  label: "Risk Level",                  field_type: "enum" },
  { key: "utility_type",               label: "Utility Type",                field_type: "enum" },
  { key: "permit_type",                label: "Permit Type",                 field_type: "enum" },
  { key: "requires_footway",           label: "Requires Footway",            field_type: "boolean" },
  { key: "has_bus_bay",                label: "Has Bus Bay",                 field_type: "boolean" },
  { key: "has_road_marking",           label: "Has Road Marking",            field_type: "boolean" },
  { key: "has_tactile_paving",         label: "Has Tactile Paving",         field_type: "boolean" },
  { key: "has_underground_utilities",  label: "Has Underground Utilities",   field_type: "boolean" },
  { key: "requires_traffic_management",label: "Requires Traffic Management", field_type: "boolean" },
  { key: "requires_permits",           label: "Requires Permits",            field_type: "boolean" },
];

export const SEED_CATEGORIES = [
  { category_name: "Shelter Type",              linked_stage1_field: "shelter_type",                 field_type: "enum",    sort_order: 1 },
  { category_name: "Pavement Type",             linked_stage1_field: "pavement_type",                field_type: "enum",    sort_order: 2 },
  { category_name: "Existing Infrastructure",   linked_stage1_field: "existing_infrastructure_type", field_type: "enum",    sort_order: 3 },
  { category_name: "Construction / Footway Need",linked_stage1_field: "requires_footway",            field_type: "boolean", sort_order: 4 },
  { category_name: "Traffic Impact",             linked_stage1_field: "traffic_impact_level",        field_type: "enum",    sort_order: 5 },
  { category_name: "Permit Requirement",         linked_stage1_field: "requires_permits",            field_type: "boolean", sort_order: 6 },
];

export function timeToMinutes(hours, minutes) {
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

export function minutesToDisplay(mins) {
  const h = Math.floor((mins || 0) / 60);
  const m = (mins || 0) % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function minutesToParts(mins) {
  return { hours: Math.floor((mins || 0) / 60), minutes: (mins || 0) % 60 };
}