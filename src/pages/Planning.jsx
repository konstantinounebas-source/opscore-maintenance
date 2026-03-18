import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/layout/TopHeader";
import PlanningMap from "@/components/planning/PlanningMap";
import PlanningFilters from "@/components/planning/PlanningFilters";
import PlanningKPIBar from "@/components/planning/PlanningKPIBar";
import AssignmentTable from "@/components/planning/AssignmentTable";
import AssetDetailPanel from "@/components/planning/AssetDetailPanel";
import PlanningWeekModal from "@/components/planning/PlanningWeekModal";
import AssignAssetModal from "@/components/planning/AssignAssetModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays, Loader2, Trash2, CheckSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { computePriorityBucket, computePinColor } from "@/components/planning/planningUtils";
import { format } from "date-fns";

const EMPTY_FILTERS = { search: "", city: "", shelter_type: "", asset_status: "", assignment_status: "", assignment_type: "", priority_bucket: "" };

export default function Planning() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: weeks = [], isLoading: weeksLoading } = useQuery({ queryKey: ["planningWeeks"], queryFn: () => base44.entities.PlanningWeeks.list("-created_date") });
  const { data: assets = [] } = useQuery({ queryKey: ["assets"], queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents"], queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] } = useQuery({ queryKey: ["workOrders"], queryFn: () => base44.entities.WorkOrders.list() });
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useQuery({ queryKey: ["planningAssignments"], queryFn: () => base44.entities.PlanningAssignments.list() });

  // ── UI State ──────────────────────────────────────────────────────────────────
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assigningFromAsset, setAssigningFromAsset] = useState(null);

  // Auto-select active week on load
  React.useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      const active = weeks.find(w => w.is_active) || weeks[0];
      setSelectedWeekId(active.id);
    }
  }, [weeks]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedWeek = useMemo(() => weeks.find(w => w.id === selectedWeekId), [weeks, selectedWeekId]);
  const weekAssignments = useMemo(() => allAssignments.filter(a => a.planning_week_id === selectedWeekId), [allAssignments, selectedWeekId]);
  const assetsMap = useMemo(() => Object.fromEntries(assets.map(a => [a.id, a])), [assets]);

  const assignedAssetIds = useMemo(() => new Set(weekAssignments.map(a => a.asset_id)), [weekAssignments]);

  // Apply filters
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const f = appliedFilters;
      const q = f.search?.toLowerCase();
      if (q && !a.asset_id?.toLowerCase().includes(q) && !a.asset_name?.toLowerCase().includes(q) && !a.active_shelter_id?.toLowerCase().includes(q) && !a.location_address?.toLowerCase().includes(q)) return false;
      if (f.city && a.city !== f.city) return false;
      if (f.shelter_type && a.shelter_type !== f.shelter_type) return false;
      if (f.asset_status && a.status !== f.asset_status) return false;
      if (f.assignment_status) {
        const asgn = weekAssignments.find(wa => wa.asset_id === a.id);
        if (!asgn || asgn.assignment_status !== f.assignment_status) return false;
      }
      if (f.assignment_type) {
        const asgn = weekAssignments.find(wa => wa.asset_id === a.id);
        if (!asgn || asgn.assignment_type !== f.assignment_type) return false;
      }
      if (f.priority_bucket) {
        const asgn = weekAssignments.find(wa => wa.asset_id === a.id);
        if (!asgn || asgn.priority_bucket !== f.priority_bucket) return false;
      }
      return true;
    });
  }, [assets, appliedFilters, weekAssignments]);

  const filteredAssignments = useMemo(() => {
    const filteredIds = new Set(filteredAssets.map(a => a.id));
    return weekAssignments.filter(a => filteredIds.has(a.asset_id));
  }, [weekAssignments, filteredAssets]);

  // Detail panel enrichment
  const latestIncident = useMemo(() => {
    if (!selectedAsset) return null;
    return [...incidents].filter(i => i.related_asset_id === selectedAsset.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  }, [selectedAsset, incidents]);

  const latestWorkOrder = useMemo(() => {
    if (!selectedAsset) return null;
    return [...workOrders].filter(w => w.related_asset_id === selectedAsset.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
  }, [selectedAsset, workOrders]);

  const currentAssignment = useMemo(() => {
    if (!selectedAsset || !selectedWeekId) return null;
    return weekAssignments.find(a => a.asset_id === selectedAsset.id) || null;
  }, [selectedAsset, weekAssignments, selectedWeekId]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const saveWeekMutation = useMutation({
    mutationFn: async (form) => {
      // If setting to Active, deactivate others
      if (form.status === "Active" || form.is_active) {
        const otherActives = weeks.filter(w => w.is_active && w.id !== (editingWeek?.id));
        for (const w of otherActives) {
          await base44.entities.PlanningWeeks.update(w.id, { is_active: false, status: w.status === "Active" ? "Draft" : w.status });
        }
      }
      if (editingWeek) {
        return base44.entities.PlanningWeeks.update(editingWeek.id, form);
      } else {
        return base44.entities.PlanningWeeks.create(form);
      }
    },
    onSuccess: (newWeek) => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      if (!editingWeek && newWeek?.id) setSelectedWeekId(newWeek.id);
      toast({ title: editingWeek ? "Week updated" : "Planning week created" });
      setEditingWeek(null);
    },
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async ({ formData, existingId }) => {
      if (existingId) {
        return base44.entities.PlanningAssignments.update(existingId, formData);
      }
      // Check for duplicate
      const dupe = weekAssignments.find(a => a.asset_id === formData.asset_id);
      if (dupe) {
        throw new Error("This asset is already assigned to this week.");
      }
      return base44.entities.PlanningAssignments.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
      toast({ title: "Assignment saved" });
    },
    onError: (err) => {
      toast({ title: err.message || "Failed to save assignment", variant: "destructive" });
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
    const asset = assetsMap[assignment.asset_id];
    setAssigningFromAsset(asset || null);
    setEditingAssignment(assignment);
    setAssignModalOpen(true);
  };

  const handleSaveAssignment = async (formData, existingId) => {
    await saveAssignmentMutation.mutateAsync({ formData, existingId });
  };

  const handleRemoveAssignment = (assignment) => {
    if (window.confirm("Remove this assignment?")) {
      removeAssignmentMutation.mutate(assignment.id);
    }
  };

  const weekStatusBadge = (status) => {
    const map = { Active: "bg-emerald-100 text-emerald-700", Draft: "bg-slate-100 text-slate-500", Locked: "bg-amber-100 text-amber-700", Archived: "bg-slate-100 text-slate-400" };
    return map[status] || "bg-slate-100 text-slate-500";
  };

  const isLoading = weeksLoading || assignmentsLoading;

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

      {/* Week Selector Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Week</span>
        </div>
        <Select value={selectedWeekId || ""} onValueChange={setSelectedWeekId}>
          <SelectTrigger className="w-72 h-8 text-sm border-slate-200">
            <SelectValue placeholder="Select a planning week..." />
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
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{format(new Date(selectedWeek.start_date), "MMM d")} — {format(new Date(selectedWeek.end_date), "MMM d, yyyy")}</span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${weekStatusBadge(selectedWeek.status)}`}>{selectedWeek.status}</span>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600"
              onClick={() => { setEditingWeek(selectedWeek); setWeekModalOpen(true); }}>
              Edit Week
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
            <PlanningFilters
              filters={filters}
              onChange={setFilters}
              onApply={() => setAppliedFilters(filters)}
              onReset={() => { setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }}
              assets={assets}
            />
            {/* Map */}
            <div className="flex-1 min-h-[400px]">
              <PlanningMap
                assets={filteredAssets}
                assignments={weekAssignments}
                selectedAssetId={selectedAsset?.id}
                onSelectAsset={handleSelectAsset}
              />
            </div>
            {/* Map legend */}
            <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-slate-500">
              {[
                { color: "#EF4444", label: "P1 / Critical" },
                { color: "#F97316", label: "P2 / High" },
                { color: "#3B82F6", label: "Medium" },
                { color: "#22C55E", label: "Low" },
                { color: "#9CA3AF", label: "Completed / Unassigned" },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full inline-block border border-white shadow-sm" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — 40% — Planning Panel */}
        <div className="flex flex-col w-[40%] overflow-hidden bg-slate-50">
          <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">

            {/* KPI Bar */}
            <PlanningKPIBar assignments={weekAssignments} />

            {/* Assignment Table */}
            <div className="bg-white rounded-lg border border-slate-200 p-3 flex flex-col" style={{ minHeight: 280 }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Assignments</span>
                {selectedWeek && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{weekAssignments.length} total</span>
                    {selectedAsset && !assignedAssetIds.has(selectedAsset.id) && (
                      <Button size="sm" className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleOpenAssign(selectedAsset)}>
                        <Plus className="w-3 h-3" /> Assign Selected
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {!selectedWeek && (
                <div className="flex items-center justify-center h-24 text-slate-400 text-sm">Select a planning week to view assignments</div>
              )}
              {selectedWeek && (
                <AssignmentTable
                  assignments={filteredAssignments}
                  assetsMap={assetsMap}
                  onSelect={handleSelectAssignmentRow}
                  selectedId={selectedAssignment?.id}
                  onEdit={handleEditAssignment}
                  onRemove={handleRemoveAssignment}
                  onStatusChange={() => {}}
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
          </div>
        </div>
      </div>

      {/* Modals */}
      <PlanningWeekModal
        open={weekModalOpen}
        onOpenChange={setWeekModalOpen}
        week={editingWeek}
        onSave={(form) => saveWeekMutation.mutateAsync(form)}
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