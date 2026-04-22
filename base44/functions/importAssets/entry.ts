import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Unified asset import backend function.
 * Accepts rows matching the canonical asset model (active_shelter_id as primary key).
 * Creates new records or updates existing ones matched by active_shelter_id.
 * Preserves asset_source if already set on an existing record.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'No rows provided' }, { status: 400 });
  }

  // Fetch all existing assets indexed by active_shelter_id (and asset_code as fallback)
  const existing = await base44.asServiceRole.entities.Assets.list();
  const byShelterId = {};
  const byAssetCode = {};
  for (const a of existing) {
    if (a.active_shelter_id) byShelterId[String(a.active_shelter_id).trim()] = a;
    if (a.asset_code) byAssetCode[String(a.asset_code).trim()] = a;
  }

  const validStages = ['planning', 'ordered', 'installation', 'installed', 'maintenance'];
  const validConditions = ['none', 'sign_only', 'shelter_only', 'sign_and_shelter', 'unknown'];
  const validBay = ['yes', 'no', 'unknown'];

  const toCreate = [];
  const toUpdate = [];
  const skipped = [];

  for (const row of rows) {
    // Primary identifier: active_shelter_id; fallback: asset_code column
    const rawId = row.active_shelter_id != null ? String(row.active_shelter_id).trim()
      : row.asset_code != null ? String(row.asset_code).trim()
      : '';

    if (!rawId) { skipped.push({ id: '(empty)', reason: 'missing active_shelter_id' }); continue; }

    const safeStr = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null);
    const safeNum = (v) => {
      const s = safeStr(v);
      if (!s) return null;
      const n = Number(String(s).replace(/[^\d.]/g, ''));
      return isNaN(n) ? null : n;
    };
    const safeDate = (v) => {
      const s = safeStr(v);
      if (!s) return null;
      // Accept YYYY-MM-DD directly, or try to parse
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    };

    const record = {
      active_shelter_id: rawId,
      asset_code: rawId, // keep in sync
      asset_id: safeStr(row.asset_id) || `AST-${rawId}`,
      asset_name: safeStr(row.asset_name) || rawId,
      status: safeStr(row.status) || 'Active',
      asset_stage: validStages.includes(row.asset_stage) ? row.asset_stage : (safeStr(row.asset_stage) || null),
      location_address: safeStr(row.location_address),
      city: safeStr(row.city),
      municipality: safeStr(row.municipality),
      latitude: safeNum(row.latitude),
      longitude: safeNum(row.longitude),
      shelter_type: safeStr(row.shelter_type),
      ordered_shelter_type: safeStr(row.ordered_shelter_type),
      installed_shelter_type: safeStr(row.installed_shelter_type),
      existing_condition: validConditions.includes(row.existing_condition) ? row.existing_condition : (safeStr(row.existing_condition) || null),
      has_bay: validBay.includes(row.has_bay) ? row.has_bay : (safeStr(row.has_bay) || null),
      order_year: safeNum(row.order_year) ? parseInt(safeNum(row.order_year)) : null,
      installation_date: safeDate(row.installation_date),
      delivery_date: safeDate(row.delivery_date),
      delivery_year: safeNum(row.delivery_year) ? parseInt(safeNum(row.delivery_year)) : null,
      warranty_base_year: safeNum(row.warranty_base_year) ? parseInt(safeNum(row.warranty_base_year)) : null,
      software_warranty_end_date: safeDate(row.software_warranty_end_date),
      electronics_warranty_end_date: safeDate(row.electronics_warranty_end_date),
      materials_warranty_end_date: safeDate(row.materials_warranty_end_date),
      structural_warranty_end_date: safeDate(row.structural_warranty_end_date),
      preventive_inspection_date: safeDate(row.preventive_inspection_date),
      next_inspection_date: safeDate(row.next_inspection_date),
      notes: safeStr(row.notes),
      description: safeStr(row.description),
      category: safeStr(row.category) || 'bus_shelter',
      asset_type: safeStr(row.asset_type) || 'Bus Shelter',
    };

    // Remove null values to avoid overwriting with null on update
    Object.keys(record).forEach(k => { if (record[k] === null) delete record[k]; });

    const existingRecord = byShelterId[rawId] || byAssetCode[rawId];
    if (existingRecord) {
      // Preserve existing asset_source; only add if missing
      if (!record.asset_source) record.asset_source = existingRecord.asset_source || 'maintenance';
      toUpdate.push({ id: existingRecord.id, data: record });
    } else {
      record.asset_source = 'maintenance'; // default for new imports
      toCreate.push(record);
    }
  }

  if (toCreate.length > 0) {
    await base44.asServiceRole.entities.Assets.bulkCreate(toCreate);
  }
  for (const { id, data } of toUpdate) {
    await base44.asServiceRole.entities.Assets.update(id, data);
  }

  return Response.json({
    success: true,
    total_rows: rows.length,
    created: toCreate.length,
    updated: toUpdate.length,
    skipped: skipped.length,
    skipped_details: skipped.slice(0, 50),
  });
});