import React from "react";
import { Link } from "react-router-dom";
import { Box, AlertTriangle, Clock, Wrench, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subDays, isAfter, parseISO } from "date-fns";

function TrendChip({ current, previous }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> No change</span>;
  const diff = current - previous;
  if (diff === 0) return <span className="text-xs text-slate-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> Same as yesterday</span>;
  const isUp = diff > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 font-medium ${isUp ? "text-red-500" : "text-emerald-600"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? "+" : ""}{diff} since yesterday
    </span>
  );
}

function StatusCard({ label, value, prevValue, icon: Icon, color, href, description }) {
  const colorMap = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
    red:    { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-100" },
    amber:  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100" },
    emerald:{ bg: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-100" },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <Link to={href} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 transition-all group">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg} ${c.border} border`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <TrendChip current={value} previous={prevValue} />
      </div>
      <div>
        <p className={`text-3xl font-bold tabular-nums ${c.text}`}>{value}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
    </Link>
  );
}

function countYesterday(items, filterFn, dateFn) {
  const yesterday = subDays(new Date(), 1);
  return items.filter(i => {
    const d = dateFn(i);
    return filterFn(i) && d && isAfter(parseISO(d), yesterday);
  }).length;
}

export default function SystemStatusCards({ assets, incidents, workOrders }) {
  const activeAssets = assets.filter(a => a.status === "Active" || a.status === "Delivered").length;
  const openInc = incidents.filter(i => ["Open", "In Progress"].includes(i.status)).length;
  const pendingApproval = incidents.filter(i => i.ca_status === "Pending" && i.requires_make_safe !== true && OPEN_STATUSES.includes(i.status)).length;
  const openWOs = workOrders.filter(w => ["Open", "In Progress"].includes(w.status)).length;

  // "yesterday" new items (created in last 24h)
  const newIncYest = countYesterday(incidents, i => ["Open","In Progress"].includes(i.status), i => i.created_date);
  const newWOYest  = countYesterday(workOrders, w => ["Open","In Progress"].includes(w.status), w => w.created_date);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusCard label="Active Shelters" value={activeAssets} prevValue={activeAssets} icon={Box} color="indigo" href="/Assets" description="Active + Delivered shelters" />
      <StatusCard label="Open Incidents" value={openInc} prevValue={Math.max(0, openInc - newIncYest)} icon={AlertTriangle} color="red" href="/Incidents" description="Open + In Progress" />
      <StatusCard label="Pending Approval" value={pendingApproval} prevValue={pendingApproval} icon={Clock} color="amber" href="/Incidents" description="Awaiting CA decision" />
      <StatusCard label="Open Work Orders" value={openWOs} prevValue={Math.max(0, openWOs - newWOYest)} icon={Wrench} color="emerald" href="/WorkOrders" description="Open + In Progress" />
    </div>
  );
}

const OPEN_STATUSES = ["Open", "In Progress", "On Hold"];