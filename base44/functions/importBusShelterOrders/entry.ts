import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows provided for import' }, { status: 400 });
  }

  // Fetch existing asset_codes to avoid duplicates
  const existingAssets = await base44.asServiceRole.entities.Assets.filter({ asset_source: 'bus_shelter_order' });
  const existingCodes = new Set(existingAssets.map(a => String(a.asset_code)));

  const toCreate = [];
  const skipped = [];

  const validStages = ['planning', 'ordered', 'installation', 'installed', 'maintenance'];
  const validConditions = ['none', 'sign_only', 'shelter_only', 'sign_and_shelter', 'unknown'];
  const validBay = ['yes', 'no', 'unknown'];

  for (const row of rows) {
    const code = String(row.asset_code || '').trim();
    if (!code) { skipped.push({ code: '(empty)', reason: 'missing asset_code' }); continue; }
    if (existingCodes.has(code)) { skipped.push({ code, reason: 'duplicate' }); continue; }

    const stage = validStages.includes(row.asset_stage) ? row.asset_stage : 'planning';
    const condition = validConditions.includes(row.existing_condition) ? row.existing_condition : 'unknown';
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
    existingCodes.add(code);
  }

  // Bulk create
  if (toCreate.length > 0) {
    await base44.asServiceRole.entities.Assets.bulkCreate(toCreate);
  }

  return Response.json({
    success: true,
    total_rows: rows.length,
    created: toCreate.length,
    skipped: skipped.length,
    skipped_details: skipped.slice(0, 20),
  });
});