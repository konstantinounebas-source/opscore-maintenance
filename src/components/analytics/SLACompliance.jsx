import React, { useState } from "react";
import { differenceInHours, differenceInDays } from "date-fns";
import { ShieldCheck, ShieldAlert, Clock, AlertCircle } from "lucide-react";
import KPICard from "./KPICard";
import DrillDownModal from "./DrillDownModal";
import {
  calcResponseCompliance, calcResolutionCompliance, avgResolutionDays,
  statusColor, statusBg, CLOSED_STATUSES
} from "./kpiUtils";

function ProgressBar({ pct, colorClass }) {
  const w = Math.min(100, Math.max(0, pct || 0));
  const bg = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
      <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export default function SLACompliance({ data }) {
  const { filteredIncidents, workOrders } = data;
  const [drillDown, setDrillDown] = useState(null);

  const responsePct = calcResponseCompliance(filteredIncidents);
  const resolutionPct = calcResolutionCompliance(filteredIncidents);
  const avgDays = avgResolutionDays(filteredIncidents);

  const owrIncidents = filteredIncidents.filter(i => i.out_of_warranty === "Yes");
  const owrPct = filteredIncidents.length ? Math.round((owrIncidents.length / filteredIncidents.length) * 100) : 0;

  const closedIncidents = filteredIncidents.filter(i => CLOSED_STATUSES.includes(i.status) && i.reported_date && i.updated_date);
  const inWarrantyIncidents = closedIncidents.filter(i => i.out_of_warranty !== "Yes");

  const SLA_H_MAP = { Critical: 4, High: 24, Medium: 72, Low: 168 };
  const lateInWarranty = inWarrantyIncidents.filter(i => {
    const slaH = SLA_H_MAP[i.priority] || 72;
    const diffH = differenceInHours(new Date(i.updated_date), new Date(i.reported_date));
    return diffH > slaH;
  });
  const latePct = inWarrantyIncidents.length ? Math.round((lateInWarranty.length / inWarrantyIncidents.length) * 100) : 0;

  const highPriority = filteredIncidents.filter(i => i.priority === "Critical" || i.priority === "High");
  const highPriorityPct = filteredIncidents.length ? Math.round((highPriority.length / filteredIncidents.length) * 100) : 0;

  // FMPI
  const fmpiIncidents = filteredIncidents.filter(i => i.owr_fmpi_done);
  const fmpiApproved = fmpiIncidents.filter(i => i.ca_status === "Approved");
  const fmpiCompliancePct = fmpiIncidents.length ? Math.round((fmpiApproved.length / fmpiIncidents.length) * 100) : null;

  const fmpiWithTiming = filteredIncidents.filter(i => i.owr_fmpi_done && i.approval_date && i.issue_date);
  const avgFmpiApprovalDays = fmpiWithTiming.length
    ? (fmpiWithTiming.reduce((s, i) => s + differenceInDays(new Date(i.approval_date), new Date(i.issue_date)), 0) / fmpiWithTiming.length).toFixed(1)
    : null;

  const slaItems = [
    {
      label: "Response SLA Compliance",
      value: responsePct !== null ? `${responsePct}%` : "N/A",
      sub: "Incidents with approval date within SLA window",
      icon: ShieldCheck,
      pct: responsePct,
      records: filteredIncidents.filter(i => i.reported_date && i.approval_date),
      type: "incidents",
      threshold: "≥ 90% = Green, ≥ 70% = Amber, < 70% = Red"
    },
    {
      label: "Resolution SLA Compliance",
      value: resolutionPct !== null ? `${resolutionPct}%` : "N/A",
      sub: "Closed incidents resolved within priority SLA",
      icon: ShieldCheck,
      pct: resolutionPct,
      records: closedIncidents,
      type: "incidents",
      threshold: "SLA: Critical=4h, High=24h, Medium=72h, Low=168h"
    },
    {
      label: "Avg Resolution Time",
      value: avgDays !== null ? `${avgDays}d` : "N/A",
      sub: "All closed incidents",
      icon: Clock,
      pct: null,
      records: closedIncidents,
      type: "incidents",
      threshold: "Lower is better"
    },
    {
      label: "Late (In Warranty) %",
      value: `${latePct}%`,
      sub: `${lateInWarranty.length} of ${inWarrantyIncidents.length} in-warranty incidents late`,
      icon: AlertCircle,
      pct: 100 - latePct,
      records: lateInWarranty,
      type: "incidents",
      threshold: "% of in-warranty incidents that exceeded SLA"
    },
    {
      label: "High Priority %",
      value: `${highPriorityPct}%`,
      sub: `${highPriority.length} Critical or High priority incidents`,
      icon: ShieldAlert,
      pct: 100 - highPriorityPct,
      records: highPriority,
      type: "incidents",
      threshold: "Critical + High as % of all incidents"
    },
    {
      label: "OWR Incident %",
      value: `${owrPct}%`,
      sub: `${owrIncidents.length} out-of-warranty incidents`,
      icon: AlertCircle,
      pct: 100 - owrPct,
      records: owrIncidents,
      type: "incidents",
      threshold: "Out-of-warranty incidents as % of all incidents"
    },
    {
      label: "FMPI Compliance",
      value: fmpiCompliancePct !== null ? `${fmpiCompliancePct}%` : "N/A",
      sub: `${fmpiApproved.length} approved of ${fmpiIncidents.length} FMPI cases`,
      icon: ShieldCheck,
      pct: fmpiCompliancePct,
      records: fmpiIncidents,
      type: "incidents",
      threshold: "FMPI cases with CA Approved status"
    },
    {
      label: "Avg FMPI Approval Time",
      value: avgFmpiApprovalDays !== null ? `${avgFmpiApprovalDays}d` : "N/A",
      sub: "From issue date to approval date",
      icon: Clock,
      pct: null,
      records: fmpiWithTiming,
      type: "incidents",
      threshold: "Days between issue_date and approval_date"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">SLA & Compliance Metrics</h2>
        <p className="text-xs text-slate-500 mb-4">
          Thresholds: ≥90% = <span className="text-emerald-600 font-medium">Green</span> &nbsp;
          ≥70% = <span className="text-amber-600 font-medium">Amber</span> &nbsp;
          &lt;70% = <span className="text-red-600 font-medium">Red</span>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {slaItems.map((item, i) => (
          <div key={i} className={`bg-white rounded-xl border p-4 ${statusBg(item.pct)}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${statusColor(item.pct)}`} />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{item.label}</span>
              </div>
              <button onClick={() => setDrillDown({ title: item.label, records: item.records, type: item.type })}
                className="text-slate-400 hover:text-indigo-600 transition-colors text-xs underline">
                View
              </button>
            </div>
            <div className={`text-3xl font-bold tabular-nums ${statusColor(item.pct)}`}>{item.value}</div>
            {item.pct !== null && <ProgressBar pct={item.pct} />}
            <p className="text-xs text-slate-500 mt-2">{item.sub}</p>
            <p className="text-xs text-slate-400 mt-1 italic">{item.threshold}</p>
          </div>
        ))}
      </div>
      {drillDown && <DrillDownModal {...drillDown} onClose={() => setDrillDown(null)} />}
    </div>
  );
}