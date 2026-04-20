import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  // Extract data from the uploaded Excel file using the Base44 integration
  const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
    file_url,
    json_schema: {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              asset_source: { type: "string" },
              asset_stage: { type: "string" },
              asset_code: { type: "string" },
              asset_name: { type: "string" },
              location_address: { type: "string" },
              municipality: { type: "string" },
              city: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              order_year: { type: "number" },
              existing_condition: { type: "string" },
              has_bay: { type: "string" },
              ordered_shelter_type: { type: "string" },
              installed_shelter_type: { type: "string" },
              installation_date_derived: { type: "string" },
              work_start_date: { type: "string" },
              installation_plan_date: { type: "string" },
              is_ready_for_maintenance: { type: "string" },
              traffic_management_note: { type: "string" },
              data_quality_flags: { type: "string" }
            }
          }
        }
      }
    }
  });

  if (extracted.status !== 'success') {
    return Response.json({ error: 'Failed to extract data', details: extracted.details }, { status: 500 });
  }

  const rows = extracted.output?.rows || extracted.output || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows found in extracted data' }, { status: 400 });
  }

  // Fetch existing asset_codes to avoid duplicates
  const existingAssets = await base44.asServiceRole.entities.Assets.filter({ asset_source: 'bus_shelter_order' });
  const existingCodes = new Set(existingAssets.map(a => String(a.asset_code)));

  const toCreate = [];
  const skipped = [];

  for (const row of rows) {
    const code = String(row.asset_code || '').trim();
    if (!code) { skipped.push({ code, reason: 'missing asset_code' }); continue; }
    if (existingCodes.has(code)) { skipped.push({ code, reason: 'duplicate' }); continue; }

    // Validate stage enum
    const validStages = ['planning', 'ordered', 'installation', 'installed', 'maintenance'];
    const stage = validStages.includes(row.asset_stage) ? row.asset_stage : 'planning';

    // Validate existing_condition enum
    const validConditions = ['none', 'sign_only', 'shelter_only', 'sign_and_shelter', 'unknown'];
    const condition = validConditions.includes(row.existing_condition) ? row.existing_condition : 'unknown';

    // Validate has_bay enum
    const validBay = ['yes', 'no', 'unknown'];
    const bay = validBay.includes(row.has_bay) ? row.has_bay : 'unknown';

    const record = {
      asset_id: `BSO-${code}`,
      asset_source: 'bus_shelter_order',
      asset_stage: stage,
      asset_code: code,
      location_address: row.location_address || null,
      municipality: row.municipality || null,
      city: row.city || null,
      latitude: row.latitude || null,
      longitude: row.longitude || null,
      order_year: row.order_year || null,
      existing_condition: condition,
      has_bay: bay,
      ordered_shelter_type: row.ordered_shelter_type || null,
      installed_shelter_type: row.installed_shelter_type || null,
      installation_date: row.installation_date_derived || null,
      notes: [
        row.traffic_management_note ? `Traffic: ${row.traffic_management_note}` : null,
        row.data_quality_flags ? `Flags: ${row.data_quality_flags}` : null,
        row.is_ready_for_maintenance === 'yes' ? 'Ready for maintenance' : null,
      ].filter(Boolean).join(' | ') || null,
      category: 'bus_shelter',
      asset_type: 'Bus Shelter',
    };

    toCreate.push(record);
    existingCodes.add(code); // prevent in-batch duplicates
  }

  // Bulk create in batches of 100
  let created = 0;
  const batchSize = 100;
  for (let i = 0; i < toCreate.length; i += batchSize) {
    const batch = toCreate.slice(i, i + batchSize);
    await base44.asServiceRole.entities.Assets.bulkCreate(batch);
    created += batch.length;
  }

  return Response.json({
    success: true,
    total_rows: rows.length,
    created,
    skipped: skipped.length,
    skipped_details: skipped.slice(0, 20) // return first 20 skipped for review
  });
});