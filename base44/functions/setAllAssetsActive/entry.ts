import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assets
    const assets = await base44.asServiceRole.entities.Assets.list();

    // Update each asset to have status = "Active"
    let updated = 0;
    for (const asset of assets) {
      if (asset.status !== "Active") {
        await base44.asServiceRole.entities.Assets.update(asset.id, { status: "Active" });
        updated++;
      }
    }

    return Response.json({
      success: true,
      totalAssets: assets.length,
      updated: updated,
      message: `Updated ${updated} assets to status "Active"`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});