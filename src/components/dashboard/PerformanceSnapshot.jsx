import React from "react";
import { Link } from "react-router-dom";
import { BarChart2, ChevronRight } from "lucide-react";
import { calcResolutionCompliance, avgResolutionDays } from "@/components/analytics/kpiUtils";

function SnapItem({ label, value, color, sublabel }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>
      </div>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export default function PerformanceSnapshot({ incidents, workOrders }) {
  const resolutionPct = calcResolutionCompliance(incidents);
  const avgDays = avgResolutionDays(incidents);

  const owrCount = incidents.filter(i => i.out_of_warranty === "Yes").length;
  const owrPct = incidents.length ? Math.round((owrCount / incidents.length) * 100) : 0;

  const corrective = workOrders.filter(w => (w.work_order_id || "").startsWith("CORR-") || (w.title || "").toLowerCase().includes("corrective")).length;
  const preventive = workOrders.filter(w => (w.work_order_id || "").startsWith("INSP-") || (w.title || "").toLowerCase().includes("inspection")).length;
  const corrRatio = (corrective + preventive) > 0 ? Math.round((corrective / (corrective + preventive)) * 100) : null;

  const slaColor = resolutionPct === null ? "text-slate-400" : resolutionPct >= 90 ? "text-emerald-600" : resolutionPct >= 70 ? "text-amber-600" : "text-red-600";
  const owrColor = owrPct <= 20 ? "text-emerald-600" : owrPct <= 40 ? "text-amber-600" : "text-red-600";
  const corrColor = corrRatio !== null ? (corrRatio <= 40 ? "text-emerald-600" : corrRatio <= 60 ? "text-amber-600" : "text-red-600") : "text-slate-400";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-900">Performance Snapshot</h2>
        </div>
        <Link to="/Analytics" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-0.5">
          Full Analytics <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        <SnapItem label="SLA Compliance" value={resolutionPct !== null ? `${resolutionPct}%` : "N/A"} color={slaColor} sublabel="Closed incidents within SLA window" />
        <SnapItem label="Avg Resolution Time" value={avgDays !== null ? `${avgDays}d` : "N/A"} color="text-slate-700" sublabel="All closed incidents" />
        <SnapItem label="OWR Incident %" value={`${owrPct}%`} color={owrColor} sublabel={`${owrCount} out-of-warranty cases`} />
        <SnapItem label="Corrective Ratio" value={corrRatio !== null ? `${corrRatio}%` : "N/A"} color={corrColor} sublabel={`${corrective} corrective / ${preventive} inspection WOs`} />
      </div>
    </div>
  );
}