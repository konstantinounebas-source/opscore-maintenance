import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows provided for import' }, { status: 400 });
  }

  // Fetch existing bus shelter order assets keyed by asset_code
  const existingAssets = await base44.asServiceRole.entities.Assets.filter({ asset_source: 'bus_shelter_order' });
  const existingByCode = {};
  for (const a of existingAssets) {
    if (a.asset_code != null) existingByCode[String(a.asset_code).trim()] = a;
  }

  const validStages = ['planning', 'ordered', 'installation', 'installed', 'maintenance'];
  const validConditions = ['none', 'sign_only', 'shelter_only', 'sign_and_shelter', 'unknown'];
  const validBay = ['yes', 'no', 'unknown'];

  const toCreate = [];
  const toUpdate = [];
  const skipped = [];

  for (const row of rows) {
    // Always treat asset_code as a string, trim whitespace
    const rawCode = row.asset_code != null ? String(row.asset_code).trim() : '';
    if (!rawCode) { skipped.push({ code: '(empty)', reason: 'missing asset_code' }); continue; }

    const stage = validStages.includes(row.asset_stage) ? row.asset_stage : 'planning';
    const condition = validConditions.includes(row.existing_condition) ? row.existing_condition : 'unknown';
    const bay = validBay.includes(row.has_bay) ? row.has_bay : 'unknown';

    const orderYearRaw = row.order_year ? String(row.order_year).replace(/\D.*$/, '') : null;
    const orderYear = orderYearRaw ? parseInt(orderYearRaw, 10) : null;

    const record = {
      asset_id: `BSO-${rawCode}`,
      asset_source: 'bus_shelter_order',
      asset_stage: stage,
      asset_code: rawCode,
      asset_name: row.asset_name ? String(row.asset_name).trim() : `Bus Shelter ${rawCode}`,
      location_address: row.location_address ? String(row.location_address).trim() : null,
      municipality: row.municipality ? String(row.municipality).trim() : null,
      city: row.city ? String(row.city).trim() : null,
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      order_year: orderYear,
      existing_condition: condition,
      has_bay: bay,
      ordered_shelter_type: row.ordered_shelter_type ? String(row.ordered_shelter_type).trim() : null,
      installed_shelter_type: row.installed_shelter_type ? String(row.installed_shelter_type).trim() : null,
      installation_date: row.installation_date_derived ? String(row.installation_date_derived).trim() : null,
      notes: [
        row.traffic_management_note ? `Traffic: ${row.traffic_management_note}` : null,
        row.data_quality_flags ? `Flags: ${row.data_quality_flags}` : null,
        row.is_ready_for_maintenance === 'yes' ? 'Ready for maintenance' : null,
      ].filter(Boolean).join(' | ') || null,
      category: 'bus_shelter',
      asset_type: 'Bus Shelter',
    };

    const existing = existingByCode[rawCode];
    if (existing) {
      toUpdate.push({ id: existing.id, data: record });
    } else {
      toCreate.push(record);
    }
  }

  // Bulk create new records
  if (toCreate.length > 0) {
    await base44.asServiceRole.entities.Assets.bulkCreate(toCreate);
  }

  // Update existing records one by one (no bulk update API)
  for (const { id, data } of toUpdate) {
    await base44.asServiceRole.entities.Assets.update(id, data);
  }

  return Response.json({
    success: true,
    total_rows: rows.length,
    created: toCreate.length,
    updated: toUpdate.length,
    skipped: skipped.length,
    skipped_details: skipped.slice(0, 20),
  });
});