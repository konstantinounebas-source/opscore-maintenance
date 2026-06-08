import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Keywords that identify Extra Charge rows
    const EXTRA_CHARGE_KEYWORDS = [
      'εργατικά κόστη',
      'labour',
      'χρήση απαιτούμενου οχήματος',
      'vehicle usage',
      'crane',
      'cherry picker',
      'special vehicle',
      'emergency',
      'make safe',
      'traffic management',
      'safety measures',
      'other relevant expenses',
      'άλλα συναφή έξοδα',
      'ΠΡΟΣΘΕΤΕΣ ΕΡΓΑΣΙΕΣ',
      'MAKE SAFE',
    ];

    // Fetch all FMPIContractCatalogue records
    const allRecords = await base44.asServiceRole.entities.FMPIContractCatalogue.list();
    
    let updatedCount = 0;
    let skippedCount = 0;

    for (const record of allRecords) {
      // Skip if already marked as Extra Charge
      if (record.item_category === 'Extra Charge') {
        skippedCount++;
        continue;
      }

      const descLower = (record.description || '').toLowerCase();
      const isExtraCharge = EXTRA_CHARGE_KEYWORDS.some(keyword => 
        descLower.includes(keyword.toLowerCase())
      );

      if (isExtraCharge) {
        // Determine parent category based on keywords
        let parentDesc = 'Extra Charges / Πρόσθετες Εργασίες';
        let parentCode = 'EC';
        
        if (descLower.includes('εργατικά') || descLower.includes('labour') || descLower.includes('worker')) {
          parentDesc = 'Labour / Εργατικά Κόστη';
        } else if (descLower.includes('vehicle') || descLower.includes('χρήση οχήματος') || descLower.includes('transport')) {
          parentDesc = 'Vehicle / Equipment / Μεταφορικά Μέσα';
        } else if (descLower.includes('crane') || descLower.includes('cherry picker') || descLower.includes('special')) {
          parentDesc = 'Special Equipment / Ειδικός Εξοπλισμός';
        } else if (descLower.includes('emergency') || descLower.includes('make safe') || descLower.includes('κατεπείγον')) {
          parentDesc = 'Emergency / Make Safe / Κατεπείγουσες Εργασίες';
        } else if (descLower.includes('traffic') || descLower.includes('safety') || descLower.includes('κυκλοφορία')) {
          parentDesc = 'Traffic Management / Safety Measures';
        }

        // Generate new EC code
        const newChildLineCode = `EC-${String(updatedCount + 1).padStart(3, '0')}`;

        // Update the record
        await base44.asServiceRole.entities.FMPIContractCatalogue.update(record.id, {
          item_category: 'Extra Charge',
          parent_fmpi_code: parentCode,
          parent_description: parentDesc,
          child_line_code: newChildLineCode,
          requires_justification: true,
          requires_approval: true,
          allows_manual_quantity: true,
          allows_manual_price_override: true,
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Updated ${updatedCount} records to Extra Charge category. Skipped ${skippedCount} records.`,
      updatedCount,
      skippedCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});