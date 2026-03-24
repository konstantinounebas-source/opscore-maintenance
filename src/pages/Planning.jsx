import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TopHeader from "@/components/layout/TopHeader";
import PlanningMap from "@/components/planning/PlanningMap";
import PlanningFilters from "@/components/planning/PlanningFilters";
import PlanningKPIBar from "@/components/planning/PlanningKPIBar";
import AssignmentTable from "@/components/planning/AssignmentTable";
import AssetDetailPanel from "@/components/planning/AssetDetailPanel";
import PlanningWeekModal from "@/components/planning/PlanningWeekModal";
import AssignAssetModal from "@/components/planning/AssignAssetModal";
import MapViewSelector from "@/components/planning/MapViewSelector";
import BulkActionsBar from "@/components/planning/BulkActionsBar";
import PinLegend from "@/components/planning/PinLegend";
import CrewSchedulerTab from "@/components/planning/CrewSchedulerTab";
import RoutesTab from "@/components/planning/RoutesTab";
import RecommendationsTab from "@/components/planning/RecommendationsTab";
import EnhancedComparisonTab from "@/components/planning/EnhancedComparisonTab";
import MultiWeekPlanningView from "@/pages/MultiWeekPlanningView";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarDays, Loader2, Download, AlertTriangle, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  EMPTY_FILTERS, computePinColor,
  mapViewToFilters, filtersToMapView,
} from "@/components/planning/planningUtils";
import { slaRiskColor } from "@/components/planning/slaUtils";
import { format } from "date-fns";

const TABS = [
  { id: "assignments", label: "Assignments" },
  { id: "crew",        label: "Crew Scheduler" },
  { id: "routes",      label: "Routes" },
  { id: "recommendations", label: "Recommendations" },
  { id: "comparison",  label: "Comparison" },
];

const weekStatusBadge = (status) => {
  const map = { Active: "bg-emerald-100 text-emerald-700", Draft: "bg-slate-100 text-slate-500", Locked: "bg-amber-100 text-amber-700", Archived: "bg-slate-100 text-slate-400" };
  return map[status] || "bg-slate-100 text-slate-500";
};

export default function Planning() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState("single"); // "single" or "multi"

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: weeks = [],          isLoading: weeksLoading }       = useQuery({ queryKey: ["planningWeeks"],       queryFn: () => base44.entities.PlanningWeeks.list("-created_date") });
  const { data: assets = [] }                                         = useQuery({ queryKey: ["assets"],              queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] }                                      = useQuery({ queryKey: ["incidents"],           queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] }                                     = useQuery({ queryKey: ["workOrders"],          queryFn: () => base44.entities.WorkOrders.list() });
  const { data: allAssignments = [], isLoading: assignmentsLoading }  = useQuery({ queryKey: ["planningAssignments"],queryFn: () => base44.entities.PlanningAssignments.list() });
  const { data: mapViews = [] }                                       = useQuery({ queryKey: ["mapViews"],            queryFn: () => base44.entities.MapViews.list("sort_order") });
  const { data: crews = [] }                                          = useQuery({ queryKey: ["crews"],               queryFn: () => base44.entities.Crews.list() });
  const { data: slaRules = [] }                                       = useQuery({ queryKey: ["slaRules"],            queryFn: () => base44.entities.SLARules.list() });
  const { data: routes = [] }                                         = useQuery({ queryKey: ["assignmentRoutes"],    queryFn: () => base44.entities.AssignmentRoutes.list("-created_date") });
  const { data: routeStops = [] }                                     = useQuery({ queryKey: ["assignmentRouteStops"],queryFn: () => base44.entities.AssignmentRouteStops.list("stop_order") });
  const { data: recommendations = [] }                                = useQuery({ queryKey: ["schedulingRecommendations"], queryFn: () => base44.entities.SchedulingRecommendations.list("-created_date") });

  // ── UI State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]               = useState("assignments");
  const [selectedWeekId, setSelectedWeekId]     = useState(null);
  const [compWeekId, setCompWeekId]             = useState(null);
  const [filters, setFilters]                   = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters]     = useState(EMPTY_FILTERS);
  const [selectedAsset, setSelectedAsset]       = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [weekModalOpen, setWeekModalOpen]       = useState(false);
  const [editingWeek, setEditingWeek]           = useState(null);
  const [assignModalOpen, setAssignModalOpen]   = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assigningFromAsset, setAssigningFromAsset] = useState(null);
  const [selectedViewId, setSelectedViewId]     = useState(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState([]);
  const [bulkSaving, setBulkSaving]             = useState(false);
  const [savingView, setSavingView]             = useState(false);

  // Auto-select active week
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      const active = weeks.find(w => w.is_active) || weeks[0];
      setSelectedWeekId(active.id);
    }
  }, [weeks, selectedWeekId]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedWeek    = useMemo(() => weeks.find(w => w.id === selectedWeekId), [weeks, selectedWeekId]);
  const compWeek        = useMemo(() => weeks.find(w => w.id === compWeekId), [weeks, compWeekId]);
  const weekAssignments = useMemo(() => allAssignments.filter(a => a.planning_week_id === selectedWeekId), [allAssignments, selectedWeekId]);
  const assetsMap       = useMemo(() => Object.fromEntries(assets.map(a => [a.id, a])), [assets]);
  const crewsMap        = useMemo(() => Object.fromEntries(crews.map(c => [c.id, c])), [crews]);

  const incidentsByAsset = useMemo(() => {
    const m = {};
    incidents.forEach(i => {
      if (!m[i.related_asset_id]) m[i.related_asset_id] = [];
      m[i.related_asset_id].push(i);
    });
    return m;
  }, [incidents]);

  const workOrdersByAsset = useMemo(() => {
    const m = {};
    workOrders.forEach(w => {
      if (!m[w.related_asset_id]) m[w.related_asset_id] = [];
      m[w.related_asset_id].push(w);
    });
    return m;
  }, [workOrders]);

  const assignedAssetIds    = useMemo(() => new Set(weekAssignments.map(a => a.asset_id)), [weekAssignments]);
  const assignmentByAssetId = useMemo(() => Object.fromEntries(weekAssignments.map(a => [a.asset_id, a])), [weekAssignments]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const f = appliedFilters;
      const q = f.search?.toLowerCase();
      if (q && !a.asset_id?.toLowerCase().includes(q) && !a.asset_name?.toLowerCase().includes(q) &&
          !a.active_shelter_id?.toLowerCase().includes(q) && !a.location_address?.toLowerCase().includes(q)) return false;
      if (f.city && a.city !== f.city) return false;
      if (f.shelter_type && a.shelter_type !== f.shelter_type) return false;
      if (f.asset_status && a.status !== f.asset_status) return false;
      if (f.show_unassigned_only && assignedAssetIds.has(a.id)) return false;
      const asgn = assignmentByAssetId[a.id];
      if (f.assignment_status && (!asgn || asgn.assignment_status !== f.assignment_status)) return false;
      if (f.assignment_type && (!asgn || asgn.assignment_type !== f.assignment_type)) return false;
      if (f.priority_bucket && (!asgn || asgn.priority_bucket !== f.priority_bucket)) return false;
      if (f.team_name && (!asgn || asgn.team_name !== f.team_name)) return false;
      if (f.assigned_to && (!asgn || asgn.assigned_to !== f.assigned_to)) return false;
      if (f.route_zone && (!asgn || asgn.route_zone !== f.route_zone)) return false;
      if (f.has_incident && !incidentsByAsset[a.id]?.length) return false;
      if (f.has_work_order && !workOrdersByAsset[a.id]?.length) return false;
      return true;
    });
  }, [assets, appliedFilters, assignedAssetIds, assignmentByAssetId, incidentsByAsset, workOrdersByAsset]);

  const filteredAssignments = useMemo(() => {
    const ids = new Set(filteredAssets.map(a => a.id));
    return weekAssignments.filter(a => ids.has(a.asset_id));
  }, [weekAssignments, filteredAssets]);

  const latestIncident  = useMemo(() => {
    if (!selectedAsset) return null;
    const list = [...(incidentsByAsset[selectedAsset.id] || [])];
    return list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  }, [selectedAsset, incidentsByAsset]);

  const latestWorkOrder = useMemo(() => {
    if (!selectedAsset) return null;
    const list = [...(workOrdersByAsset[selectedAsset.id] || [])];
    return list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  }, [selectedAsset, workOrdersByAsset]);

  const currentAssignment = useMemo(() => {
    if (!selectedAsset || !selectedWeekId) return null;
    return assignmentByAssetId[selectedAsset.id] || null;
  }, [selectedAsset, assignmentByAssetId, selectedWeekId]);

  // Badge counts for tabs
  const openRecsCount = useMemo(() =>
    recommendations.filter(r => r.planning_week_id === selectedWeekId && r.status === "Open").length,
    [recommendations, selectedWeekId]
  );
  const criticalSLACount = useMemo(() =>
    weekAssignments.filter(a => a.sla_risk_level === "Critical" || a.sla_risk_level === "High").length,
    [weekAssignments]
  );

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const saveWeekMutation = useMutation({
    mutationFn: async ({ form, existingWeekId }) => {
      if (form.status === "Active" || form.is_active) {
        const otherActives = weeks.filter(w => w.is_active && w.id !== existingWeekId);
        for (const w of otherActives) {
          await base44.entities.PlanningWeeks.update(w.id, { is_active: false, status: w.status === "Active" ? "Draft" : w.status });
        }
      }
      return existingWeekId
        ? base44.entities.PlanningWeeks.update(existingWeekId, form)
        : base44.entities.PlanningWeeks.create(form);
    },
    onSuccess: (newWeek, { existingWeekId }) => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      if (!existingWeekId && newWeek?.id) setSelectedWeekId(newWeek.id);
      toast({ title: existingWeekId ? "Week updated" : "Planning week created" });
      setEditingWeek(null);
    },
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async ({ formData, existingId }) => {
      if (existingId) return base44.entities.PlanningAssignments.update(existingId, formData);
      if (assignmentByAssetId[formData.asset_id]) throw new Error("This asset is already assigned to this week.");
      return base44.entities.PlanningAssignments.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
      toast({ title: "Assignment saved" });
    },
    onError: (err) => toast({ title: err.message || "Failed to save", variant: "destructive" }),
  });

  const deleteWeekMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningWeeks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      setSelectedWeekId(null);
      toast({ title: "Planning week deleted" });
      setEditingWeek(null);
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningAssignments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
      setSelectedAssignment(null);
      toast({ title: "Assignment removed" });
    },
  });

  const saveMapViewMutation = useMutation({
    mutationFn: async ({ name, description, view_type }) => {
      const filterData = filtersToMapView(appliedFilters);
      return base44.entities.MapViews.create({ name, description, view_type, ...filterData, is_shared: true, sort_order: mapViews.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapViews"] });
      toast({ title: "Map view saved" });
      setSavingView(false);
    },
  });

  // ── Bulk Operations ───────────────────────────────────────────────────────────
  const handleBulkUpdate = async (ids, data) => {
    setBulkSaving(true);
    const idSet = new Set(ids);
    const targets = allAssignments.filter(a => idSet.has(a.id));
    const needsColorRecompute = data.assignment_status || data.priority_bucket;
    await Promise.all(targets.map(a => {
      const updated = { ...data };
      if (needsColorRecompute) {
        const newStatus   = data.assignment_status || a.assignment_status;
        const newPriority = data.priority_bucket   || a.priority_bucket;
        updated.pin_color = computePinColor(newPriority, newStatus);
      }
      return base44.entities.PlanningAssignments.update(a.id, updated);
    }));
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    setSelectedAssignmentIds([]);
    setBulkSaving(false);
    toast({ title: `Updated ${targets.length} assignments` });
  };

  const handleDuplicateToWeek = async (ids, targetWeekId) => {
    setBulkSaving(true);
    const idSet = new Set(ids);
    const targets = allAssignments.filter(a => idSet.has(a.id));
    const existingInTargetSet = new Set(allAssignments.filter(a => a.planning_week_id === targetWeekId).map(a => a.asset_id));
    const toCreate = targets.filter(a => !existingInTargetSet.has(a.asset_id));
    const skipped  = targets.length - toCreate.length;
    await Promise.all(toCreate.map(a =>
      base44.entities.PlanningAssignments.create({
        ...a, id: undefined, created_date: undefined, updated_date: undefined,
        planning_week_id: targetWeekId,
        assignment_status: "Planned",
      })
    ));
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    setSelectedAssignmentIds([]);
    setBulkSaving(false);
    toast({ title: `Duplicated ${toCreate.length} assignments${skipped > 0 ? ` (${skipped} skipped)` : ""}` });
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSelectAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    setSelectedAssignment(assignmentByAssetId[asset.id] || null);
  }, [assignmentByAssetId]);

  const handleSelectAssignmentRow = useCallback((assignment) => {
    setSelectedAssignment(assignment);
    const asset = assetsMap[assignment.asset_id];
    if (asset) setSelectedAsset(asset);
  }, [assetsMap]);

  const handleOpenAssign    = (asset) => { setAssigningFromAsset(asset); setEditingAssignment(null); setAssignModalOpen(true); };
  const handleEditAssignment = (assignment) => { setAssigningFromAsset(assetsMap[assignment.asset_id] || null); setEditingAssignment(assignment); setAssignModalOpen(true); };
  const handleSaveAssignment = async (formData, existingId) => { await saveAssignmentMutation.mutateAsync({ formData, existingId }); };
  const handleRemoveAssignment = (assignment) => { removeAssignmentMutation.mutate(assignment.id); };

  const handleSelectView = (viewId) => {
    setSelectedViewId(viewId);
    if (!viewId) { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); return; }
    const view = mapViews.find(v => v.id === viewId);
    if (!view) return;
    const f = mapViewToFilters(view);
    if (view.view_type === "Custom" && !view.filter_assignment_status && !view.filter_assignment_type) f.show_unassigned_only = true;
    setFilters(f);
    setAppliedFilters(f);
    if (view.linked_week_id) setSelectedWeekId(view.linked_week_id);
  };

  const handleExportSummary = () => {
    const rows = [["Asset ID", "Asset Name", "City", "Type", "Status", "Priority", "Crew", "Assigned To", "Team", "Zone", "SLA Risk", "Score"]];
    filteredAssignments.forEach(a => {
      const asset = assetsMap[a.asset_id] || {};
      const crew  = crewsMap[a.crew_id] || {};
      rows.push([asset.asset_id, asset.asset_name, asset.city, a.assignment_type, a.assignment_status, a.priority_bucket, crew.crew_name, a.assigned_to, a.team_name, a.route_zone, a.sla_risk_level, a.scheduling_score].map(v => v ?? ""));
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedWeek?.week_code || "week"}_assignments.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = weeksLoading || assignmentsLoading;

  // ── VIEW MODE TOGGLE BAR (shared between both views) ──────────────────────────
  const ViewModeToggle = (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 shrink-0">
      <button
        onClick={() => setViewMode("single")}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
          viewMode === "single" ? "bg-white shadow text-indigo-700 border border-slate-200" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Single Week
      </button>
      <button
        onClick={() => setViewMode("multi")}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
          viewMode === "multi" ? "bg-white shadow text-indigo-700 border border-slate-200" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Multi-Week View
      </button>
    </div>
  );

  // ── MULTI-WEEK VIEW ───────────────────────────────────────────────────────────
  if (viewMode === "multi") {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <TopHeader
          title="Planning & Map Scheduler"
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={() => { setEditingWeek(null); setWeekModalOpen(true); }}>
                <Plus className="w-3.5 h-3.5" /> New Week
              </Button>
            </div>
          }
        />
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
          {ViewModeToggle}
        </div>
        <div className="flex-1 overflow-hidden">
          <MultiWeekPlanningView />
        </div>
        <PlanningWeekModal
          open={weekModalOpen}
          onOpenChange={setWeekModalOpen}
          week={editingWeek}
          onSave={(form) => saveWeekMutation.mutateAsync({ form, existingWeekId: editingWeek?.id })}
        />
      </div>
    );
  }

  // ── SINGLE WEEK VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeader
        title="Planning & Map Scheduler"
        subtitle={selectedWeek ? `${selectedWeek.week_code} — ${selectedWeek.week_name}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => { setEditingWeek(null); setWeekModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Week
            </Button>
          </div>
        }
      />

      {/* Toolbar: view toggle + week selector */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-wrap">
        {ViewModeToggle}

        <div className="w-px h-5 bg-slate-200 shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Week</span>
        </div>
        <Select value={selectedWeekId || ""} onValueChange={setSelectedWeekId}>
          <SelectTrigger className="w-64 h-8 text-sm border-slate-200">
            <SelectValue placeholder="Select planning week..." />
          </SelectTrigger>
          <SelectContent>
            {weeks.map(w => (
              <SelectItem key={w.id} value={w.id}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{w.week_code}</span>
                  <span>{w.week_name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${weekStatusBadge(w.status)}`}>{w.status}</span>
                </span>
              </SelectItem>
            ))}
            {weeks.length === 0 && <SelectItem value="none" disabled>No planning weeks yet</SelectItem>}
          </SelectContent>
        </Select>

        {selectedWeek && (
          <div className="flex items-center gap-2 text-xs text-slate-500 ml-1">
            <span>
              {(() => { try { return format(new Date(selectedWeek.start_date), "MMM d"); } catch { return ""; } })()}
              {" — "}
              {(() => { try { return format(new Date(selectedWeek.end_date), "MMM d, yyyy"); } catch { return ""; } })()}
            </span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${weekStatusBadge(selectedWeek.status)}`}>{selectedWeek.status}</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600"
              onClick={() => { setEditingWeek(selectedWeek); setWeekModalOpen(true); }}>
              Edit
            </Button>
          </div>
        )}

        {criticalSLACount > 0 && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium ml-1">
            <AlertTriangle className="w-3 h-3" />{criticalSLACount} SLA risk
          </span>
        )}
        {openRecsCount > 0 && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            <Zap className="w-3 h-3" />{openRecsCount} recommendation{openRecsCount !== 1 ? "s" : ""}
          </span>
        )}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />}
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col w-[58%] border-r border-slate-200 overflow-hidden">
          <div className="p-4 space-y-3 overflow-y-auto flex flex-col h-full">
            <div className="flex items-center gap-3 flex-wrap">
              <MapViewSelector
                mapViews={mapViews}
                selectedViewId={selectedViewId}
                onSelectView={handleSelectView}
                filters={appliedFilters}
                onSaveView={(data) => { setSavingView(true); saveMapViewMutation.mutateAsync(data); }}
                saving={savingView}
              />
            </div>
            <PlanningFilters
              filters={filters}
              onChange={(updated) => {
                setFilters(updated);
                if (updated.search !== filters.search) setAppliedFilters(prev => ({ ...prev, search: updated.search }));
              }}
              onApply={() => setAppliedFilters({ ...filters })}
              onReset={() => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setSelectedViewId(null); }}
              assets={assets}
              assignments={weekAssignments}
              onSelectAsset={handleSelectAsset}
            />
            <div className="flex-1 min-h-[380px]">
              <PlanningMap
                assets={filteredAssets}
                assignments={weekAssignments}
                selectedAssetId={selectedAsset?.id}
                onSelectAsset={handleSelectAsset}
              />
            </div>
            <PinLegend />
          </div>
        </div>

        <div className="flex flex-col w-[42%] overflow-hidden bg-slate-50">
          <div className="bg-white border-b border-slate-200 px-3 flex items-center gap-0 overflow-x-auto shrink-0">
            {TABS.map(tab => {
              const badge = tab.id === "recommendations" && openRecsCount > 0 ? openRecsCount : null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id ? "border-indigo-500 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  {badge && (
                    <span className="bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "assignments" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <PlanningKPIBar assignments={weekAssignments} />
                </div>
                <BulkActionsBar
                  selectedIds={selectedAssignmentIds}
                  allAssignments={allAssignments}
                  weeks={weeks}
                  currentWeekId={selectedWeekId}
                  onBulkUpdate={handleBulkUpdate}
                  onDuplicateToWeek={handleDuplicateToWeek}
                  saving={bulkSaving}
                />
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col" style={{ minHeight: 260 }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Assignments</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{weekAssignments.length} total</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleExportSummary} title="Export CSV">
                        <Download className="w-3 h-3" />
                      </Button>
                      {selectedAsset && !assignedAssetIds.has(selectedAsset.id) && selectedWeek && (
                        <Button size="sm" className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleOpenAssign(selectedAsset)}>
                          <Plus className="w-3 h-3" /> Assign Selected
                        </Button>
                      )}
                    </div>
                  </div>
                  {!selectedWeek ? (
                    <div className="flex items-center justify-center h-24 text-slate-400 text-sm">Select a planning week</div>
                  ) : (
                    <AssignmentTable
                      assignments={filteredAssignments}
                      assetsMap={assetsMap}
                      onSelect={handleSelectAssignmentRow}
                      selectedId={selectedAssignment?.id}
                      onEdit={handleEditAssignment}
                      onRemove={handleRemoveAssignment}
                      selectedIds={selectedAssignmentIds}
                      onSelectionChange={setSelectedAssignmentIds}
                    />
                  )}
                </div>
                <AssetDetailPanel
                  asset={selectedAsset}
                  assignment={currentAssignment}
                  latestIncident={latestIncident}
                  latestWorkOrder={latestWorkOrder}
                  selectedWeek={selectedWeek}
                  onAssign={handleOpenAssign}
                  onEditAssignment={handleEditAssignment}
                />
              </div>
            )}
            {activeTab === "crew" && (
              <CrewSchedulerTab
                selectedWeekId={selectedWeekId}
                weeks={weeks}
                weekAssignments={weekAssignments}
                allAssignments={allAssignments}
                crews={crews}
                assetsMap={assetsMap}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["planningAssignments"] })}
              />
            )}
            {activeTab === "routes" && (
              <RoutesTab
                selectedWeekId={selectedWeekId}
                weekAssignments={weekAssignments}
                assetsMap={assetsMap}
                crews={crews}
                routes={routes}
                routeStops={routeStops}
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ["assignmentRoutes"] });
                  queryClient.invalidateQueries({ queryKey: ["assignmentRouteStops"] });
                }}
              />
            )}
            {activeTab === "recommendations" && (
              <RecommendationsTab
                selectedWeekId={selectedWeekId}
                weekAssignments={weekAssignments}
                assetsMap={assetsMap}
                incidentsByAsset={incidentsByAsset}
                crews={crews}
                crewsMap={crewsMap}
                slaRules={slaRules}
                recommendations={recommendations}
                onNavigateToAsset={(assetId) => {
                  const asset = assetsMap[assetId];
                  if (asset) { handleSelectAsset(asset); setActiveTab("assignments"); }
                }}
              />
            )}
            {activeTab === "comparison" && (
              <EnhancedComparisonTab
                weekA={selectedWeek}
                weekB={compWeek}
                allAssignments={allAssignments}
                assetsMap={assetsMap}
                crews={crews}
                recommendations={recommendations}
                compWeekId={compWeekId}
                setCompWeekId={setCompWeekId}
                weeks={weeks}
              />
            )}
          </div>
        </div>
      </div>

      <PlanningWeekModal
        open={weekModalOpen}
        onOpenChange={setWeekModalOpen}
        week={editingWeek}
        onSave={(form) => saveWeekMutation.mutateAsync({ form, existingWeekId: editingWeek?.id })}
      />
      <AssignAssetModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        asset={assigningFromAsset}
        week={selectedWeek}
        existingAssignment={editingAssignment}
        incidents={incidents}
        workOrders={workOrders}
        onSave={handleSaveAssignment}
      />
    </div>
  );
}