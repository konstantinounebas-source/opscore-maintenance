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

        const priceListSheet = workbook.Sheets['Price List'];
        if (!priceListSheet) {
            return Response.json({ error: 'Price List sheet not found in the Excel file' }, { status: 400 });
        }

        const data = utils.sheet_to_json(priceListSheet);

        // Clear existing records
        const existing = await base44.asServiceRole.entities.ChildCatalog.list();
        for (const record of existing) {
            await base44.asServiceRole.entities.ChildCatalog.delete(record.id);
        }

        const bundleMap = new Map();

        for (const row of data) {
            const description = row['Description']?.toString() || '';
            const shelterType = row['Shelter Type']?.toString() || '';
            
            if (!description) continue;

            const bundleKey = `${description}|${shelterType}`;
            
            const itemData = {
                child_name: description,
                child_code: row['Child Code']?.toString() || '',
                child_category: row['Category']?.toString() || '',
                child_type: row['Type']?.toString() || '',
                unit_price: parseFloat(row['Unit Price']) || 0,
                excel_contract_number: row['Contract Number']?.toString() || '',
                excel_contract_item: row['Contract Item']?.toString() || '',
                excel_contract_qty: parseInt(row['Contract Qty']) || 0,
                excel_contract_price: parseFloat(row['Contract Price']) || 0,
                excel_allocation_percentage: parseFloat(row['Allocation %']) || 0,
                excel_price_allocation: parseFloat(row['Price Allocation']) || 0,
                excel_remaining_balance_from_contract_item: parseFloat(row['Remaining Balance From Contract item']) || 0,
                excel_total_price: parseFloat(row['Total Price']) || 0
            };

            if (bundleMap.has(bundleKey)) {
                bundleMap.get(bundleKey).push(itemData);
            } else {
                bundleMap.set(bundleKey, [itemData]);
            }
        }

        const catalogRecords = [];
        for (const [bundleKey, items] of bundleMap.entries()) {
            const [description] = bundleKey.split('|');
            const firstItem = items[0];

            if (items.length === 1) {
                catalogRecords.push({
                    child_name: firstItem.child_name,
                    child_code: firstItem.child_code,
                    child_category: firstItem.child_category,
                    child_type: firstItem.child_type,
                    unit_price: firstItem.unit_price,
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
                    child_category: firstItem.child_category,
                    child_type: firstItem.child_type,
                    pricing_type: 'Bundle',
                    bundle_items: items,
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