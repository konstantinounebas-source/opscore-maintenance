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
    
    // Check the 3 critical rules
    const rules = {
      inspection: allRules.find(r => r.rule_name === 'Inspection Planning Due'),
      qa: allRules.find(r => r.rule_name === 'QA Check Due'),
      acceptance: allRules.find(r => r.rule_name === 'Acceptance Due'),
    };

    const report = {
      totalRules: allRules.length,
      inspection: rules.inspection ? {
        id: rules.inspection.id,
        rule_name: rules.inspection.rule_name,
        base_date_key: rules.inspection.base_date_key,
        output_date_key: rules.inspection.output_date_key,
        output_flow_stage_id: rules.inspection.output_flow_stage_id,
        is_active: rules.inspection.is_active,
        expected_base: 'work_start_date',
        expected_output: 'inspection_planning_due',
        base_match: rules.inspection.base_date_key === 'work_start_date',
        output_match: rules.inspection.output_date_key === 'inspection_planning_due'
      } : { error: 'Not found' },
      qa: rules.qa ? {
        id: rules.qa.id,
        rule_name: rules.qa.rule_name,
        base_date_key: rules.qa.base_date_key,
        output_date_key: rules.qa.output_date_key,
        output_flow_stage_id: rules.qa.output_flow_stage_id,
        is_active: rules.qa.is_active,
        expected_base: 'execution_finish',
        expected_output: 'qa_check_due',
        base_match: rules.qa.base_date_key === 'execution_finish',
        output_match: rules.qa.output_date_key === 'qa_check_due'
      } : { error: 'Not found' },
      acceptance: rules.acceptance ? {
        id: rules.acceptance.id,
        rule_name: rules.acceptance.rule_name,
        base_date_key: rules.acceptance.base_date_key,
        output_date_key: rules.acceptance.output_date_key,
        output_flow_stage_id: rules.acceptance.output_flow_stage_id,
        is_active: rules.acceptance.is_active,
        expected_base: 'qa_check_due',
        expected_output: 'acceptance_due',
        base_match: rules.acceptance.base_date_key === 'qa_check_due',
        output_match: rules.acceptance.output_date_key === 'acceptance_due'
      } : { error: 'Not found' }
    };

    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});