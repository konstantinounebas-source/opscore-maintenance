import React from "react";
import { Link } from "react-router-dom";
import { format, differenceInHours } from "date-fns";
import { AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const SLA_H = { Critical: 4, High: 24, Medium: 72, Low: 168 };

function IncidentFlags({ incident }) {
  const flags = [];

  if (incident.ca_status === "Pending" && incident.out_of_warranty === "Yes") {
    flags.push(
      <span key="ca" className="flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
        <ShieldAlert className="w-3 h-3" /> CA
      </span>
    );
  }

  if (incident.out_of_warranty === "Yes") {
    flags.push(
      <span key="owr" className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
        OWR
      </span>
    );
  }

  if (["Open","In Progress","On Hold"].includes(incident.status) && incident.reported_date) {
    const slaH = SLA_H[incident.priority] || 72;
    const elapsed = differenceInHours(new Date(), new Date(incident.reported_date));
    if (elapsed > slaH) {
      flags.push(
        <span key="sla" className="flex items-center gap-0.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
          <Clock className="w-3 h-3" /> SLA!
        </span>
      );
    }
  }

  return flags.length > 0 ? <div className="flex items-center gap-1 flex-wrap">{flags}</div> : null;
}

export default function RecentIncidents({ incidents }) {
  const recent = [...incidents]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-slate-900">Recent Incidents</h2>
        </div>
        <Link to="/Incidents" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View All</Link>
      </div>
      <div className="divide-y divide-slate-100">
        {recent.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No incidents yet</p>}
        {recent.map(inc => (
          <Link key={inc.id} to={`/IncidentDetail?id=${inc.id}`}
            className="flex items-start gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{inc.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {inc.incident_id} · {inc.reported_date ? format(new Date(inc.reported_date), "MMM d, yyyy") : "—"}
                {inc.municipality && ` · ${inc.municipality}`}
              </p>
              <IncidentFlags incident={inc} />
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
              <StatusBadge status={inc.priority} />
              <StatusBadge status={inc.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}