import React, { useState } from "react";
import { format } from "date-fns";
import { Database, Eye, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DrillDownModal from "./DrillDownModal";
import { CLOSED_STATUSES, OPEN_STATUSES, last90Days } from "./kpiUtils";

export default function DataTraceability({ data }) {
  const { filteredAssets, filteredIncidents, workOrders, auditTrail } = data;
  const [drillDown, setDrillDown] = useState(null);

  const owrIncidents = filteredIncidents.filter(i => i.out_of_warranty === "Yes");
  const fmpiIncidents = filteredIncidents.filter(i => i.owr_fmpi_done);
  const inc90 = last90Days(filteredIncidents);
  const closed90 = inc90.filter(i => CLOSED_STATUSES.includes(i.status));
  const openIncidents = filteredIncidents.filter(i => OPEN_STATUSES.includes(i.status));
  const activeAssets = filteredAssets.filter(a => a.status === "Active");

  const DATA_SOURCES = [
    {
      metric: "Total Active Shelters",
      count: activeAssets.length,
      source: "Assets entity, status = Active",
      records: activeAssets,
      type: "assets",
      logic: "filter(a => a.status === 'Active')"
    },
    {
      metric: "Total Incidents (90d)",
      count: inc90.length,
      source: "Incidents entity, reported_date within last 90 days",
      records: inc90,
      type: "incidents",
      logic: "filter(i => reported_date > today - 90d)"
    },
    {
      metric: "Closed Incidents (90d)",
      count: closed90.length,
      source: "Incidents entity, status IN [Resolved, Closed], last 90d",
      records: closed90,
      type: "incidents",
      logic: "filter(i => CLOSED_STATUSES.includes(i.status) && last90d)"
    },
    {
      metric: "Open Incidents",
      count: openIncidents.length,
      source: "Incidents entity, status IN [Open, In Progress, On Hold]",
      records: openIncidents,
      type: "incidents",
      logic: "filter(i => OPEN_STATUSES.includes(i.status))"
    },
    {
      metric: "OWR Incidents",
      count: owrIncidents.length,
      source: "Incidents entity, out_of_warranty = 'Yes'",
      records: owrIncidents,
      type: "incidents",
      logic: "filter(i => i.out_of_warranty === 'Yes')"
    },
    {
      metric: "FMPI Cases",
      count: fmpiIncidents.length,
      source: "Incidents entity, owr_fmpi_done = true",
      records: fmpiIncidents,
      type: "incidents",
      logic: "filter(i => i.owr_fmpi_done === true)"
    },
    {
      metric: "All Work Orders (filtered)",
      count: workOrders.length,
      source: "WorkOrders entity, type IN [Corrective, Make-Safe, Inspection]",
      records: workOrders,
      type: "workorders",
      logic: "filter by CORR-, MSAFE-, INSP- prefixes or title keywords"
    },
    {
      metric: "Pending CA Approval",
      count: filteredIncidents.filter(i => i.ca_status === "Pending").length,
      source: "Incidents entity, ca_status = 'Pending'",
      records: filteredIncidents.filter(i => i.ca_status === "Pending"),
      type: "incidents",
      logic: "filter(i => i.ca_status === 'Pending')"
    },
  ];

  function exportAllCSV() {
    const rows = [["Metric", "Count", "Source", "Logic"]];
    DATA_SOURCES.forEach(d => rows.push([d.metric, d.count, d.source, d.logic]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `data_traceability_${Date.now()}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Data Traceability</h2>
          <p className="text-xs text-slate-500">Every KPI metric with its exact source data, filter logic, and drill-down capability.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportAllCSV}>
          <Download className="w-3.5 h-3.5" /> Export Traceability Map
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold">Metric</th>
              <th className="px-4 py-3 text-center font-semibold">Count</th>
              <th className="px-4 py-3 text-left font-semibold">Data Source</th>
              <th className="px-4 py-3 text-left font-semibold">Filter Logic</th>
              <th className="px-4 py-3 text-center font-semibold">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DATA_SOURCES.map((d, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{d.metric}</td>
                <td className="px-4 py-3 text-center font-bold text-indigo-700">{d.count}</td>
                <td className="px-4 py-3 text-slate-600">{d.source}</td>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{d.logic}</td>
                <td className="px-4 py-3 text-center">
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2"
                    onClick={() => setDrillDown({ title: d.metric, records: d.records, type: d.type })}>
                    <Eye className="w-3 h-3" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Trail */}
      {auditTrail.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" /> Recent Audit Trail Entries ({auditTrail.length})
          </h3>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {[...auditTrail].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20).map((entry, i) => (
              <div key={i} className="py-2 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">{entry.action}</p>
                  {entry.details && <p className="text-xs text-slate-500 truncate">{entry.details}</p>}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{entry.created_date ? format(new Date(entry.created_date), "dd MMM HH:mm") : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {drillDown && <DrillDownModal {...drillDown} onClose={() => setDrillDown(null)} />}
    </div>
  );
}