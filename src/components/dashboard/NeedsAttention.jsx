import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, ShieldAlert, Repeat, Wrench, ChevronRight } from "lucide-react";
import { differenceInHours, differenceInDays } from "date-fns";

const SLA_H = { Critical: 4, High: 24, Medium: 72, Low: 168 };

function AttentionItem({ icon: Icon, color, label, count, sublabel, href }) {
  if (count === 0) return null;
  const colorMap = {
    red:    { bg: "bg-red-50",    text: "text-red-600",    badge: "bg-red-100 text-red-700" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-600",  badge: "bg-amber-100 text-amber-700" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
    slate:  { bg: "bg-slate-50",  text: "text-slate-500",  badge: "bg-slate-100 text-slate-600" },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <Link to={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{sublabel}</p>
      </div>
      <span className={`text-sm font-bold px-2.5 py-1 rounded-full tabular-nums ${c.badge}`}>{count}</span>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
    </Link>
  );
}

export default function NeedsAttention({ incidents, workOrders, assets }) {
  const now = new Date();

  // 1. SLA-breaching open incidents
  const slaBreached = incidents.filter(i => {
    if (!["Open", "In Progress", "On Hold"].includes(i.status)) return false;
    if (!i.reported_date) return false;
    const slaH = SLA_H[i.priority] || 72;
    const elapsed = differenceInHours(now, new Date(i.reported_date));
    return elapsed > slaH;
  });

  // 2. Pending CA approvals (OWR + FMPI)
  const pendingCA = incidents.filter(i =>
    ["Open", "In Progress", "On Hold"].includes(i.status) &&
    i.ca_status === "Pending" &&
    (i.out_of_warranty === "Yes" || i.owr_fmpi_done)
  );

  // 3. Assets with 2+ open incidents
  const assetIncidentCount = {};
  incidents.filter(i => ["Open","In Progress","On Hold"].includes(i.status) && i.related_asset_id).forEach(i => {
    assetIncidentCount[i.related_asset_id] = (assetIncidentCount[i.related_asset_id] || 0) + 1;
  });
  const repeatedAssets = Object.values(assetIncidentCount).filter(c => c >= 2).length;

  // 4. Delayed work orders (past due_date)
  const delayedWOs = workOrders.filter(w => {
    if (!["Open","In Progress"].includes(w.status)) return false;
    if (!w.due_date) return false;
    return differenceInDays(now, new Date(w.due_date)) > 0;
  });

  const allGood = slaBreached.length === 0 && pendingCA.length === 0 && repeatedAssets === 0 && delayedWOs.length === 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-900">Needs Attention</h2>
        {!allGood && (
          <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
            {slaBreached.length + pendingCA.length + (repeatedAssets > 0 ? 1 : 0) + delayedWOs.length} issues
          </span>
        )}
      </div>
      {allGood ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
            <ShieldAlert className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-emerald-700">All clear</p>
          <p className="text-xs text-slate-400 mt-0.5">No immediate attention required</p>
        </div>
      ) : (
        <div className="space-y-1">
          <AttentionItem icon={Clock} color="red" label="SLA Breached" count={slaBreached.length} sublabel="Open incidents that exceeded response SLA" href="/Incidents" />
          <AttentionItem icon={ShieldAlert} color="amber" label="Pending CA Approvals (OWR/FMPI)" count={pendingCA.length} sublabel="Awaiting authority decision" href="/Incidents" />
          <AttentionItem icon={Repeat} color="indigo" label="Assets with Repeated Issues" count={repeatedAssets} sublabel="Assets with 2+ open incidents" href="/Assets" />
          <AttentionItem icon={Wrench} color="red" label="Delayed Work Orders" count={delayedWOs.length} sublabel="Past due date, still open" href="/WorkOrders" />
        </div>
      )}
    </div>
  );
}