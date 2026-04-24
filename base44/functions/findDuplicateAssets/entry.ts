import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all assets
    const assets = await base44.asServiceRole.entities.Assets.list('-created_date', 5000);

    // Find duplicates by asset_id
    const byAssetId = {};
    const byAssetCode = {};
    const byActiveShelter = {};

    for (const a of assets) {
        const d = a;
        if (d.asset_id) {
            if (!byAssetId[d.asset_id]) byAssetId[d.asset_id] = [];
            byAssetId[d.asset_id].push({ id: a.id, asset_id: d.asset_id, asset_code: d.asset_code, active_shelter_id: d.active_shelter_id, city: d.city, location_address: d.location_address, asset_stage: d.asset_stage, phase: d.phase });
        }
        if (d.asset_code) {
            if (!byAssetCode[d.asset_code]) byAssetCode[d.asset_code] = [];
            byAssetCode[d.asset_code].push({ id: a.id, asset_id: d.asset_id, asset_code: d.asset_code, active_shelter_id: d.active_shelter_id, city: d.city, location_address: d.location_address, asset_stage: d.asset_stage, phase: d.phase });
        }
        if (d.active_shelter_id) {
            if (!byActiveShelter[d.active_shelter_id]) byActiveShelter[d.active_shelter_id] = [];
            byActiveShelter[d.active_shelter_id].push({ id: a.id, asset_id: d.asset_id, asset_code: d.asset_code, active_shelter_id: d.active_shelter_id, city: d.city, location_address: d.location_address, asset_stage: d.asset_stage, phase: d.phase });
        }
    }

    const dupByAssetId = Object.entries(byAssetId).filter(([, v]) => v.length > 1).map(([k, v]) => ({ key: k, count: v.length, records: v }));
    const dupByAssetCode = Object.entries(byAssetCode).filter(([, v]) => v.length > 1).map(([k, v]) => ({ key: k, count: v.length, records: v }));
    const dupByActiveShelter = Object.entries(byActiveShelter).filter(([, v]) => v.length > 1).map(([k, v]) => ({ key: k, count: v.length, records: v }));

    return Response.json({
        total_assets: assets.length,
        duplicates_by_asset_id: { count: dupByAssetId.length, items: dupByAssetId },
        duplicates_by_asset_code: { count: dupByAssetCode.length, items: dupByAssetCode },
        duplicates_by_active_shelter_id: { count: dupByActiveShelter.length, items: dupByActiveShelter },
    });
});