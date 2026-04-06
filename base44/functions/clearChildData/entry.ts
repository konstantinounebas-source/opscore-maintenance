import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Delete all TypeTemplates first (due to FK constraints)
    const templates = await base44.asServiceRole.entities.TypeTemplates.list();
    for (const template of templates) {
      await base44.asServiceRole.entities.TypeTemplates.delete(template.id);
    }

    // Delete all ChildCatalog records
    const catalogs = await base44.asServiceRole.entities.ChildCatalog.list();
    for (const catalog of catalogs) {
      await base44.asServiceRole.entities.ChildCatalog.delete(catalog.id);
    }

    return Response.json({ 
      success: true, 
      message: 'All child data cleared',
      templatesDeleted: templates.length,
      catalogsDeleted: catalogs.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});