import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Fix existing planning rules with empty base_date_key
 * Maps base_date_type to base_date_key for backwards compatibility
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all planning rules with empty base_date_key
    const rules = await base44.entities.StationLogPlanningRules.filter({});
    
    const typeToKeyMapping = {
      "Work Start Date": "work_start_date",
      "Final Deadline": "final_deadline",
      "Priority Deadline": "priority_deadline",
      "Execution Date": "execution_date",
      "Execution Finish": "execution_finish",
      "Another Planning Item": null // These need manual review
    };

    const fixed = [];
    const needsReview = [];

    for (const rule of rules) {
      // If base_date_key is already set, skip
      if (rule.base_date_key && rule.base_date_key.trim()) {
        continue;
      }

      // Try to infer from base_date_type
      const inferredKey = typeToKeyMapping[rule.base_date_type];

      if (inferredKey) {
        // Update the rule
        await base44.entities.StationLogPlanningRules.update(rule.id, {
          base_date_key: inferredKey
        });
        fixed.push({
          id: rule.id,
          rule_name: rule.rule_name,
          base_date_type: rule.base_date_type,
          assigned_base_date_key: inferredKey
        });
      } else if (rule.base_date_type === "Another Planning Item") {
        // These require manual assignment - suggest the rule name
        needsReview.push({
          id: rule.id,
          rule_name: rule.rule_name,
          base_date_type: rule.base_date_type,
          current_base_date_key: rule.base_date_key,
          suggestion: `Review and set base_date_key manually (e.g., output_date_key from another rule)`
        });
      }
    }

    return Response.json({
      success: true,
      fixed_count: fixed.length,
      needs_review_count: needsReview.length,
      fixed,
      needs_review: needsReview
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});