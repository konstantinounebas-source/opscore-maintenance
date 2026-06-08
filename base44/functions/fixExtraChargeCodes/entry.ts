import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all FMPIContractCatalogue records with item_category = "Extra Charge"
    const allRecords = await base44.asServiceRole.entities.FMPIContractCatalogue.list();
    const extraChargeRecords = allRecords.filter(r => r.item_category === 'Extra Charge');
    
    // Sort by created_date to maintain order
    extraChargeRecords.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    
    let updatedCount = 0;

    for (let i = 0; i < extraChargeRecords.length; i++) {
      const record = extraChargeRecords[i];
      const newChildLineCode = `EC-${String(i + 1).padStart(3, '0')}`;
      
      // Only update if the code is different
      if (record.child_line_code !== newChildLineCode) {
        await base44.asServiceRole.entities.FMPIContractCatalogue.update(record.id, {
          child_line_code: newChildLineCode,
          child_line_number: String(i + 1),
        });
        updatedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Updated child_line_code for ${updatedCount} Extra Charge records.`,
      updatedCount,
      totalExtraCharges: extraChargeRecords.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});