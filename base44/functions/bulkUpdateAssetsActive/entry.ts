import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const batchSize = body.batchSize || 10;
    const offset = body.offset || 0;
    
    const assets = await base44.asServiceRole.entities.Assets.list();
    const assetsToUpdate = assets.filter(a => a.status !== "Active").slice(offset, offset + batchSize);
    
    for (const asset of assetsToUpdate) {
      await base44.asServiceRole.entities.Assets.update(asset.id, { status: "Active" });
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const remaining = assets.filter(a => a.status !== "Active").length - (offset + batchSize);
    return Response.json({ 
      success: true, 
      updatedBatch: assetsToUpdate.length, 
      remaining: Math.max(0, remaining),
      nextOffset: offset + batchSize
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});