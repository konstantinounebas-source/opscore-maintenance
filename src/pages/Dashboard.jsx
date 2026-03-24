import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Clock } from "lucide-react";
// Note: "Active Shelters" counts assets with status "Active" OR "Delivered"

import SystemStatusCards from "@/components/dashboard/SystemStatusCards";
import NeedsAttention from "@/components/dashboard/NeedsAttention";
import PerformanceSnapshot from "@/components/dashboard/PerformanceSnapshot";
import RecentIncidents from "@/components/dashboard/RecentIncidents";
import AssetHealthSummary from "@/components/dashboard/AssetHealthSummary";
import TrendsMiniCharts from "@/components/dashboard/TrendsMiniCharts";

export default function Dashboard() {
  const { data: assets = [] }     = useQuery({ queryKey: ["assets"],     queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] }  = useQuery({ queryKey: ["incidents"],  queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const greeceTime = new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  const greeceDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens", weekday: "short", day: "2-digit", month: "short", year: "numeric",
  }).format(now);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Dashboard"
        subtitle="Operational Command Center"
        actions={
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <div>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{greeceTime}</span>
              <span className="text-xs text-slate-400 ml-2">{greeceDate} · Athens</span>
            </div>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto w-full">

        {/* 1. System Status */}
        <section>
          <SectionLabel>System Status</SectionLabel>
          <SystemStatusCards assets={assets} incidents={incidents} workOrders={workOrders} />
        </section>

        {/* 2. Needs Attention + Performance Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NeedsAttention incidents={incidents} workOrders={workOrders} assets={assets} />
          <PerformanceSnapshot incidents={incidents} workOrders={workOrders} />
        </div>

        {/* 3. Recent Incidents + Asset Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentIncidents incidents={incidents} />
          <AssetHealthSummary assets={assets} incidents={incidents} workOrders={workOrders} />
        </div>

        {/* 4. Trends */}
        <section>
          <TrendsMiniCharts incidents={incidents} workOrders={workOrders} />
        </section>

      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</p>;
}