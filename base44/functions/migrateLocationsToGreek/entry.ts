import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CITY_MAP = {
  'Nicosia': 'Λευκωσία',
  'Larnaca': 'Λάρνακα',
  'Limassol': 'Λεμεσός',
  'Famagusta': 'Αμμόχωστος',
  'Paphos': 'Πάφος',
};

const MUNICIPALITY_MAP = {
  'Nicosia': 'Λευκωσία',
  'Alaminos': 'Αλαμινός',
};

const PROVINCE_MAP = {
  'Nicosia': 'Λευκωσία',
  'Paphos': 'Πάφος',
  'Larnaca': 'Λάρνακα',
  'Limassol': 'Λεμεσός',
  'Famagusta': 'Αμμόχωστος',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Process only one entity type per call to stay within rate limits
// Pass ?target=assets or ?target=incidents in the request body

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const target = body.target || 'assets';

    if (target === 'assets') {
      const results = { updated: 0, skipped: 0 };
      const assets = await base44.asServiceRole.entities.Assets.list('-created_date', 500);
      for (const asset of assets) {
        const patch = {};
        if (asset.city && CITY_MAP[asset.city]) patch.city = CITY_MAP[asset.city];
        if (asset.municipality && MUNICIPALITY_MAP[asset.municipality]) patch.municipality = MUNICIPALITY_MAP[asset.municipality];
        if (Object.keys(patch).length > 0) {
          await base44.asServiceRole.entities.Assets.update(asset.id, patch);
          results.updated++;
          await sleep(400);
        } else {
          results.skipped++;
        }
      }
      return Response.json({ success: true, target: 'assets', ...results });
    }

    if (target === 'incidents') {
      const results = { updated: 0, skipped: 0 };
      const incidents = await base44.asServiceRole.entities.Incidents.list('-created_date', 500);
      for (const incident of incidents) {
        const patch = {};
        if (incident.province && PROVINCE_MAP[incident.province]) patch.province = PROVINCE_MAP[incident.province];
        if (incident.municipality && MUNICIPALITY_MAP[incident.municipality]) patch.municipality = MUNICIPALITY_MAP[incident.municipality];
        if (Object.keys(patch).length > 0) {
          await base44.asServiceRole.entities.Incidents.update(incident.id, patch);
          results.updated++;
          await sleep(400);
        } else {
          results.skipped++;
        }
      }
      return Response.json({ success: true, target: 'incidents', ...results });
    }

    return Response.json({ error: 'Pass target: assets or incidents' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});