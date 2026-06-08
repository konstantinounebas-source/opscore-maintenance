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
    
    // Group by child_line_code to find duplicates
    const grouped = new Map();
    allRecords.forEach(record => {
      const code = record.child_line_code;
      if (!grouped.has(code)) {
        grouped.set(code, []);
      }
      grouped.get(code).push(record);
    });

    // Find duplicates (groups with more than 1 record)
    const duplicates = [];
    const toDelete = [];
    
    grouped.forEach((records, code) => {
      if (records.length > 1) {
        duplicates.push({ code, count: records.length, records });
        
        // Keep the most recently updated record, delete the rest
        const sorted = records.sort((a, b) => 
          new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date)
        );
        const toKeep = sorted[0];
        const toRemove = sorted.slice(1);
        
        toRemove.forEach(record => {
          toDelete.push({
            id: record.id,
            code: record.child_line_code,
            description: record.description?.substring(0, 50),
            updated: record.updated_date,
          });
        });
      }
    });

    // Delete duplicates
    let deletedCount = 0;
    for (const record of toDelete) {
      await base44.asServiceRole.entities.FMPIContractCatalogue.delete(record.id);
      deletedCount++;
    }

    return Response.json({
      success: true,
      message: `Removed ${deletedCount} duplicate records.`,
      deletedCount,
      totalRecords: allRecords.length,
      uniqueCodes: grouped.size,
      duplicatesFound: duplicates.length,
      deletedRecords: toDelete,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});