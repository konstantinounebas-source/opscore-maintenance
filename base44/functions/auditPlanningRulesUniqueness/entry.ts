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
    
    // Filter active rules
    const activeRules = allRules.filter(r => r.is_active !== false);

    // Group by output_date_key
    const keyMap = {};
    activeRules.forEach(rule => {
      const key = rule.output_date_key;
      if (!keyMap[key]) {
        keyMap[key] = [];
      }
      keyMap[key].push({
        id: rule.id,
        rule_name: rule.rule_name,
        category_id: rule.category_id,
        output_flow_stage_id: rule.output_flow_stage_id
      });
    });

    // Find duplicates
    const duplicates = {};
    const unique = {};
    
    Object.entries(keyMap).forEach(([key, rules]) => {
      if (rules.length > 1) {
        duplicates[key] = rules;
      } else {
        unique[key] = rules[0];
      }
    });

    const hasDuplicates = Object.keys(duplicates).length > 0;

    return Response.json({
      status: hasDuplicates ? 'DUPLICATES_FOUND' : 'UNIQUE',
      total_active_rules: activeRules.length,
      unique_keys_count: Object.keys(unique).length,
      duplicate_keys_count: Object.keys(duplicates).length,
      duplicates,
      message: hasDuplicates 
        ? `⚠️ Found ${Object.keys(duplicates).length} duplicate output_date_key values` 
        : '✅ All active rules have unique output_date_key values'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});