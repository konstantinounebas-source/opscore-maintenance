import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Box, AlertTriangle, Wrench, Activity, TrendingUp, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });
  const { data: childAssets = [] } = useQuery({ queryKey: ["childAssets"], queryFn: () => base44.entities.ChildAssets.list() });

  const activeAssets = assets.filter(a => a.status === "Active").length;
  const openIncidents = incidents.filter(i => i.status === "Open" || i.status === "In Progress").length;
  const openWorkOrders = workOrders.filter(w => w.status === "Open" || w.status === "In Progress").length;

  const recentIncidents = [...incidents].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeceTime = new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const greeceDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);

  return (
    <div>
      <TopHeader title="Dashboard" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Assets" value={assets.length} icon={Box} color="indigo" />
          <StatCard label="Active Assets" value={activeAssets} icon={Activity} color="green" />
          <StatCard label="Open Incidents" value={openIncidents} icon={AlertTriangle} color="red" />
          <StatCard label="Open Work Orders" value={openWorkOrders} icon={Wrench} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent Incidents</h2>
              <Link to="/Incidents" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View All</Link>
            </div>
            <div className="space-y-3">
              {recentIncidents.length === 0 && <p className="text-sm text-slate-400">No incidents yet</p>}
              {recentIncidents.map(inc => (
                <Link key={inc.id} to={`/IncidentDetail?id=${inc.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{inc.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inc.incident_id} · {inc.reported_date ? format(new Date(inc.reported_date), "MMM d, yyyy") : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <StatusBadge status={inc.priority} />
                    <StatusBadge status={inc.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Quick Stats</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Child Assets</span>
                <span className="text-sm font-semibold text-slate-900">{childAssets.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Critical Incidents</span>
                <span className="text-sm font-semibold text-red-600">{incidents.filter(i => i.priority === "Critical").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Assets Under Maintenance</span>
                <span className="text-sm font-semibold text-amber-600">{assets.filter(a => a.status === "Under Maintenance").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Resolved Incidents</span>
                <span className="text-sm font-semibold text-emerald-600">{incidents.filter(i => i.status === "Resolved" || i.status === "Closed").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Completed Work Orders</span>
                <span className="text-sm font-semibold text-emerald-600">{workOrders.filter(w => w.status === "Completed").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}