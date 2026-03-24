import React from "react";
import { Link } from "react-router-dom";
import { Box, AlertCircle, Repeat, CalendarClock, ChevronRight } from "lucide-react";

function HealthRow({ icon: Icon, color, label, value, sublabel, href }) {
  const colorMap = {
    amber:  { icon: "text-amber-600", val: "text-amber-700", bg: "bg-amber-50" },
    red:    { icon: "text-red-600",   val: "text-red-700",   bg: "bg-red-50" },
    indigo: { icon: "text-indigo-600",val: "text-indigo-700",bg: "bg-indigo-50" },
    emerald:{ icon: "text-emerald-600",val: "text-emerald-700",bg: "bg-emerald-50" },
    slate:  { icon: "text-slate-500", val: "text-slate-700", bg: "bg-slate-50" },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <Link to={href} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-base font-bold tabular-nums ${c.val}`}>{value}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
      </div>
    </Link>
  );
}

export default function AssetHealthSummary({ assets, incidents, workOrders }) {
  const underMaintenance = assets.filter(a => a.status === "Under Maintenance" || a.status === "Maintenance").length;
  const inactive = assets.filter(a => a.status === "Inactive").length;

  // Assets with 2+ total incidents (all-time)
  const assetIncidentCount = {};
  incidents.filter(i => i.related_asset_id).forEach(i => {
    assetIncidentCount[i.related_asset_id] = (assetIncidentCount[i.related_asset_id] || 0) + 1;
  });
  const repeatedIssues = Object.values(assetIncidentCount).filter(c => c >= 2).length;

  // Overdue preventive (next_inspection_date in past)
  const today = new Date();
  const overdueInspection = assets.filter(a => {
    if (!a.next_inspection_date) return false;
    return new Date(a.next_inspection_date) < today;
  }).length;

  // Active assets total
  const active = assets.filter(a => a.status === "Active" || a.status === "Delivered").length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Box className="w-4 h-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-900">Asset Health Summary</h2>
        <Link to="/Assets" className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="-mx-2">
        <HealthRow icon={Box} color="emerald" label="Active Shelters" value={active} sublabel="Operational status" href="/Assets" />
        <HealthRow icon={AlertCircle} color="amber" label="Under Maintenance" value={underMaintenance} sublabel="Temporarily unavailable" href="/Assets" />
        <HealthRow icon={Repeat} color="red" label="Assets with Repeated Issues" value={repeatedIssues} sublabel="2+ incidents all-time" href="/Assets" />
        <HealthRow icon={CalendarClock} color="indigo" label="Overdue Preventive Inspection" value={overdueInspection} sublabel="next_inspection_date passed" href="/Assets" />
        <HealthRow icon={Box} color="slate" label="Inactive Assets" value={inactive} sublabel="Not operational" href="/Assets" />
      </div>
    </div>
  );
}