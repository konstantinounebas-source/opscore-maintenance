import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Extract data from Child_Catalog sheet
    const childCatalogSchema = {
      type: 'object',
      properties: {
        'Import_Code': { type: 'string' },
        'Name': { type: 'string' },
        'Category': { type: 'string' },
        'Type': { type: 'string' },
        'Serial': { type: 'string' },
        'Price_EUR': { type: 'number' },
        'Warranty_Months': { type: 'number' },
        'Warranty_Start_Rule': { type: 'string' },
        'Active': { type: 'string' }
      }
    };

    const childCatalogResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: childCatalogSchema
    });

    if (childCatalogResult.status !== 'success' || !childCatalogResult.output) {
      return Response.json({
        error: 'Failed to extract Child_Catalog data',
        details: childCatalogResult.details
      }, { status: 400 });
    }

    // Extract data from Type_Templates sheet
    const typeTemplatesSchema = {
      type: 'object',
      properties: {
        'Shelter_Type': { type: 'string' },
        'Import_Code': { type: 'string' },
        'Display_Order': { type: 'number' },
        'Default_Inclusion': { type: 'string' },
        'Mandatory': { type: 'string' }
      }
    };

    const typeTemplatesResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: typeTemplatesSchema
    });

    if (typeTemplatesResult.status !== 'success' || !typeTemplatesResult.output) {
      return Response.json({
        error: 'Failed to extract Type_Templates data',
        details: typeTemplatesResult.details
      }, { status: 400 });
    }

    const childCatalogData = Array.isArray(childCatalogResult.output) ? childCatalogResult.output : [childCatalogResult.output];
    const typeTemplatesData = Array.isArray(typeTemplatesResult.output) ? typeTemplatesResult.output : [typeTemplatesResult.output];

    // Get existing ChildCatalog records by child_code
    const existingCatalog = await base44.asServiceRole.entities.ChildCatalog.list(100000);
    const catalogByCode = new Map(existingCatalog.map(c => [c.child_code, c]));

    // Process ChildCatalog data
    const catalogIdMap = new Map();
    for (const row of childCatalogData) {
      if (!row || !row['Import_Code'] || !row['Name']) continue;

      const childCode = String(row['Import_Code']).trim();
      const childName = String(row['Name']).trim();
      const childData = {
        child_code: childCode,
        child_name: childName,
        child_category: row['Category'] ? String(row['Category']).trim() : null,
        child_type: row['Type'] ? String(row['Type']).trim() : null,
        serial_number: row['Serial'] ? String(row['Serial']).trim() : null,
        unit_price: row['Price_EUR'] ? Number(row['Price_EUR']) : null,
        default_warranty_months: row['Warranty_Months'] ? Number(row['Warranty_Months']) : null,
        warranty_start_rule: row['Warranty_Start_Rule'] ? String(row['Warranty_Start_Rule']).toLowerCase() : 'asset_delivery_date',
        active: row['Active'] ? String(row['Active']).toLowerCase() === 'true' : true
      };

      let childId;
      if (catalogByCode.has(childCode)) {
        // Update existing
        const existing = catalogByCode.get(childCode);
        await base44.asServiceRole.entities.ChildCatalog.update(existing.id, childData);
        childId = existing.id;
      } else {
        // Create new
        const created = await base44.asServiceRole.entities.ChildCatalog.create(childData);
        childId = created.id;
      }
      catalogIdMap.set(childCode, childId);
    }

    // Process TypeTemplates data
    const createdTemplates = [];
    for (const row of typeTemplatesData) {
      if (!row || !row['Shelter_Type'] || !row['Import_Code']) continue;

      const shelterTypeCode = String(row['Shelter_Type']).trim();
      const childCode = String(row['Import_Code']).trim();
      const childCatalogId = catalogIdMap.get(childCode);

      if (!childCatalogId) {
        console.warn(`Could not find ChildCatalog ID for Import_Code: ${childCode}`);
        continue;
      }

      const templateData = {
        shelter_type_code: shelterTypeCode,
        child_catalog_id: childCatalogId,
        display_order: row['Display_Order'] ? Number(row['Display_Order']) : 0,
        default_included: row['Default_Inclusion'] ? String(row['Default_Inclusion']).toLowerCase() === 'true' : true,
        mandatory: row['Mandatory'] ? String(row['Mandatory']).toLowerCase() === 'true' : false,
        active: true
      };

      const created = await base44.asServiceRole.entities.TypeTemplates.create(templateData);
      createdTemplates.push(created);
    }

    return Response.json({
      success: true,
      message: `Imported ${catalogIdMap.size} ChildCatalog records and ${createdTemplates.length} TypeTemplates records`,
      childCatalogCount: catalogIdMap.size,
      typeTemplatesCount: createdTemplates.length
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});