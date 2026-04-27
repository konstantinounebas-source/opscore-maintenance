import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { planning_type_id, year, mode = 'weeks' } = payload;

    if (!planning_type_id || !year) {
      return Response.json({ error: 'Missing planning_type_id or year' }, { status: 400 });
    }

    const planningType = await base44.entities.PlanningTypes.get(planning_type_id);
    if (!planningType) {
      return Response.json({ error: 'Planning type not found' }, { status: 404 });
    }

    const periodsToCreate = [];

    if (mode === 'months') {
      // Generate 12 months
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      for (let m = 0; m < 12; m++) {
        const startDate = new Date(year, m, 1);
        const endDate = new Date(year, m + 1, 0); // last day of month
        const monthCode = `M${year}-${String(m + 1).padStart(2, '0')}`;
        const monthName = `${monthNames[m]} ${year}`;
        periodsToCreate.push({
          week_code: monthCode,
          week_name: monthName,
          planning_type_id: planning_type_id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'Draft',
          is_active: false,
        });
      }
    } else {
      // Generate 52 weeks (default)
      const startOfYear = new Date(year, 0, 1);
      let currentDate = new Date(startOfYear);
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

        periodsToCreate.push({
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
    }

    const result = await base44.entities.PlanningWeeks.bulkCreate(periodsToCreate);

    return Response.json({
      success: true,
      total_created: result.length || periodsToCreate.length,
      planning_type_id,
      year,
      mode,
    });
  } catch (error) {
    console.error('Error generating planning periods:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});