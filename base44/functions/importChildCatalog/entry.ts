import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { read, utils } from 'npm:xlsx@0.18.5';

// Extract shelter type code from sheet name
function extractShelterTypeFromSheet(sheetName) {
    const name = sheetName.trim();
    if (/c1\s*&\s*c2/i.test(name)) return 'C1/C2';
    const match = name.match(/type\s+([A-Za-z0-9]+)/i);
    if (match) return match[1].toUpperCase();
    return name;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

        const body = await req.json();
        const { file_url } = body;
        if (!file_url) return Response.json({ error: 'No file_url provided' }, { status: 400 });

        console.log('Fetching file from URL:', file_url);
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) return Response.json({ error: `Failed to fetch file: ${fileResponse.status}` }, { status: 400 });

        const arrayBuffer = await fileResponse.arrayBuffer();
        const workbook = read(arrayBuffer, { type: 'array' });
        console.log('Available sheets:', workbook.SheetNames);

        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // Delete existing records one by one with delay to avoid rate limits
        const existing = await base44.asServiceRole.entities.ChildCatalog.list('created_date', 500);
        console.log(`Deleting ${existing.length} existing records...`);
        for (let i = 0; i < existing.length; i++) {
            await base44.asServiceRole.entities.ChildCatalog.delete(existing[i].id);
            if (i % 3 === 2) await sleep(500);
        }

        // Parse the Excel format:
        // Col 0: No. (child_code)
        // Col 1: Contract Number
        // Col 2: Shelter Type (child_type e.g. A, B, C1)
        // Col 3: Type (Greek component type name - used as display_name/type descriptor)
        // Col 4: Description (child_name - full English description)
        // Col 5: Total Price (unit_price)
        // Category header rows: col 0 empty, col 1 empty, col 3 has the category name (e.g. "Structural", "Panels")

        const parseSheet = (sheet, sheetShelterType) => {
            const rawRows = utils.sheet_to_json(sheet, { header: 1 });

            // Find the header row (contains 'No.' in first cell)
            let headerRowIdx = -1;
            for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                const row = rawRows[i];
                const first = String(row[0] || '').trim().toLowerCase();
                if (first === 'no.' || first === 'no') {
                    headerRowIdx = i;
                    break;
                }
            }
            if (headerRowIdx === -1) return [];

            const results = [];
            let currentCategory = '';
            let contractType = ''; // Track contract type from sheet name

            // Determine contract type from sheet name
            if (sheetName.toLowerCase().includes('type a')) contractType = 'Type A';
            else if (sheetName.toLowerCase().includes('type b')) contractType = 'Type B';
            else if (sheetName.toLowerCase().includes('type c')) contractType = 'Type C';
            else if (sheetName.toLowerCase().includes('c1')) contractType = 'Type C1';
            else if (sheetName.toLowerCase().includes('c2')) contractType = 'Type C2';

            for (const row of rawRows.slice(headerRowIdx + 1)) {
                const colNo = String(row[0] || '').trim();       // No. / child_code
                const colContractNum = String(row[1] || '').trim(); // Contract Number
                const colShelterType = String(row[2] || '').trim(); // Shelter Type
                const colType = String(row[3] || '').trim();      // Type (Greek descriptor)
                const colDesc = String(row[4] || '').trim();      // Description (English name)
                const colPrice = row[5];                           // Total Price

                // Skip empty rows
                if (!colNo && !colDesc) continue;

                // Category header: no code, no shelter type, description is category name
                if (!colNo && !colShelterType && colDesc) {
                    // Check if it looks like a category (not a sub-description)
                    const descLower = colDesc.toLowerCase();
                    if (!descLower.startsWith('http') && colDesc.length < 80) {
                        currentCategory = colDesc.replace(/[:\-\s]+$/, '').trim();
                    }
                    continue;
                }

                // Skip rows where price is not a number (e.g. "Pending for Charge")
                const price = typeof colPrice === 'number' ? colPrice : parseFloat(colPrice);
                const validPrice = !isNaN(price) && price > 0;

                // Determine shelter type: prefer col1 value, fallback to sheet-derived
                const shelterType = colShelterType || sheetShelterType;

                if (colNo || colDesc) {
                    results.push({
                        child_code: colNo || null,
                        child_name: colDesc || colType || colNo,
                        display_name: colType || null,  // Greek/short type name as display
                        child_type: shelterType,
                        child_category: currentCategory,
                        contract_type: contractType,
                        excel_contract_number: colContractNum || null,
                        unit_price: validPrice ? Math.round(price * 100) / 100 : null,
                        pricing_type: 'Individual',
                        active: true,
                        warranty_start_rule: 'asset_delivery_date',
                    });
                }
            }
            return results;
        };

        // Collect all records from all relevant sheets (skip FORM sheets)
        const allRecords = [];
        for (const sheetName of workbook.SheetNames) {
            if (sheetName.toLowerCase().includes('form')) {
                console.log(`Skipping sheet: ${sheetName}`);
                continue;
            }
            const sheetShelterType = extractShelterTypeFromSheet(sheetName);
            const sheet = workbook.Sheets[sheetName];
            const rows = parseSheet(sheet, sheetShelterType, sheetName);
            console.log(`Sheet "${sheetName}" (type: ${sheetShelterType}): ${rows.length} records`);
            allRecords.push(...rows);
        }

        console.log(`Total catalog records to create: ${allRecords.length}`);

        // Bulk create in batches
        const BATCH_SIZE = 20;
        for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
            const batch = allRecords.slice(i, i + BATCH_SIZE);
            await base44.asServiceRole.entities.ChildCatalog.bulkCreate(batch);
            await sleep(300);
        }

        return Response.json({
            success: true,
            message: `Successfully imported ${allRecords.length} catalog records from ${workbook.SheetNames.filter(s => !s.toLowerCase().includes('form')).length} sheets`,
            count: allRecords.length,
        });
    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});