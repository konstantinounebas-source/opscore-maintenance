import React, { useState, useMemo } from "react";
import { format, parseISO, getYear, getQuarter, differenceInHours } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CLOSED_STATUSES } from "./kpiUtils";

const SLA_H_MAP = { Critical: 4, High: 24, Medium: 72, Low: 168 };

function groupIncidents(incidents, groupBy) {
  const map = {};
  incidents.forEach(i => {
    if (!i.reported_date) return;
    let key;
    const d = parseISO(i.reported_date);
    if (groupBy === "month") key = format(d, "MMM yy");
    else if (groupBy === "quarter") key = `Q${getQuarter(d)} ${getYear(d)}`;
    else key = String(getYear(d));
    if (!map[key]) map[key] = { period: key, total: 0, closed: 0, open: 0, owr: 0, highPriority: 0, compliantCount: 0, closedWithSLA: 0 };
    map[key].total++;
    if (CLOSED_STATUSES.includes(i.status)) {
      map[key].closed++;
      if (i.reported_date && i.updated_date) {
        const slaH = SLA_H_MAP[i.priority] || 72;
        const diffH = differenceInHours(new Date(i.updated_date), new Date(i.reported_date));
        map[key].closedWithSLA++;
        if (diffH <= slaH) map[key].compliantCount++;
      }
    } else {
      map[key].open++;
    }
    if (i.out_of_warranty === "Yes") map[key].owr++;
    if (i.priority === "Critical" || i.priority === "High") map[key].highPriority++;
  });
  return Object.values(map).map(r => ({
    ...r,
    slaCompliance: r.closedWithSLA > 0 ? Math.round((r.compliantCount / r.closedWithSLA) * 100) : null,
  }));
}

function groupWorkOrders(workOrders, groupBy) {
  const map = {};
  workOrders.forEach(w => {
    if (!w.created_date) return;
    let key;
    const d = new Date(w.created_date);
    if (groupBy === "month") key = format(d, "MMM yy");
    else if (groupBy === "quarter") key = `Q${getQuarter(d)} ${getYear(d)}`;
    else key = String(getYear(d));
    if (!map[key]) map[key] = { period: key, corrective: 0, makeSafe: 0, inspection: 0 };
    const id = w.work_order_id || "";
    const title = (w.title || "").toLowerCase();
    if (id.startsWith("CORR-") || title.includes("corrective")) map[key].corrective++;
    else if (id.startsWith("MSAFE-") || title.includes("make safe")) map[key].makeSafe++;
    else if (id.startsWith("INSP-") || title.includes("inspection")) map[key].inspection++;
  });
  return Object.values(map);
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function TrendsAnalysis({ data }) {
  const { filteredIncidents, workOrders } = data;
  const [groupBy, setGroupBy] = useState("month");

  const incidentTrends = useMemo(() => groupIncidents(filteredIncidents, groupBy), [filteredIncidents, groupBy]);
  const woTrends = useMemo(() => groupWorkOrders(workOrders, groupBy), [workOrders, groupBy]);

  const noData = <p className="text-xs text-slate-400 text-center py-12">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Trends & Analysis</h2>
          <p className="text-xs text-slate-500">Historical patterns based on existing system records</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">Group by:</Label>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Incidents Over Time">
          {incidentTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" name="Total" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="closed" stroke="#10b981" name="Closed" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="open" stroke="#f59e0b" name="Open" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : noData}
        </ChartCard>

        <ChartCard title="SLA Compliance Over Time (%)">
          {incidentTrends.filter(r => r.slaCompliance !== null).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={v => v !== null ? `${v}%` : "N/A"} />
                <Line type="monotone" dataKey="slaCompliance" stroke="#6366f1" name="SLA Compliance" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : noData}
        </ChartCard>

        <ChartCard title="Failure Type Frequency Over Time">
          {incidentTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="highPriority" fill="#ef4444" name="High Priority" radius={[2, 2, 0, 0]} />
                <Bar dataKey="owr" fill="#f59e0b" name="OWR" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : noData}
        </ChartCard>

        <ChartCard title="OWR Trend Over Time">
          {incidentTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="owr" stroke="#f59e0b" name="OWR Incidents" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : noData}
        </ChartCard>

        <ChartCard title="Corrective vs Make-Safe vs Inspection WOs">
          {woTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={woTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="corrective" fill="#6366f1" name="Corrective" radius={[2, 2, 0, 0]} />
                <Bar dataKey="makeSafe" fill="#ef4444" name="Make Safe" radius={[2, 2, 0, 0]} />
                <Bar dataKey="inspection" fill="#10b981" name="Inspection" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : noData}
        </ChartCard>

        <ChartCard title="High Priority Incidents Over Time">
          {incidentTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incidentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="highPriority" fill="#ef4444" name="Critical/High" radius={[2, 2, 0, 0]} />
                <Bar dataKey="total" fill="#e2e8f0" name="Total" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : noData}
        </ChartCard>
      </div>
    </div>
  );
}