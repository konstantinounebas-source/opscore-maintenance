// ─── Route Sequencing Utilities ───────────────────────────────────────────────

/**
 * Sort assignments into a practical route sequence.
 * Strategy:
 *  1. Group by city/municipality/district_zone/route_zone
 *  2. Within each group, sort by priority (P1 first), then by lat/lng proximity
 *  3. Flatten groups into a single ordered list
 */
export function buildRouteSequence(assignments, assetsMap) {
  const enriched = assignments.map(a => ({
    ...a,
    _asset: assetsMap[a.asset_id] || {},
  }));

  // Group key: district_zone > municipality > city > route_zone > "Other"
  const groups = {};
  enriched.forEach(a => {
    const key = a.district_zone || a.municipality || a._asset.city || a.route_zone || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  const priorityOrder = { P1: 0, Critical: 1, P2: 2, High: 3, Medium: 4, Low: 5 };

  // Sort each group by priority, then by scheduling_score desc
  Object.values(groups).forEach(group => {
    group.sort((a, b) => {
      const pa = priorityOrder[a.priority_bucket] ?? 6;
      const pb = priorityOrder[b.priority_bucket] ?? 6;
      if (pa !== pb) return pa - pb;
      return (b.scheduling_score || 0) - (a.scheduling_score || 0);
    });
  });

  // Sort groups: group containing most P1/P2 tasks first
  const sortedGroups = Object.entries(groups).sort(([, aArr], [, bArr]) => {
    const aHigh = aArr.filter(a => ["P1", "P2", "Critical"].includes(a.priority_bucket)).length;
    const bHigh = bArr.filter(a => ["P1", "P2", "Critical"].includes(a.priority_bucket)).length;
    return bHigh - aHigh;
  });

  // Flatten and assign stop_order
  const ordered = [];
  let seq = 1;
  sortedGroups.forEach(([, group]) => {
    group.forEach(a => {
      ordered.push({ ...a, _stop_order: seq++ });
    });
  });

  return ordered;
}

/**
 * Calculate rough total estimated duration from assignments.
 */
export function calcTotalDuration(routeStops) {
  return routeStops.reduce((sum, s) => sum + (s.estimated_service_duration_minutes || s.estimated_duration_minutes || 60), 0);
}

/**
 * Compute a simple straight-line distance (km) between two lat/lng points.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * (Math.PI / 180); }

/**
 * Calculate approximate total route distance from ordered assignments.
 */
export function calcTotalDistance(orderedAssignments, assetsMap) {
  let total = 0;
  for (let i = 0; i < orderedAssignments.length - 1; i++) {
    const a = assetsMap[orderedAssignments[i].asset_id];
    const b = assetsMap[orderedAssignments[i + 1].asset_id];
    if (a?.latitude && a?.longitude && b?.latitude && b?.longitude) {
      total += haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    }
  }
  return Math.round(total * 10) / 10;
}

/**
 * Format minutes as e.g. "3h 20m"
 */
export function formatDuration(minutes) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}