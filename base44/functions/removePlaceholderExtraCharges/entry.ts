import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all FMPIContractCatalogue records
    const allRecords = await base44.asServiceRole.entities.FMPIContractCatalogue.list();
    
    // Find placeholder extra charges to delete
    const placeholderCodes = ['EC-001', 'EC-002', 'EC-003'];
    const toDelete = allRecords.filter(record => 
      placeholderCodes.includes(record.child_line_code)
    );

    // Delete them
    let deletedCount = 0;
    for (const record of toDelete) {
      await base44.asServiceRole.entities.FMPIContractCatalogue.delete(record.id);
      deletedCount++;
    }

    return Response.json({
      success: true,
      message: `Removed ${deletedCount} placeholder extra charge records.`,
      deletedCount,
      deletedRecords: toDelete.map(r => ({
        id: r.id,
        code: r.child_line_code,
        description: r.description,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});