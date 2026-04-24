import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const batchSize = body.batchSize || 50;
    const offset = body.offset || 0;
    
    // Get all assets and filter only those NOT active
    const assets = await base44.asServiceRole.entities.Assets.list();
    const nonActiveAssets = assets.filter(a => a.status !== "Active");
    const assetsToUpdate = nonActiveAssets.slice(offset, offset + batchSize);
    
    // Update only non-active assets
    let updatedCount = 0;
    for (const asset of assetsToUpdate) {
      await base44.asServiceRole.entities.Assets.update(asset.id, { status: "Active" });
      updatedCount++;
    }

    const remaining = Math.max(0, nonActiveAssets.length - (offset + batchSize));
    return Response.json({ 
      success: true, 
      updatedBatch: updatedCount, 
      remaining: remaining,
      nextOffset: offset + batchSize,
      totalNonActive: nonActiveAssets.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});