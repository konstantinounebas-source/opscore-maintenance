import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all rules from DB
    const allRules = await base44.asServiceRole.entities.StationLogPlanningRules.list();
    
    // Find duplicates
    const keyMap = {};
    const duplicates = [];
    
    for (const rule of allRules) {
      if (!rule.output_date_key) continue;
      if (!keyMap[rule.output_date_key]) {
        keyMap[rule.output_date_key] = [];
      }
      keyMap[rule.output_date_key].push(rule);
    }
    
    // Identify duplicate keys
    for (const [key, rules] of Object.entries(keyMap)) {
      if (rules.length > 1) {
        duplicates.push({ key, rules: rules.map(r => ({ id: r.id, rule_name: r.rule_name })) });
      }
    }
    
    // Define required rules with their correct output_date_key values
    const requiredRules = {
      'Inspection Planning Due': 'inspection_planning_due',
      'QA Check Due': 'qa_check_due',
      'Acceptance Due': 'acceptance_due',
      'RCA Approval Deadline': 'rca_approval_deadline',
      'RCA Submission Deadline': 'rca_submission_deadline'
    };
    
    // Fix required rules
    const updates = [];
    for (const rule of allRules) {
      const expectedKey = requiredRules[rule.rule_name];
      if (expectedKey && rule.output_date_key !== expectedKey) {
        await base44.asServiceRole.entities.StationLogPlanningRules.update(rule.id, {
          output_date_key: expectedKey
        });
        updates.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          old_key: rule.output_date_key,
          new_key: expectedKey
        });
      }
    }
    
    // Re-fetch to verify
    const updatedRules = await base44.asServiceRole.entities.StationLogPlanningRules.list();
    
    // Check for remaining duplicates
    const newKeyMap = {};
    for (const rule of updatedRules) {
      if (!rule.output_date_key) continue;
      if (!newKeyMap[rule.output_date_key]) {
        newKeyMap[rule.output_date_key] = [];
      }
      newKeyMap[rule.output_date_key].push(rule);
    }
    
    const remainingDuplicates = [];
    for (const [key, rules] of Object.entries(newKeyMap)) {
      if (rules.length > 1) {
        remainingDuplicates.push({ key, count: rules.length, rules: rules.map(r => ({ id: r.id, rule_name: r.rule_name })) });
      }
    }
    
    return Response.json({
      success: true,
      foundDuplicates: duplicates.length,
      duplicatesList: duplicates,
      rulesFixed: updates.length,
      fixedRules: updates,
      remainingDuplicates: remainingDuplicates.length,
      remainingDuplicatesList: remainingDuplicates,
      verification: {
        inspection_planning_due: updatedRules.find(r => r.output_date_key === 'inspection_planning_due')?.rule_name,
        qa_check_due: updatedRules.find(r => r.output_date_key === 'qa_check_due')?.rule_name,
        acceptance_due: updatedRules.find(r => r.output_date_key === 'acceptance_due')?.rule_name
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});