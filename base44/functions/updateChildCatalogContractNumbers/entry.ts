import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { read, utils } from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { file_url } = body;
    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    console.log('Fetching Excel file:', file_url);
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to fetch file' }, { status: 400 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = read(arrayBuffer, { type: 'array' });

    const results = {
      updated: 0,
      not_found: 0,
      sheets_processed: 0,
    };

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      // Only process Type A, B, C sheets
      if (!/type\s+[abc]/i.test(sheetName) && !/c1\s*&\s*c2/i.test(sheetName)) {
        continue;
      }

      results.sheets_processed++;
      const sheet = workbook.Sheets[sheetName];
      const data = utils.sheet_to_json(sheet, { header: 1 });

      // Determine contract type from sheet name
      let contractType = 'Unknown';
      if (/type\s+a/i.test(sheetName)) contractType = 'Type A';
      else if (/type\s+b/i.test(sheetName)) contractType = 'Type B';
      else if (/type\s+c/i.test(sheetName)) contractType = 'Type C';
      else if (/c1\s*&\s*c2/i.test(sheetName)) contractType = 'Type C1/C2';

      console.log(`Processing ${sheetName} (${contractType})`);

      // Parse rows - skip header rows
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Row structure: [Item No., Contract Number, Shelter Type, Type, Description, Total Price]
        const itemNo = row[0];
        const contractNumber = row[1];

        // Skip header rows and category headers
        if (!itemNo || typeof itemNo !== 'string' || !itemNo.match(/^[A-Z]\d+$/)) {
          continue;
        }

        // Find matching ChildCatalog record by child_code
        const catalogItems = await base44.asServiceRole.entities.ChildCatalog.filter({ child_code: itemNo });
        if (!catalogItems || catalogItems.length === 0) {
          console.log(`Not found: ${itemNo}`);
          results.not_found++;
          continue;
        }

        // Update all matching records (should be just one)
        for (const item of catalogItems) {
          const patch = {
            excel_contract_number: contractNumber ? String(contractNumber) : '',
            contract_type: contractType,
          };
          await base44.asServiceRole.entities.ChildCatalog.update(item.id, patch);
          results.updated++;
          console.log(`Updated ${itemNo}: contract=${contractNumber}, type=${contractType}`);
        }
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});