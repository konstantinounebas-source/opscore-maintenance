import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all planning rules
    const allRules = await base44.entities.StationLogPlanningRules.list();
    
    // Mapping of rule_name to correct unique output_date_key
    const keyMapping = {
      "Inspection Planning Due": "inspection_planning_due",
      "RCA Submission Deadline": "rca_submission_deadline",
      "RCA Approval Deadline": "rca_approval_deadline",
      "QA Check Due": "qa_check_due",
      "Acceptance Due": "acceptance_due"
    };

    const fixed = [];
    const errors = [];

    // Update each rule with its correct unique key
    for (const rule of allRules) {
      const correctKey = keyMapping[rule.rule_name];
      
      if (!correctKey) {
        errors.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          error: "Unknown rule - no mapping defined"
        });
        continue;
      }

      if (rule.output_date_key !== correctKey) {
        try {
          // Ensure base_date_key is set (fallback to work_start_date if missing)
          const updateData = {
            output_date_key: correctKey
          };
          if (!rule.base_date_key) {
            updateData.base_date_key = "work_start_date";
          }
          
          await base44.entities.StationLogPlanningRules.update(rule.id, updateData);
          fixed.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            old_key: rule.output_date_key,
            new_key: correctKey,
            note: !rule.base_date_key ? "Also set missing base_date_key to work_start_date" : undefined
          });
        } catch (err) {
          errors.push({
            rule_id: rule.id,
            rule_name: rule.rule_name,
            error: err.message
          });
        }
      }
    }

    // Verify fix
    const verifyRules = await base44.entities.StationLogPlanningRules.list();
    const activeRules = verifyRules.filter(r => r.is_active !== false);
    const keys = activeRules.map(r => r.output_date_key);
    const uniqueKeys = new Set(keys);
    const isFixed = keys.length === uniqueKeys.size;

    return Response.json({
      status: isFixed ? 'FIXED' : 'PARTIAL_FIX',
      fixed_count: fixed.length,
      error_count: errors.length,
      fixed,
      errors,
      verification: {
        total_active: activeRules.length,
        unique_keys: uniqueKeys.size,
        all_unique: isFixed
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});