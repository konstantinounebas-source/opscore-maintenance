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

    // Update in batches of 100 with delays between batches
    let updatedCount = 0;
    for (let i = 0; i < assetsToUpdate.length; i += 100) {
      const batch = assetsToUpdate.slice(i, i + 100);
      await Promise.all(
        batch.map(a => base44.asServiceRole.entities.Assets.update(a.id, { asset_id: a.asset_id }))
      );
      updatedCount += batch.length;
      if (i + 100 < assetsToUpdate.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
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