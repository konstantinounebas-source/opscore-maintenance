import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { file_url, contract_version, effective_date, expiry_date, replace_existing } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Fetch Excel file
    const fileRes = await fetch(file_url);
    const arrayBuffer = await fileRes.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const contractVer = contract_version || 'v1.0-2024';
    const effectiveDate = effective_date || '2024-01-01';
    const expiryDate = expiry_date || '2027-12-31';
    const importDate = new Date().toISOString();
    const sourceFileName = 'Services.xlsx';

    // Parent FMPI categories from the Excel
    const PARENT_CATEGORIES = {
      '58': 'Civil Works for Extended Footway Repair or Construction',
      '59': 'Refurbishment of existing shelters in factory',
      '60': 'Refurbishment of existing shelters on site',
      '61': 'Civil Works for Existing Bus Shelters',
      '62': 'Decommissioning of existing shelters',
    };

    // Extra Charge parent category
    const EXTRA_CHARGE_PARENT = {
      code: 'EC',
      description: 'Extra Charges / Πρόσθετες Εργασίες',
    };

    // Phrases that indicate "please specify" / open items requiring justification
    const SPECIFY_PHRASES = ['please specify', 'παρακαλώ προσδιορίστε'];

    // Keywords that identify Extra Charge rows (labour, vehicle, emergency, etc.)
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
    ];

    const catalogueItems = [];
    const extraChargeItems = [];

    let currentParentCode = null;
    let currentParentDesc = null;
    let childCounter = 0;
    let inExtraCharges = false;
    let extraChargeCounter = 0;

    for (const row of rows) {
      if (!row || row.every(cell => cell === null || cell === '')) continue;

      const col0 = row[0] !== null ? String(row[0]).trim() : '';
      const col1 = row[1] !== null ? String(row[1]).trim() : '';
      const col2 = row[2] !== null ? row[2] : null;
      const col3 = row[3] !== null ? row[3] : null;

      // Detect "ΠΡΟΣΘΕΤΕΣ ΕΡΓΑΣΙΕΣ / MAKE SAFE WO" section header
      if (col0.includes('ΠΡΟΣΘΕΤΕΣ') || col0.includes('MAKE SAFE WO') || col0.includes('ΠΡΟΣΘΕΤΕΣ ΕΡΓΑΣΙΕΣ')) {
        inExtraCharges = true;
        // Handle first extra charge item on the same row
        if (col1) {
          extraChargeItems.push({
            description: col1,
            default_quantity: col2 ? Number(col2) : 1,
          });
        }
        continue;
      }

      // Detect "Other relevant expenses" section header (also extra charges)
      if (col0.toLowerCase().includes('other relevant') || col0.toLowerCase().includes('άλλα συναφή')) {
        inExtraCharges = true;
        if (col1) {
          extraChargeItems.push({
            description: col1,
            default_quantity: col2 ? Number(col2) : 1,
          });
        }
        continue;
      }

      // Detect parent category rows (col0 is numeric 58–62)
      if (col0 && PARENT_CATEGORIES[col0]) {
        currentParentCode = col0;
        currentParentDesc = PARENT_CATEGORIES[col0];
        childCounter = 0;
        inExtraCharges = false;
        continue;
      }

      // Skip sub-heading rows inside categories (no col2/col3 price data, no numeric start in col1)
      if (!inExtraCharges && !col0 && col1) {
        const startsWithNumber = /^\d+\./.test(col1);
        if (!startsWithNumber && (col2 === null && col3 === null)) continue; // sub-heading row

        if (currentParentCode && startsWithNumber) {
          childCounter++;
          const lineMatch = col1.match(/^(\d+)\./);
          const lineNum = lineMatch ? lineMatch[1] : String(childCounter);
          const childCode = `${currentParentCode}-${lineNum}`;
          const unitPrice = col3 !== null ? Number(col3) : 0;
          const defQty = col2 !== null ? Number(col2) : 1;

          const descLower = col1.toLowerCase();
          const isSpecify = SPECIFY_PHRASES.some(p => descLower.includes(p));
          
          // Check if this row should be classified as Extra Charge
          const isExtraCharge = inExtraCharges || EXTRA_CHARGE_KEYWORDS.some(keyword => descLower.includes(keyword.toLowerCase()));

          const unitOfMeasure = (() => {
            if (/\/m2/.test(col1)) return 'm²';
            if (/linear metre/.test(col1)) return 'linear metre';
            if (/\/m\b/.test(col1)) return 'm';
            if (/hour/.test(descLower) || /εργατοώρ/.test(descLower)) return 'hour';
            if (/vehicle|crane|cherry|emergency|traffic/.test(descLower)) return 'day';
            return 'item';
          })();

          catalogueItems.push({
            parent_fmpi_code: currentParentCode,
            parent_description: currentParentDesc,
            child_line_number: lineNum,
            child_line_code: childCode,
            description: col1,
            unit_of_measure: unitOfMeasure,
            default_quantity: defQty,
            contract_unit_price: unitPrice,
            item_category: isExtraCharge ? 'Extra Charge' : (isSpecify ? 'Specify Required' : 'Contractual'),
            allows_manual_quantity: true,
            allows_manual_price_override: isExtraCharge || isSpecify,
            requires_justification: isExtraCharge || isSpecify,
            requires_approval: isExtraCharge || isSpecify,
            is_active: true,
            contract_version: contractVer,
            effective_date: effectiveDate,
            expiry_date: expiryDate,
            source_file_name: sourceFileName,
            source_import_date: importDate,
          });
        }
        continue;
      }

      // Extra charge rows (inExtraCharges = true, col0 is empty)
      if (inExtraCharges && !col0 && col1) {
        extraChargeItems.push({
          description: col1,
          default_quantity: col2 ? Number(col2) : 1,
        });
      }
    }

    // Convert extra charge items into FMPIContractCatalogue records with item_category = "Extra Charge"
    const extraChargeCatalogueItems = extraChargeItems.map((ec, idx) => {
      extraChargeCounter++;
      const ecCode = `EC-${String(extraChargeCounter).padStart(3, '0')}`;
      const descLower = ec.description.toLowerCase();
      
      // Determine category based on description keywords
      let parentDesc = EXTRA_CHARGE_PARENT.description;
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

      // Determine unit of measure
      const unitOfMeasure = (() => {
        if (descLower.includes('hour') || descLower.includes('ώρα')) return 'hour';
        if (descLower.includes('day') || descLower.includes('ημέρα')) return 'day';
        if (descLower.includes('vehicle') || descLower.includes('crane')) return 'day';
        return 'item';
      })();

      return {
        parent_fmpi_code: EXTRA_CHARGE_PARENT.code,
        parent_description: parentDesc,
        child_line_number: String(extraChargeCounter),
        child_line_code: ecCode,
        description: ec.description,
        unit_of_measure: unitOfMeasure,
        default_quantity: ec.default_quantity,
        contract_unit_price: 0, // Extra charges typically have manual pricing
        item_category: 'Extra Charge',
        allows_manual_quantity: true,
        allows_manual_price_override: true,
        requires_justification: true,
        requires_approval: true,
        is_active: true,
        contract_version: contractVer,
        effective_date: effectiveDate,
        expiry_date: expiryDate,
        source_file_name: sourceFileName,
        source_import_date: importDate,
      };
    });

    // Optionally clear existing catalogue
    if (replace_existing) {
      const existing = await base44.asServiceRole.entities.FMPIContractCatalogue.list();
      for (const item of existing) {
        await base44.asServiceRole.entities.FMPIContractCatalogue.delete(item.id);
      }
    }

    // Import catalogue items (Contractual)
    let catalogueCreated = 0;
    for (const item of catalogueItems) {
      await base44.asServiceRole.entities.FMPIContractCatalogue.create(item);
      catalogueCreated++;
    }

    // Import extra charge catalogue items (item_category = "Extra Charge")
    let extraChargeCatalogueCreated = 0;
    for (const item of extraChargeCatalogueItems) {
      await base44.asServiceRole.entities.FMPIContractCatalogue.create(item);
      extraChargeCatalogueCreated++;
    }

    // Seed Extra Charge Types if they don't exist yet
    const existingEC = await base44.asServiceRole.entities.FMPIExtraChargeTypes.list();
    const existingCodes = existingEC.map(e => e.extra_charge_code);

    const defaultExtraChargeTypes = [
      { extra_charge_code: 'EC-001', display_name: 'Labour / Εργατικά κόστη', description: 'Technicians × labour hours (τεχνικοί χ εργατοώρες)', default_unit: 'hour', default_rate: null, requires_justification: true, requires_approval: true, is_active: true, sort_order: 1 },
      { extra_charge_code: 'EC-002', display_name: 'Vehicle Usage / Χρήση απαιτούμενου οχήματος', description: 'Use of required vehicle for the works', default_unit: 'day', default_rate: null, requires_justification: true, requires_approval: true, is_active: true, sort_order: 2 },
      { extra_charge_code: 'EC-003', display_name: 'Special Vehicle / Crane / Cherry Picker', description: 'Specialist vehicle including crane or cherry picker', default_unit: 'day', default_rate: null, requires_justification: true, requires_approval: true, is_active: true, sort_order: 3 },
      { extra_charge_code: 'EC-004', display_name: 'Emergency / Make Safe Response', description: 'Emergency response and Make Safe works', default_unit: 'flat rate', default_rate: null, requires_justification: true, requires_approval: true, is_active: true, sort_order: 4 },
      { extra_charge_code: 'EC-005', display_name: 'Traffic Management / Safety Measures', description: 'Traffic management, TMP/TMR plans and safety signage', default_unit: 'flat rate', default_rate: null, requires_justification: true, requires_approval: true, is_active: true, sort_order: 5 },
      { extra_charge_code: 'EC-006', display_name: 'Other Relevant Expenses', description: 'Other relevant expenses – please specify / Άλλα συναφή έξοδα', default_unit: 'item', default_rate: null, requires_justification: true, requires_approval: true, is_active: true, sort_order: 6 },
    ];

    let ecCreated = 0;
    for (const ec of defaultExtraChargeTypes) {
      if (!existingCodes.includes(ec.extra_charge_code)) {
        await base44.asServiceRole.entities.FMPIExtraChargeTypes.create(ec);
        ecCreated++;
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${catalogueCreated} FMPI Contract Catalogue items and ${extraChargeCatalogueCreated} Extra Charge items. Created ${ecCreated} Extra Charge Types.`,
      catalogueCreated,
      extraChargeCatalogueCreated,
      ecCreated,
      extraChargeRowsDetected: extraChargeItems.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});