import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role === 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all planning weeks
    const weeks = await base44.asServiceRole.entities.PlanningWeeks.list();
    
    if (weeks.length === 0) {
      return Response.json({ success: true, deleted_weeks: 0, deleted_assignments: 0 });
    }

    // Delete all assignments for these weeks
    const assignments = await base44.asServiceRole.entities.PlanningAssignments.list();
    const weekIds = weeks.map(w => w.id);
    const assignmentsToDelete = assignments.filter(a => weekIds.includes(a.planning_week_id));
    
    for (const assignment of assignmentsToDelete) {
      await base44.asServiceRole.entities.PlanningAssignments.delete(assignment.id);
    }

    // Delete all weeks
    for (const week of weeks) {
      await base44.asServiceRole.entities.PlanningWeeks.delete(week.id);
    }

    return Response.json({
      success: true,
      deleted_weeks: weeks.length,
      deleted_assignments: assignmentsToDelete.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});