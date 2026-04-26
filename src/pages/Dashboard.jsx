import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { DatabaseBackup, Loader2, CheckCircle2 } from "lucide-react";
import LiveClock from "@/components/dashboard/LiveClock";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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

  const { toast } = useToast();
  const [backfilling, setBackfilling] = useState(false);
  const [backfillDone, setBackfillDone] = useState(false);

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillDone(false);
    const res = await base44.functions.invoke("backfillIncidentAttachments", {});
    setBackfilling(false);
    if (res.data?.success) {
      setBackfillDone(true);
      toast({ title: `Backfill complete: ${res.data.created} new records created, ${res.data.skipped} already existed.` });
    } else {
      toast({ title: "Backfill failed", description: res.data?.error || "Unknown error" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Dashboard"
        subtitle="Operational Command Center"
        actions={
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            disabled={backfilling || backfillDone}
            className="gap-1.5 text-xs"
          >
            {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : backfillDone ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <DatabaseBackup className="w-3.5 h-3.5" />}
            {backfilling ? "Syncing..." : backfillDone ? "Sync Done" : "Sync Old Docs"}
          </Button>
          <LiveClock />
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