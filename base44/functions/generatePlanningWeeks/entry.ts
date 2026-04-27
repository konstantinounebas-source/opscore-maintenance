import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Derive 2-letter prefix from name (first 2 uppercase letters)
function derivePrefix(name = '') {
  return name.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'XX';
}

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

    // Determine prefix: use saved prefix or derive from name
    const prefix = (planningType.prefix || derivePrefix(planningType.name)).toUpperCase().slice(0, 2).padEnd(2, 'X');
    const yy = String(year).slice(-2); // last 2 digits of year
    const periodLetter = mode === 'months' ? 'M' : 'W';

    const periodsToCreate = [];

    if (mode === 'months') {
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      for (let m = 0; m < 12; m++) {
        const startDate = new Date(year, m, 1);
        const endDate = new Date(year, m + 1, 0);
        const zz = String(m + 1).padStart(2, '0');
        const periodCode = `${prefix}-${periodLetter}${zz}-${yy}`;
        const periodName = `${monthNames[m]} ${year}`;
        periodsToCreate.push({
          week_code: periodCode,
          week_name: periodName,
          planning_type_id,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          status: 'Draft',
          is_active: false,
        });
      }
    } else {
      // Generate 52 weeks
      const startOfYear = new Date(year, 0, 1);
      let currentDate = new Date(startOfYear);
      const dayOfWeek = currentDate.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentDate.setDate(currentDate.getDate() - daysToSubtract);

      for (let weekNum = 1; weekNum <= 52; weekNum++) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const zz = String(weekNum).padStart(2, '0');
        const periodCode = `${prefix}-${periodLetter}${zz}-${yy}`;
        const monthName = weekStart.toLocaleString('en-US', { month: 'short' });
        const periodName = `Week ${weekNum} - ${monthName} ${year}`;

        periodsToCreate.push({
          week_code: periodCode,
          week_name: periodName,
          planning_type_id,
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
      prefix,
    });
  } catch (error) {
    console.error('Error generating planning periods:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});