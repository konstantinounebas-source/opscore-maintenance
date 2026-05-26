import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { read, utils } from 'npm:xlsx@0.18.5';

// Extract shelter type code from sheet name, e.g. "Part no for type B_" -> "B", "C1 & C2 unique parts" -> "C1/C2"
function extractShelterType(sheetName) {
    const name = sheetName.trim();
    if (/c1\s*&\s*c2/i.test(name)) return 'C1/C2';
    const match = name.match(/type\s+([A-Za-z0-9]+)/i);
    if (match) return match[1].toUpperCase();
    return name;
}

// Known category keywords to detect category header rows
const CATEGORY_KEYWORDS = [
    'structural', 'panels', 'light guide', 'photovoltaic', 'electrical',
    'glazing', 'ad box', 'seating', 'lighting', 'others', 'c1 unique', 'c2 unique'
];

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

        // Helper to sleep between API calls to avoid rate limits
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // Delete existing records in batches
        const existing = await base44.asServiceRole.entities.ChildCatalog.list('created_date', 500);
        console.log(`Deleting ${existing.length} existing records...`);
        for (let i = 0; i < existing.length; i++) {
            await base44.asServiceRole.entities.ChildCatalog.delete(existing[i].id);
            if (i % 10 === 9) await sleep(200);
        }

        // Parse a sheet into structured rows, detecting category via grouping header rows
        const parseSheet = (sheet, shelterTypeCode) => {
            const rawRows = utils.sheet_to_json(sheet, { header: 1 });

            // Find header row (contains 'descrep' or 'descrip')
            let headerRowIdx = -1;
            for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
                const row = rawRows[i].map(c => String(c || '').toLowerCase());
                if (row.some(c => c.includes('descrep') || c.includes('descrip'))) {
                    headerRowIdx = i;
                    break;
                }
            }
            if (headerRowIdx === -1) return [];

            const headers = rawRows[headerRowIdx].map(h => String(h || '').trim());
            const col = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

            const descIdx = col('descrep') !== -1 ? col('descrep') : col('descrip');
            const partNumIdx = col('assembly part') !== -1 ? col('assembly part') : col('part number');
            const contractNumIdx = col('contract number');
            const contractItemIdx = col('contract item');
            const contractQtyIdx = col('contract qty');
            const contractPriceIdx = col('contract price');
            const allocPctIdx = col('% allocation') !== -1 ? col('% allocation') : col('allocation');
            const priceAllocIdx = col('price allocation');
            const remainingBalIdx = col('remaining balance');
            const totalPriceIdx = col('total price');

            if (descIdx === -1) return [];

            const results = [];
            let currentCategory = '';

            for (const row of rawRows.slice(headerRowIdx + 1)) {
                const desc = String(row[descIdx] || '').trim();
                if (!desc) continue;

                // Detect if this row is a category header (non-data row with a known keyword, no part number)
                const descLower = desc.toLowerCase();
                const partNum = String(row[partNumIdx] !== undefined ? row[partNumIdx] : '').trim();
                const isCategory = !partNum && CATEGORY_KEYWORDS.some(kw => descLower.includes(kw));
                if (isCategory) {
                    // Clean up the category name
                    currentCategory = desc.replace(/[:\-\s]+$/, '').trim();
                    continue;
                }

                results.push({
                    Description: desc,
                    PartNumber: partNum,
                    ShelterType: shelterTypeCode,
                    Category: currentCategory,
                    ContractNumber: String(row[contractNumIdx] !== undefined ? row[contractNumIdx] : '').trim(),
                    ContractItem: String(row[contractItemIdx] !== undefined ? row[contractItemIdx] : '').trim(),
                    ContractQty: parseFloat(row[contractQtyIdx]) || 0,
                    ContractPrice: parseFloat(row[contractPriceIdx]) || 0,
                    AllocPct: parseFloat(row[allocPctIdx]) || 0,
                    PriceAlloc: parseFloat(row[priceAllocIdx]) || 0,
                    RemainingBal: parseFloat(row[remainingBalIdx]) || 0,
                    TotalPrice: parseFloat(row[totalPriceIdx]) || 0,
                });
            }
            return results;
        };

        // Collect all rows from all relevant sheets
        const allData = [];
        for (const sheetName of workbook.SheetNames) {
            if (sheetName.toLowerCase().includes('form')) continue;
            const shelterTypeCode = extractShelterType(sheetName);
            const sheet = workbook.Sheets[sheetName];
            const rows = parseSheet(sheet, shelterTypeCode);
            console.log(`Sheet "${sheetName}" (type: ${shelterTypeCode}): ${rows.length} rows`);
            allData.push(...rows);
        }
        console.log('Total rows:', allData.length);

        // Group rows: same description + shelterType + category = same component (potentially a bundle)
        const bundleMap = new Map();
        for (const row of allData) {
            const key = `${row.Description}|${row.ShelterType}|${row.Category}`;
            const itemData = {
                child_name: row.Description,
                child_code: row.PartNumber,
                child_type: row.ShelterType,
                child_category: row.Category,
                unit_price: row.PriceAlloc || row.ContractPrice || null,
                excel_contract_number: row.ContractNumber,
                excel_contract_item: row.ContractItem,
                excel_contract_qty: row.ContractQty,
                excel_contract_price: row.ContractPrice,
                excel_allocation_percentage: row.AllocPct,
                excel_price_allocation: row.PriceAlloc,
                excel_remaining_balance_from_contract_item: row.RemainingBal,
                excel_total_price: row.TotalPrice,
            };
            if (bundleMap.has(key)) {
                bundleMap.get(key).push(itemData);
            } else {
                bundleMap.set(key, [itemData]);
            }
        }

        // Build catalog records
        const catalogRecords = [];
        for (const [key, items] of bundleMap.entries()) {
            const [description, shelterType, category] = key.split('|');
            const firstItem = items[0];

            if (items.length === 1) {
                catalogRecords.push({
                    child_name: firstItem.child_name,
                    child_code: firstItem.child_code,
                    child_type: shelterType,
                    child_category: category,
                    unit_price: firstItem.excel_price_allocation || firstItem.excel_contract_price || null,
                    pricing_type: 'Individual',
                    active: true,
                    excel_contract_number: firstItem.excel_contract_number,
                    excel_contract_item: firstItem.excel_contract_item,
                    excel_contract_qty: firstItem.excel_contract_qty,
                    excel_contract_price: firstItem.excel_contract_price,
                    excel_allocation_percentage: firstItem.excel_allocation_percentage,
                    excel_price_allocation: firstItem.excel_price_allocation,
                    excel_remaining_balance_from_contract_item: firstItem.excel_remaining_balance_from_contract_item,
                    excel_total_price: firstItem.excel_total_price,
                });
            } else {
                const bundlePrice = items.reduce((sum, item) => sum + (item.excel_price_allocation || 0), 0);
                catalogRecords.push({
                    child_name: description,
                    child_code: firstItem.child_code,
                    child_type: shelterType,
                    child_category: category,
                    pricing_type: 'Bundle',
                    bundle_items: items.map(item => ({
                        ...item,
                        unit_price: item.excel_price_allocation || item.excel_contract_price || null,
                    })),
                    bundle_price: bundlePrice || null,
                    active: true,
                });
            }
        }

        console.log(`Creating ${catalogRecords.length} catalog records...`);

        // Bulk create in batches of 20 to avoid rate limits
        const BATCH_SIZE = 20;
        for (let i = 0; i < catalogRecords.length; i += BATCH_SIZE) {
            const batch = catalogRecords.slice(i, i + BATCH_SIZE);
            await base44.asServiceRole.entities.ChildCatalog.bulkCreate(batch);
            await sleep(300);
        }

        return Response.json({
            success: true,
            message: `Successfully imported ${catalogRecords.length} catalog records from ${workbook.SheetNames.filter(s => !s.toLowerCase().includes('form')).length} sheets`,
        });
    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});