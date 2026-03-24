import { differenceInDays, subDays, parseISO, isAfter, isBefore, format, startOfMonth, startOfQuarter, startOfYear } from "date-fns";

export const OPEN_STATUSES = ["Open", "In Progress", "On Hold"];
export const CLOSED_STATUSES = ["Resolved", "Closed"];

export function last90Days(incidents) {
  const cutoff = subDays(new Date(), 90);
  return incidents.filter(i => i.reported_date && isAfter(parseISO(i.reported_date), cutoff));
}

export function calcSLAHours(incident) {
  // SLA windows based on priority — using existing priority values
  const slaMap = { Critical: 4, High: 24, Medium: 72, Low: 168 };
  return slaMap[incident.priority] || 72;
}

export function calcResponseCompliance(incidents) {
  const withResponse = incidents.filter(i => i.reported_date && i.approval_date);
  if (!withResponse.length) return null;
  const slaHours = 24; // default response SLA
  const compliant = withResponse.filter(i => {
    const diffH = (new Date(i.approval_date) - new Date(i.reported_date)) / 36e5;
    return diffH <= slaHours;
  });
  return Math.round((compliant.length / withResponse.length) * 100);
}

export function calcResolutionCompliance(incidents) {
  const closed = incidents.filter(i => CLOSED_STATUSES.includes(i.status) && i.reported_date && i.updated_date);
  if (!closed.length) return null;
  const compliant = closed.filter(i => {
    const slaH = calcSLAHours(i);
    const diffH = (new Date(i.updated_date) - new Date(i.reported_date)) / 36e5;
    return diffH <= slaH;
  });
  return Math.round((compliant.length / closed.length) * 100);
}

export function avgResolutionDays(incidents) {
  const closed = incidents.filter(i => CLOSED_STATUSES.includes(i.status) && i.reported_date && i.updated_date);
  if (!closed.length) return null;
  const total = closed.reduce((s, i) => s + differenceInDays(new Date(i.updated_date), new Date(i.reported_date)), 0);
  return (total / closed.length).toFixed(1);
}

export function mostFrequentFailureType(incidents) {
  const counts = {};
  incidents.forEach(i => {
    const cats = [];
    if (i.subsystem_structural_selected) cats.push("Structural");
    if (i.subsystem_electrical_selected) cats.push("Electrical");
    if (i.subsystem_electronic_selected) cats.push("Electronic");
    if (i.subsystem_other_selected) cats.push("Other");
    cats.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
  });
  if (!Object.keys(counts).length) return null;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function groupByMonth(incidents) {
  const map = {};
  incidents.forEach(i => {
    if (!i.reported_date) return;
    const key = format(parseISO(i.reported_date), "MMM yyyy");
    map[key] = map[key] || { month: key, total: 0, closed: 0, open: 0 };
    map[key].total++;
    if (CLOSED_STATUSES.includes(i.status)) map[key].closed++;
    else map[key].open++;
  });
  return Object.values(map).slice(-12);
}

export function groupByQuarter(incidents) {
  const map = {};
  incidents.forEach(i => {
    if (!i.reported_date) return;
    const d = parseISO(i.reported_date);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `Q${q} ${d.getFullYear()}`;
    map[key] = map[key] || { quarter: key, total: 0, closed: 0, open: 0 };
    map[key].total++;
    if (CLOSED_STATUSES.includes(i.status)) map[key].closed++;
    else map[key].open++;
  });
  return Object.values(map).slice(-8);
}

export function failureTypeDistribution(incidents) {
  const counts = { Structural: 0, Electrical: 0, Electronic: 0, Other: 0 };
  incidents.forEach(i => {
    if (i.subsystem_structural_selected) counts.Structural++;
    if (i.subsystem_electrical_selected) counts.Electrical++;
    if (i.subsystem_electronic_selected) counts.Electronic++;
    if (i.subsystem_other_selected) counts.Other++;
  });
  return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
}

export function statusColor(pct) {
  if (pct === null || pct === undefined) return "text-slate-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-600";
}

export function statusBg(pct) {
  if (pct === null || pct === undefined) return "bg-slate-50 border-slate-200";
  if (pct >= 90) return "bg-emerald-50 border-emerald-200";
  if (pct >= 70) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}