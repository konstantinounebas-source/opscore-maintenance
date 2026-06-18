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

    // Collect all expected contract numbers from Excel
    const excelData = new Map(); // child_code -> { contract_number, contract_type, shelter_type }
    let totalExcelItems = 0;

    for (const sheetName of workbook.SheetNames) {
      // Skip FORM sheets
      if (sheetName.toLowerCase().includes('form') || sheetName.toLowerCase().includes('audit')) {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const data = utils.sheet_to_json(sheet, { header: 1 });

      // Determine contract type from sheet name
      let contractType = 'Unknown';
      if (/type\s+a/i.test(sheetName)) contractType = 'Type A';
      else if (/type\s+b/i.test(sheetName)) contractType = 'Type B';
      else if (/type\s+c/i.test(sheetName)) contractType = 'Type C';
      else if (/c1\s*&\s*c2/i.test(sheetName)) contractType = 'Type C1/C2';

      console.log(`Processing ${sheetName} (${contractType})`);

      // Find header row
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        const first = String(data[i][0] || '').trim().toLowerCase();
        if (first === 'no.' || first === 'no') {
          headerRowIdx = i;
          break;
        }
      }

      // Parse rows
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        const itemNo = row[0];
        const contractNumber = row[1];
        const shelterType = row[2];

        // Skip header rows, category headers, and empty rows
        if (!itemNo || typeof itemNo !== 'string' || !itemNo.match(/^[A-Z][0-9A-Z-]+$/)) {
          continue;
        }

        totalExcelItems++;
        excelData.set(itemNo, {
          contract_number: contractNumber ? String(contractNumber) : '',
          contract_type: contractType,
          shelter_type: shelterType || '',
        });
      }
    }

    console.log(`Total items in Excel: ${totalExcelItems}`);

    // Get all ChildCatalog records
    const catalogItems = await base44.asServiceRole.entities.ChildCatalog.filter({});
    console.log(`Total ChildCatalog records: ${catalogItems.length}`);

    // Build audit report
    const audit = {
      total_excel_items: totalExcelItems,
      total_db_records: catalogItems.length,
      matched_with_contract: 0,
      matched_without_contract: 0,
      in_db_not_in_excel: [],
      in_excel_not_in_db: [],
      contract_mismatches: [],
      summary_by_type: {},
    };

    const dbChildCodes = new Set();

    for (const item of catalogItems) {
      const childCode = item.child_code;
      if (!childCode) continue;

      dbChildCodes.add(childCode);
      const excelRecord = excelData.get(childCode);

      if (excelRecord) {
        // Check if contract number matches
        const dbContract = item.excel_contract_number || '';
        const excelContract = excelRecord.contract_number || '';

        if (dbContract || excelContract) {
          audit.matched_with_contract++;
        } else {
          audit.matched_without_contract++;
        }

        // Check for mismatches
        if (dbContract !== excelContract) {
          audit.contract_mismatches.push({
            child_code: childCode,
            db_contract: dbContract,
            excel_contract: excelContract,
            contract_type_db: item.contract_type,
            contract_type_excel: excelRecord.contract_type,
          });
        }
      } else {
        // In DB but not in Excel
        audit.in_db_not_in_excel.push({
          child_code: childCode,
          child_name: item.child_name,
          contract_number: item.excel_contract_number,
          contract_type: item.contract_type,
        });
      }
    }

    // Find items in Excel but not in DB
    for (const [childCode, data] of excelData.entries()) {
      if (!dbChildCodes.has(childCode)) {
        audit.in_excel_not_in_db.push({
          child_code: childCode,
          contract_number: data.contract_number,
          contract_type: data.contract_type,
          shelter_type: data.shelter_type,
        });
      }
    }

    // Summary by contract type
    const typeSummary = {};
    for (const item of catalogItems) {
      const ct = item.contract_type || 'Not Set';
      if (!typeSummary[ct]) typeSummary[ct] = { count: 0, with_contract: 0 };
      typeSummary[ct].count++;
      if (item.excel_contract_number) typeSummary[ct].with_contract++;
    }
    audit.summary_by_type = typeSummary;

    return Response.json({ success: true, audit });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});