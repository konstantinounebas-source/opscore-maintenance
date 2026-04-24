import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planning_type_id, year } = await req.json();

    if (!planning_type_id || !year) {
      return Response.json({ error: 'Missing planning_type_id or year' }, { status: 400 });
    }

    const planningType = await base44.entities.PlanningTypes.read(planning_type_id);
    if (!planningType) {
      return Response.json({ error: 'Planning type not found' }, { status: 404 });
    }

    // Generate weeks for the entire year (52 weeks)
    const weeksToCreate = [];
    const startOfYear = new Date(year, 0, 1);
    
    for (let weekNum = 1; weekNum <= 52; weekNum++) {
      const weekStartDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      // Adjust if crosses year boundary
      if (weekEndDate.getFullYear() > year) {
        weekEndDate.setFullYear(year, 11, 31);
      }

      const startStr = weekStartDate.toISOString().split('T')[0];
      const endStr = weekEndDate.toISOString().split('T')[0];

      weeksToCreate.push({
        week_code: `W${year}-${String(weekNum).padStart(2, '0')}`,
        week_name: `Week ${weekNum} (${planningType.name})`,
        planning_type_id: planning_type_id,
        start_date: startStr,
        end_date: endStr,
        status: 'Draft',
        is_active: false,
      });
    }

    // Bulk create all weeks
    const created = await base44.entities.PlanningWeeks.bulkCreate(weeksToCreate);

    return Response.json({
      success: true,
      weeks_created: created.length,
      planning_type: planningType.name,
      year: year,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});