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

    // Update first 10 only to avoid rate limits - call multiple times
    let updatedCount = 0;
    const batch = assetsToUpdate.slice(0, 10);
    for (const asset of batch) {
      await base44.asServiceRole.entities.Assets.update(asset.id, { asset_id: asset.asset_id });
      updatedCount++;
      await new Promise(r => setTimeout(r, 100));
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