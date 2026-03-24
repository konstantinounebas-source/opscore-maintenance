import React, { useState, useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Box, Wrench, AlertTriangle, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import KPICard from "./KPICard";
import DrillDownModal from "./DrillDownModal";
import { last90Days, OPEN_STATUSES, CLOSED_STATUSES, mostFrequentFailureType } from "./kpiUtils";

export default function OperationalMetrics({ data }) {
  const { filteredAssets, filteredIncidents, workOrders } = data;
  const [drillDown, setDrillDown] = useState(null);

  const activeAssets = filteredAssets.filter(a => a.status === "Active");
  const assetsWithOpenWO = useMemo(() => {
    const ids = new Set(workOrders.filter(w => ["Open", "In Progress"].includes(w.status)).map(w => w.related_asset_id).filter(Boolean));
    return filteredAssets.filter(a => ids.has(a.id));
  }, [filteredAssets, workOrders]);

  // Avg shelter age
  const assetsWithInstall = filteredAssets.filter(a => a.installation_date);
  const noInstallDate = filteredAssets.filter(a => !a.installation_date);
  const avgAge = assetsWithInstall.length
    ? (assetsWithInstall.reduce((s, a) => s + differenceInDays(new Date(), parseISO(a.installation_date)), 0) / assetsWithInstall.length / 365).toFixed(1)
    : null;

  const inc90 = last90Days(filteredIncidents);
  const closed90 = inc90.filter(i => CLOSED_STATUSES.includes(i.status));
  const open90 = inc90.filter(i => OPEN_STATUSES.includes(i.status));
  const pendingApproval = filteredIncidents.filter(i => i.ca_status === "Pending");

  const topFailure = mostFrequentFailureType(filteredIncidents);

  const corrWOs = workOrders.filter(w => (w.work_order_id || "").startsWith("CORR-") || (w.title || "").toLowerCase().includes("corrective"));
  const inspWOs = workOrders.filter(w => (w.work_order_id || "").startsWith("INSP-") || (w.title || "").toLowerCase().includes("inspection"));
  const corrRatio = (corrWOs.length + inspWOs.length) > 0
    ? Math.round((corrWOs.length / (corrWOs.length + inspWOs.length)) * 100)
    : null;

  const metrics = [
    {
      label: "Total Active Shelters",
      value: activeAssets.length,
      sub: `of ${filteredAssets.length} total assets`,
      icon: Box,
      records: activeAssets,
      type: "assets",
      description: "All Assets with status = Active"
    },
    {
      label: "Shelters Under Maintenance",
      value: assetsWithOpenWO.length,
      sub: "Have at least one open Work Order",
      icon: Wrench,
      colorClass: "text-amber-700",
      bgClass: "bg-amber-50 border-amber-200",
      records: assetsWithOpenWO,
      type: "assets",
      description: "Assets with at least one Open or In Progress Work Order"
    },
    {
      label: "Avg Shelter Age (years)",
      value: avgAge ?? "N/A",
      sub: noInstallDate.length > 0 ? `⚠ ${noInstallDate.length} shelters missing install date` : "Based on installation date",
      icon: Clock,
      records: assetsWithInstall,
      type: "assets",
      description: "Average of (today − installation_date) for assets with recorded installation dates"
    },
    {
      label: "Total Incidents (90d)",
      value: inc90.length,
      sub: "Reported in last 90 days",
      icon: AlertTriangle,
      records: inc90,
      type: "incidents",
      description: "Incidents with reported_date within the last 90 days"
    },
    {
      label: "Closed Incidents (90d)",
      value: closed90.length,
      sub: "Resolved or Closed",
      icon: CheckCircle2,
      colorClass: "text-emerald-700",
      bgClass: "bg-emerald-50 border-emerald-200",
      records: closed90,
      type: "incidents",
      description: "Incidents with status Resolved or Closed, reported in last 90 days"
    },
    {
      label: "Open Incidents (90d)",
      value: open90.length,
      sub: "Open / In Progress / On Hold",
      icon: Clock,
      colorClass: open90.length > 10 ? "text-red-700" : "text-slate-800",
      bgClass: open90.length > 10 ? "bg-red-50 border-red-200" : "bg-white border-slate-200",
      records: open90,
      type: "incidents",
      description: "Incidents in Open, In Progress, or On Hold status reported in last 90 days"
    },
    {
      label: "Pending Approval",
      value: pendingApproval.length,
      sub: "CA Status = Pending",
      icon: Clock,
      colorClass: pendingApproval.length > 5 ? "text-amber-700" : "text-slate-800",
      bgClass: pendingApproval.length > 5 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200",
      records: pendingApproval,
      type: "incidents",
      description: "Incidents awaiting CA Approval (ca_status = Pending)"
    },
    {
      label: "Most Frequent Failure",
      value: topFailure ?? "N/A",
      sub: "By subsystem category",
      icon: TrendingDown,
      records: topFailure ? filteredIncidents.filter(i => i[`subsystem_${topFailure.toLowerCase()}_selected`]) : [],
      type: "incidents",
      description: "Subsystem category with highest incident count"
    },
    {
      label: "Corrective Ratio",
      value: corrRatio !== null ? `${corrRatio}%` : "N/A",
      sub: `${corrWOs.length} corrective vs ${inspWOs.length} inspection WOs`,
      icon: Wrench,
      records: corrWOs,
      type: "workorders",
      description: "Corrective WOs as % of (Corrective + Inspection) WOs"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Operational Metrics</h2>
        <p className="text-xs text-slate-500 mb-4">All metrics calculated from live system data only.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <div key={i} className="space-y-1">
            <KPICard
              label={m.label}
              value={m.value}
              sub={m.sub}
              icon={m.icon}
              colorClass={m.colorClass}
              bgClass={m.bgClass}
              onDrillDown={() => setDrillDown({ title: m.label, records: m.records, type: m.type })}
            />
            <p className="text-xs text-slate-400 px-1 leading-relaxed">{m.description}</p>
          </div>
        ))}
      </div>
      {drillDown && <DrillDownModal {...drillDown} onClose={() => setDrillDown(null)} />}
    </div>
  );
}