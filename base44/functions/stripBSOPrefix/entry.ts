import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const assets = await base44.asServiceRole.entities.Assets.list();
    const assetsToUpdate = assets
      .filter(a => a.asset_id && a.asset_id.startsWith('BSO-'))
      .map(a => ({
        id: a.id,
        asset_id: a.asset_id.replace(/^BSO-/, '')
      }));

    // Update one at a time with delays to avoid rate limits
    let updatedCount = 0;
    for (const asset of assetsToUpdate) {
      await base44.asServiceRole.entities.Assets.update(asset.id, { asset_id: asset.asset_id });
      updatedCount++;
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({
      success: true,
      message: `Stripped BSO prefix from ${updatedCount} assets`,
      updatedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});