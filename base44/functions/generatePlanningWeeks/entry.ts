import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { planning_type_id, year } = payload;

    if (!planning_type_id || !year) {
      return Response.json({ error: 'Missing planning_type_id or year' }, { status: 400 });
    }

    // Verify planning type exists
    const planningType = await base44.entities.PlanningTypes.get(planning_type_id);
    if (!planningType) {
      return Response.json({ error: 'Planning type not found' }, { status: 404 });
    }

    // Generate 52 weeks
    const weeksToCreate = [];
    const startOfYear = new Date(year, 0, 1);
    let currentDate = new Date(startOfYear);
    
    // Find the Monday of the week containing Jan 1
    const dayOfWeek = currentDate.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentDate.setDate(currentDate.getDate() - daysToSubtract);

    for (let weekNum = 1; weekNum <= 52; weekNum++) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekCode = `W${year}-${String(weekNum).padStart(2, '0')}`;
      const monthName = weekStart.toLocaleString('en-US', { month: 'short' });
      const weekName = `Week ${weekNum} - ${monthName}`;

      weeksToCreate.push({
        week_code: weekCode,
        week_name: weekName,
        planning_type_id: planning_type_id,
        start_date: weekStart.toISOString().split('T')[0],
        end_date: weekEnd.toISOString().split('T')[0],
        status: 'Draft',
        is_active: false,
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Bulk create weeks
    const result = await base44.entities.PlanningWeeks.bulkCreate(weeksToCreate);

    return Response.json({
      success: true,
      total_created: result.length || weeksToCreate.length,
      planning_type_id: planning_type_id,
      year: year,
    });
  } catch (error) {
    console.error('Error generating planning weeks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});