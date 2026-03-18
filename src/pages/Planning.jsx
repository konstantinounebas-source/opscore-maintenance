import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import ComparisonPanel from "@/components/planning/ComparisonPanel";
import PinLegend from "@/components/planning/PinLegend";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, CalendarDays, Loader2, GitCompare, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  EMPTY_FILTERS, computePinColor,
  mapViewToFilters, filtersToMapView,
} from "@/components/planning/planningUtils";
import { format } from "date-fns";

const weekStatusBadge = (status) => {
  const map = { Active: "bg-emerald-100 text-emerald-700", Draft: "bg-slate-100 text-slate-500", Locked: "bg-amber-100 text-amber-700", Archived: "bg-slate-100 text-slate-400" };
  return map[status] || "bg-slate-100 text-slate-500";
};

export default function Planning() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: weeks = [],          isLoading: weeksLoading }       = useQuery({ queryKey: ["planningWeeks"],      queryFn: () => base44.entities.PlanningWeeks.list("-created_date") });
  const { data: assets = [] }                                         = useQuery({ queryKey: ["assets"],             queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] }                                      = useQuery({ queryKey: ["incidents"],          queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] }                                     = useQuery({ queryKey: ["workOrders"],         queryFn: () => base44.entities.WorkOrders.list() });
  const { data: allAssignments = [], isLoading: assignmentsLoading }  = useQuery({ queryKey: ["planningAssignments"], queryFn: () => base44.entities.PlanningAssignments.list() });
  const { data: mapViews = [] }                                       = useQuery({ queryKey: ["mapViews"],           queryFn: () => base44.entities.MapViews.list("sort_order") });

  // ── UI State ──────────────────────────────────────────────────────────────────
  const [selectedWeekId, setSelectedWeekId]     = useState(null);
  const [compWeekId, setCompWeekId]             = useState(null);   // Week B in comparison
  const [comparisonMode, setComparisonMode]     = useState(false);
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

  // Auto-select active week on load
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

  const assignedAssetIds = useMemo(() => new Set(weekAssignments.map(a => a.asset_id)), [weekAssignments]);
  // O(1) assignment lookup by asset ID — avoids O(n*m) find() inside filter loop
  const assignmentByAssetId = useMemo(() => Object.fromEntries(weekAssignments.map(a => [a.asset_id, a])), [weekAssignments]);

  // Apply filters
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

  // Detail panel enrichment
  const latestIncident  = useMemo(() => {
    if (!selectedAsset) return null;
    const list = incidentsByAsset[selectedAsset.id] || [];
    return list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  }, [selectedAsset, incidentsByAsset]);

  const latestWorkOrder = useMemo(() => {
    if (!selectedAsset) return null;
    const list = workOrdersByAsset[selectedAsset.id] || [];
    return list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  }, [selectedAsset, workOrdersByAsset]);

  const currentAssignment = useMemo(() => {
    if (!selectedAsset || !selectedWeekId) return null;
    return assignmentByAssetId[selectedAsset.id] || null;
  }, [selectedAsset, assignmentByAssetId, selectedWeekId]);

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
      const dupe = weekAssignments.find(a => a.asset_id === formData.asset_id);
      if (dupe) throw new Error("This asset is already assigned to this week.");
      return base44.entities.PlanningAssignments.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
      toast({ title: "Assignment saved" });
    },
    onError: (err) => toast({ title: err.message || "Failed to save", variant: "destructive" }),
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
    const targets = allAssignments.filter(a => ids.includes(a.id));
    for (const a of targets) {
      const updated = { ...data };
      // Recompute pin_color if status changed
      if (data.assignment_status) {
        updated.pin_color = computePinColor(a.priority_bucket, data.assignment_status);
      }
      await base44.entities.PlanningAssignments.update(a.id, updated);
    }
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    setSelectedAssignmentIds([]);
    setBulkSaving(false);
    toast({ title: `Updated ${targets.length} assignments` });
  };

  const handleDuplicateToWeek = async (ids, targetWeekId) => {
    setBulkSaving(true);
    const targets = allAssignments.filter(a => ids.includes(a.id));
    const existingInTarget = allAssignments.filter(a => a.planning_week_id === targetWeekId).map(a => a.asset_id);
    let skipped = 0;
    for (const a of targets) {
      if (existingInTarget.includes(a.asset_id)) { skipped++; continue; }
      await base44.entities.PlanningAssignments.create({
        ...a, id: undefined, created_date: undefined, updated_date: undefined,
        planning_week_id: targetWeekId,
        assignment_status: "Planned",
      });
    }
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
    setSelectedAssignmentIds([]);
    setBulkSaving(false);
    toast({ title: `Duplicated ${targets.length - skipped} assignments${skipped > 0 ? ` (${skipped} skipped, already present)` : ""}` });
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleSelectAsset = useCallback((asset) => {
    setSelectedAsset(asset);
    const asgn = weekAssignments.find(a => a.asset_id === asset.id);
    setSelectedAssignment(asgn || null);
  }, [weekAssignments]);

  const handleSelectAssignmentRow = useCallback((assignment) => {
    setSelectedAssignment(assignment);
    const asset = assetsMap[assignment.asset_id];
    if (asset) setSelectedAsset(asset);
  }, [assetsMap]);

  const handleOpenAssign = (asset) => {
    setAssigningFromAsset(asset);
    setEditingAssignment(null);
    setAssignModalOpen(true);
  };

  const handleEditAssignment = (assignment) => {
    setAssigningFromAsset(assetsMap[assignment.asset_id] || null);
    setEditingAssignment(assignment);
    setAssignModalOpen(true);
  };

  const handleSaveAssignment = async (formData, existingId) => {
    await saveAssignmentMutation.mutateAsync({ formData, existingId });
  };

  const handleRemoveAssignment = (assignment) => {
    removeAssignmentMutation.mutate(assignment.id);
  };

  const handleSelectView = (viewId) => {
    setSelectedViewId(viewId);
    if (!viewId) { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); return; }
    const view = mapViews.find(v => v.id === viewId);
    if (!view) return;
    // Build filters from view, using view_type="Custom" with no assignment filter as "unassigned" signal
    const f = mapViewToFilters(view);
    // Restore show_unassigned_only from view metadata (view_type Custom + no other assignment filter)
    if (view.view_type === "Custom" && !view.filter_assignment_status && !view.filter_assignment_type) {
      f.show_unassigned_only = true;
    }
    setFilters(f);
    setAppliedFilters(f);
    if (view.linked_week_id) setSelectedWeekId(view.linked_week_id);
  };

  const handleExportSummary = () => {
    const rows = [["Asset ID", "Asset Name", "City", "Type", "Status", "Priority", "Assigned To", "Team", "Zone"]];
    filteredAssignments.forEach(a => {
      const asset = assetsMap[a.asset_id] || {};
      rows.push([asset.asset_id, asset.asset_name, asset.city, a.assignment_type, a.assignment_status, a.priority_bucket, a.assigned_to, a.team_name, a.route_zone].map(v => v || ""));
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedWeek?.week_code || "week"}_assignments.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = weeksLoading || assignmentsLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopHeader
        title="Planning & Map Scheduler"
        subtitle={selectedWeek ? `${selectedWeek.week_code} — ${selectedWeek.week_name}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 h-8">
              <span className="text-xs text-slate-500">Comparison</span>
              <Switch checked={comparisonMode} onCheckedChange={setComparisonMode} />
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => { setEditingWeek(null); setWeekModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Week
            </Button>
          </div>
        }
      />

      {/* Week Selector Bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {comparisonMode ? "Week A" : "Week"}
          </span>
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

        {comparisonMode && (
          <>
            <span className="text-xs text-slate-400 font-semibold">vs.</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <GitCompare className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Week B</span>
            </div>
            <Select value={compWeekId || "none"} onValueChange={v => setCompWeekId(v === "none" ? null : v)}>
              <SelectTrigger className="w-64 h-8 text-sm border-slate-200">
                <SelectValue placeholder="Select comparison week..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {weeks.filter(w => w.id !== selectedWeekId).map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{w.week_code}</span>
                      <span>{w.week_name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {selectedWeek && !comparisonMode && (
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
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />}
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — 60% — Map + Filters */}
        <div className="flex flex-col w-[60%] border-r border-slate-200 overflow-hidden">
          <div className="p-4 space-y-3 overflow-y-auto flex flex-col h-full">

            {/* Map controls bar */}
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
                // search applies live; dropdown filters require Apply button
                if (updated.search !== filters.search) setAppliedFilters(prev => ({ ...prev, search: updated.search }));
              }}
              onApply={() => setAppliedFilters({ ...filters })}
              onReset={() => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setSelectedViewId(null); }}
              assets={assets}
              assignments={weekAssignments}
            />

            {/* Map */}
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

        {/* RIGHT PANEL — 40% */}
        <div className="flex flex-col w-[40%] overflow-hidden bg-slate-50">
          <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">

            {comparisonMode ? (
              /* ── COMPARISON MODE ── */
              <ComparisonPanel
                weekA={selectedWeek}
                weekB={compWeek}
                allAssignments={allAssignments}
                assetsMap={assetsMap}
              />
            ) : (
              /* ── NORMAL MODE ── */
              <>
                {/* KPI Bar */}
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <PlanningKPIBar assignments={weekAssignments} />
                </div>

                {/* Bulk Actions Bar */}
                <BulkActionsBar
                  selectedIds={selectedAssignmentIds}
                  allAssignments={allAssignments}
                  weeks={weeks}
                  currentWeekId={selectedWeekId}
                  onBulkUpdate={handleBulkUpdate}
                  onDuplicateToWeek={handleDuplicateToWeek}
                  saving={bulkSaving}
                />

                {/* Assignment Table */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col" style={{ minHeight: 280 }}>
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

                {/* Asset Detail Panel */}
                <AssetDetailPanel
                  asset={selectedAsset}
                  assignment={currentAssignment}
                  latestIncident={latestIncident}
                  latestWorkOrder={latestWorkOrder}
                  selectedWeek={selectedWeek}
                  onAssign={handleOpenAssign}
                  onEditAssignment={handleEditAssignment}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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