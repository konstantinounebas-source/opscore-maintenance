import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { read, utils } from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { file_url } = body;

        if (!file_url) {
            return Response.json({ error: 'No file_url provided' }, { status: 400 });
        }

        // Fetch the uploaded file
        console.log('Fetching file from URL:', file_url);
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            console.error('File fetch failed:', fileResponse.status, fileResponse.statusText);
            return Response.json({ error: `Failed to fetch uploaded file: ${fileResponse.status} ${fileResponse.statusText}` }, { status: 400 });
        }
        const arrayBuffer = await fileResponse.arrayBuffer();
        const workbook = read(arrayBuffer, { type: 'array' });

        const sheetNames = workbook.SheetNames;
        console.log('Available sheets:', sheetNames);
        

        // Clear existing records
        const existing = await base44.asServiceRole.entities.ChildCatalog.list();
        for (const record of existing) {
            await base44.asServiceRole.entities.ChildCatalog.delete(record.id);
        }

        // Helper to parse rows from a sheet
        const parseSheet = (sheet, sheetLabel) => {
            const rawRows = utils.sheet_to_json(sheet, { header: 1 });
            let headerRowIdx = -1;
            for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
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
            const shelterTypeIdx = col('shelter type');
            const typeIdx = col('type');
            const contractNumIdx = col('contract number');
            const contractItemIdx = col('contract item');
            const contractQtyIdx = col('contract qty');
            const contractPriceIdx = col('contract price');
            const allocPctIdx = col('% allocation') !== -1 ? col('% allocation') : col('allocation');
            const priceAllocIdx = col('price allocation');
            const remainingBalIdx = col('remaining balance');
            const totalPriceIdx = col('total price');
            if (descIdx === -1) return [];
            return rawRows.slice(headerRowIdx + 1)
                .filter(row => row[descIdx] && String(row[descIdx]).trim())
                .map(row => ({
                    Description: String(row[descIdx] || '').trim(),
                    PartNumber: String(row[partNumIdx] !== undefined ? row[partNumIdx] : '').trim(),
                    ShelterType: sheetLabel || String(row[shelterTypeIdx] !== undefined ? row[shelterTypeIdx] : '').trim(),
                    Type: String(row[typeIdx] !== undefined ? row[typeIdx] : '').trim(),
                    ContractNumber: String(row[contractNumIdx] !== undefined ? row[contractNumIdx] : '').trim(),
                    ContractItem: String(row[contractItemIdx] !== undefined ? row[contractItemIdx] : '').trim(),
                    ContractQty: parseFloat(row[contractQtyIdx]) || 0,
                    ContractPrice: parseFloat(row[contractPriceIdx]) || 0,
                    AllocPct: parseFloat(row[allocPctIdx]) || 0,
                    PriceAlloc: parseFloat(row[priceAllocIdx]) || 0,
                    RemainingBal: parseFloat(row[remainingBalIdx]) || 0,
                    TotalPrice: parseFloat(row[totalPriceIdx]) || 0,
                }));
        };

        // Process all relevant sheets
        const allData = [];
        for (const sheetName of sheetNames) {
            if (sheetName.toLowerCase().includes('form')) continue; // skip FORM sheets
            const sheet = workbook.Sheets[sheetName];
            const rows = parseSheet(sheet, sheetName);
            console.log(`Sheet "${sheetName}": ${rows.length} rows`);
            allData.push(...rows);
        }
        console.log('Total rows across all sheets:', allData.length);

        const bundleMap = new Map();
        for (const row of allData) {
            const description = row.Description;
            const shelterType = row.ShelterType;
            if (!description) continue;
            const bundleKey = `${description}|${shelterType}`;
            const itemData = {
                child_name: description,
                child_code: row.PartNumber,
                child_type: row.Type,
                excel_contract_number: row.ContractNumber,
                excel_contract_item: row.ContractItem,
                excel_contract_qty: row.ContractQty,
                excel_contract_price: row.ContractPrice,
                excel_allocation_percentage: row.AllocPct,
                excel_price_allocation: row.PriceAlloc,
                excel_remaining_balance_from_contract_item: row.RemainingBal,
                excel_total_price: row.TotalPrice,
            };
            if (bundleMap.has(bundleKey)) {
                bundleMap.get(bundleKey).push(itemData);
            } else {
                bundleMap.set(bundleKey, [itemData]);
            }
        }

        const catalogRecords = [];
        for (const [bundleKey, items] of bundleMap.entries()) {
            const [description, shelterType] = bundleKey.split('|');
            const firstItem = items[0];
            if (items.length === 1) {
                catalogRecords.push({
                    child_name: firstItem.child_name,
                    child_code: firstItem.child_code,
                    child_type: shelterType,
                    child_category: firstItem.child_type || '',
                    unit_price: firstItem.excel_total_price || firstItem.excel_contract_price || null,
                    pricing_type: 'Individual',
                    active: true,
                    excel_contract_number: firstItem.excel_contract_number,
                    excel_contract_item: firstItem.excel_contract_item,
                    excel_contract_qty: firstItem.excel_contract_qty,
                    excel_contract_price: firstItem.excel_contract_price,
                    excel_allocation_percentage: firstItem.excel_allocation_percentage,
                    excel_price_allocation: firstItem.excel_price_allocation,
                    excel_remaining_balance_from_contract_item: firstItem.excel_remaining_balance_from_contract_item,
                    excel_total_price: firstItem.excel_total_price
                });
            } else {
                const bundlePrice = items.reduce((sum, item) => sum + (item.excel_total_price || 0), 0);
                catalogRecords.push({
                    child_name: description,
                    child_code: firstItem.child_code,
                    child_type: shelterType,
                    child_category: firstItem.child_type || '',
                    pricing_type: 'Bundle',
                    bundle_items: items.map(item => ({
                        ...item,
                        unit_price: item.excel_contract_price || null
                    })),
                    bundle_price: bundlePrice,
                    active: true
                });
            }
        }

        if (catalogRecords.length > 0) {
            await base44.asServiceRole.entities.ChildCatalog.bulkCreate(catalogRecords);
        }

        return Response.json({ 
            success: true, 
            message: `Successfully imported ${catalogRecords.length} catalog records` 
        });
    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});