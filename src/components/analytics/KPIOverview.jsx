import React, { useState, useMemo } from "react";
import { subDays, parseISO, isAfter } from "date-fns";
import {
  Box, AlertTriangle, Wrench, CheckCircle2, Clock, ShieldAlert,
  Activity, TrendingUp, BarChart2, AlertCircle
} from "lucide-react";
import KPICard from "./KPICard";
import DrillDownModal from "./DrillDownModal";
import {
  last90Days, calcResponseCompliance, calcResolutionCompliance,
  avgResolutionDays, mostFrequentFailureType, statusColor, statusBg,
  OPEN_STATUSES, CLOSED_STATUSES, failureTypeDistribution
} from "./kpiUtils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function KPIOverview({ data }) {
  const { assets, filteredAssets, filteredIncidents, workOrders } = data;
  const [drillDown, setDrillDown] = useState(null);

  const activeAssets = filteredAssets.filter(a => a.status === "Active");
  const assetsWithOpenWO = useMemo(() => {
    const assetIdsWithOpenWO = new Set(
      workOrders.filter(w => w.status === "Open" || w.status === "In Progress").map(w => w.related_asset_id).filter(Boolean)
    );
    return filteredAssets.filter(a => assetIdsWithOpenWO.has(a.id));
  }, [filteredAssets, workOrders]);

  const inc90 = last90Days(filteredIncidents);
  const closed90 = inc90.filter(i => CLOSED_STATUSES.includes(i.status));
  const open90 = inc90.filter(i => OPEN_STATUSES.includes(i.status));
  const pendingApproval = filteredIncidents.filter(i => i.ca_status === "Pending" && i.owr_fmpi_done);
  const owrIncidents = filteredIncidents.filter(i => i.out_of_warranty === "Yes");

  const responsePct = calcResponseCompliance(filteredIncidents);
  const resolutionPct = calcResolutionCompliance(filteredIncidents);
  const owrPct = filteredIncidents.length ? Math.round((owrIncidents.length / filteredIncidents.length) * 100) : 0;

  const corrWOs = workOrders.filter(w => (w.work_order_id || "").startsWith("CORR-") || (w.title || "").toLowerCase().includes("corrective"));
  const msafeWOs = workOrders.filter(w => (w.work_order_id || "").startsWith("MSAFE-") || (w.title || "").toLowerCase().includes("make safe"));
  const inspWOs = workOrders.filter(w => (w.work_order_id || "").startsWith("INSP-") || (w.title || "").toLowerCase().includes("inspection"));

  const woDistribution = [
    { name: "Corrective", value: corrWOs.length },
    { name: "Make Safe", value: msafeWOs.length },
    { name: "Inspection", value: inspWOs.length },
  ].filter(d => d.value > 0);

  const failureDist = failureTypeDistribution(filteredIncidents);
  const topFailure = mostFrequentFailureType(filteredIncidents);

  const highPriority = filteredIncidents.filter(i => i.priority === "Critical" || i.priority === "High");
  const highPriorityPct = filteredIncidents.length ? Math.round((highPriority.length / filteredIncidents.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KPICard label="Active Shelters" value={activeAssets.length} icon={Box}
          sub={`of ${filteredAssets.length} total`}
          onDrillDown={() => setDrillDown({ title: "Active Shelters", records: activeAssets, type: "assets" })} />
        <KPICard label="Under Maintenance" value={assetsWithOpenWO.length} icon={Wrench}
          bgClass="bg-amber-50 border-amber-200" colorClass="text-amber-700"
          onDrillDown={() => setDrillDown({ title: "Shelters Under Maintenance", records: assetsWithOpenWO, type: "assets" })} />
        <KPICard label="Incidents (90d)" value={inc90.length} icon={AlertTriangle}
          onDrillDown={() => setDrillDown({ title: "Incidents – Last 90 Days", records: inc90, type: "incidents" })} />
        <KPICard label="Closed (90d)" value={closed90.length} icon={CheckCircle2}
          bgClass="bg-emerald-50 border-emerald-200" colorClass="text-emerald-700"
          onDrillDown={() => setDrillDown({ title: "Closed Incidents – Last 90 Days", records: closed90, type: "incidents" })} />
        <KPICard label="Open (90d)" value={open90.length} icon={Clock}
          bgClass={open90.length > 10 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}
          colorClass={open90.length > 10 ? "text-red-700" : "text-slate-800"}
          onDrillDown={() => setDrillDown({ title: "Open Incidents – Last 90 Days", records: open90, type: "incidents" })} />
        <KPICard label="Pending Approval" value={pendingApproval.length} icon={ShieldAlert}
          bgClass={pendingApproval.length > 5 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}
          colorClass={pendingApproval.length > 5 ? "text-amber-700" : "text-slate-800"}
          onDrillDown={() => setDrillDown({ title: "Incidents Pending CA Approval", records: pendingApproval, type: "incidents" })} />
      </div>

      {/* KPI Cards Row 2 – SLA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KPICard label="Response SLA" value={responsePct !== null ? `${responsePct}%` : "N/A"}
          icon={Activity}
          bgClass={statusBg(responsePct)} colorClass={statusColor(responsePct)}
          sub="within SLA window"
          onDrillDown={() => setDrillDown({ title: "Response SLA – Source Incidents", records: filteredIncidents.filter(i => i.reported_date && i.approval_date), type: "incidents" })} />
        <KPICard label="Resolution SLA" value={resolutionPct !== null ? `${resolutionPct}%` : "N/A"}
          icon={CheckCircle2}
          bgClass={statusBg(resolutionPct)} colorClass={statusColor(resolutionPct)}
          sub="resolved within SLA"
          onDrillDown={() => setDrillDown({ title: "Resolution SLA – Closed Incidents", records: filteredIncidents.filter(i => CLOSED_STATUSES.includes(i.status)), type: "incidents" })} />
        <KPICard label="OWR Incidents" value={`${owrPct}%`}
          icon={AlertCircle}
          bgClass={owrPct > 30 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}
          colorClass={owrPct > 30 ? "text-red-700" : "text-slate-800"}
          sub={`${owrIncidents.length} out of warranty`}
          onDrillDown={() => setDrillDown({ title: "OWR Incidents", records: owrIncidents, type: "incidents" })} />
        <KPICard label="High Priority %" value={`${highPriorityPct}%`}
          icon={TrendingUp}
          bgClass={highPriorityPct > 40 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}
          colorClass={highPriorityPct > 40 ? "text-red-700" : "text-slate-800"}
          sub={`${highPriority.length} Critical/High`}
          onDrillDown={() => setDrillDown({ title: "High Priority Incidents", records: highPriority, type: "incidents" })} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Work Order Type Split */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Work Order Distribution</h3>
          {woDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={woDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {woDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-slate-400 text-center py-8">No work order data</p>}
        </div>

        {/* Failure Type Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Failure Type Distribution</h3>
          {failureDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={failureDist}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-slate-400 text-center py-8">No failure type data</p>}
          {topFailure && <p className="text-xs text-slate-500 mt-2 text-center">Most frequent: <span className="font-semibold text-indigo-700">{topFailure}</span></p>}
        </div>

        {/* Incident Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Incident Status Breakdown</h3>
          {filteredIncidents.length > 0 ? (() => {
            const statusGroups = {};
            filteredIncidents.forEach(i => { statusGroups[i.status] = (statusGroups[i.status] || 0) + 1; });
            const statusData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));
            return (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            );
          })() : <p className="text-xs text-slate-400 text-center py-8">No incident data</p>}
        </div>
      </div>

      {drillDown && <DrillDownModal {...drillDown} onClose={() => setDrillDown(null)} />}
    </div>
  );
}