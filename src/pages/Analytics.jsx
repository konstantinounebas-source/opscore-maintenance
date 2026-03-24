import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart2, Activity, ShieldCheck, TrendingUp, FileDown, Database, X } from "lucide-react";
import KPIOverview from "@/components/analytics/KPIOverview";
import OperationalMetrics from "@/components/analytics/OperationalMetrics";
import SLACompliance from "@/components/analytics/SLACompliance";
import TrendsAnalysis from "@/components/analytics/TrendsAnalysis";
import ReportBuilder from "@/components/analytics/ReportBuilder";
import DataTraceability from "@/components/analytics/DataTraceability";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";

export default function Analytics() {
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    city: "",
    assetStatus: "",
    incidentStatus: "",
    warrantyStatus: "",
    priority: "",
    caStatus: "",
    fmpiOnly: false,
    owrOnly: false,
  });

  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });
  const { data: childAssets = [] } = useQuery({ queryKey: ["childAssets"], queryFn: () => base44.entities.ChildAssets.list() });
  const { data: auditTrail = [] } = useQuery({ queryKey: ["auditTrail"], queryFn: () => base44.entities.IncidentAuditTrail.list() });

  // Apply filters
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (filters.dateFrom && inc.reported_date && inc.reported_date < filters.dateFrom) return false;
      if (filters.dateTo && inc.reported_date && inc.reported_date > filters.dateTo) return false;
      if (filters.incidentStatus && inc.status !== filters.incidentStatus) return false;
      if (filters.priority && inc.priority !== filters.priority) return false;
      if (filters.caStatus && inc.ca_status !== filters.caStatus) return false;
      if (filters.warrantyStatus === "OWR" && inc.out_of_warranty !== "Yes") return false;
      if (filters.warrantyStatus === "In Warranty" && inc.out_of_warranty === "Yes") return false;
      if (filters.owrOnly && inc.out_of_warranty !== "Yes") return false;
      if (filters.fmpiOnly && !inc.owr_fmpi_done) return false;
      if (filters.city) {
        const asset = assets.find(a => a.id === inc.related_asset_id);
        if (!asset || asset.city !== filters.city) return false;
      }
      return true;
    });
  }, [incidents, filters, assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (filters.assetStatus && a.status !== filters.assetStatus) return false;
      if (filters.city && a.city !== filters.city) return false;
      return true;
    });
  }, [assets, filters]);

  const filteredWorkOrders = useMemo(() => {
    const ALLOWED_PREFIXES = ["CORR-", "MSAFE-", "INSP-"];
    return workOrders.filter(w =>
      ALLOWED_PREFIXES.some(p => (w.work_order_id || "").startsWith(p)) ||
      ["make safe", "corrective", "inspection"].some(kw => (w.title || "").toLowerCase().includes(kw))
    );
  }, [workOrders]);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v !== "" && v !== false).length;

  const resetFilters = () => setFilters({
    dateFrom: "", dateTo: "", city: "", assetStatus: "",
    incidentStatus: "", warrantyStatus: "", priority: "",
    caStatus: "", fmpiOnly: false, owrOnly: false,
  });

  const data = { assets, filteredAssets, incidents, filteredIncidents, workOrders: filteredWorkOrders, childAssets, auditTrail };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <TopHeader
        title="Analytics & KPIs"
        subtitle="Operational metrics, SLA compliance, trends and reports"
        actions={
          activeFilterCount > 0 && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1.5 text-xs text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100">
              <X className="w-3.5 h-3.5" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
            </Button>
          )
        }
      />

      <div className="p-4 border-b bg-white">
        <AnalyticsFilters filters={filters} onChange={setFilters} assets={assets} incidents={incidents} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="kpi" className="flex flex-col h-full">
          <div className="bg-white border-b px-6 pt-3">
            <TabsList className="h-auto bg-transparent p-0 gap-1">
              {[
                { value: "kpi", label: "KPI Overview", icon: BarChart2 },
                { value: "operational", label: "Operational Metrics", icon: Activity },
                { value: "sla", label: "SLA & Compliance", icon: ShieldCheck },
                { value: "trends", label: "Trends & Analysis", icon: TrendingUp },
                { value: "reports", label: "Report Builder", icon: FileDown },
                { value: "traceability", label: "Data Traceability", icon: Database },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700 data-[state=active]:bg-transparent text-slate-500 hover:text-slate-700"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="flex-1 p-6">
            <TabsContent value="kpi" className="mt-0"><KPIOverview data={data} filters={filters} /></TabsContent>
            <TabsContent value="operational" className="mt-0"><OperationalMetrics data={data} filters={filters} /></TabsContent>
            <TabsContent value="sla" className="mt-0"><SLACompliance data={data} filters={filters} /></TabsContent>
            <TabsContent value="trends" className="mt-0"><TrendsAnalysis data={data} filters={filters} /></TabsContent>
            <TabsContent value="reports" className="mt-0"><ReportBuilder data={data} filters={filters} /></TabsContent>
            <TabsContent value="traceability" className="mt-0"><DataTraceability data={data} filters={filters} /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}