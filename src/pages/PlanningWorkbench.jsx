import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MapWorkspaceContainer from "@/components/workbench/MapWorkspaceContainer";
import PlanningReviewPanel from "@/components/workbench/PlanningReviewPanel";
import { computePinColor, computePriorityBucket } from "@/components/planning/planningUtils";
import PlanningWeekModal from "@/components/planning/PlanningWeekModal";

let _mapIdCounter = 1;
function newMapId() { return `map-${_mapIdCounter++}`; }

export default function PlanningWorkbench() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Global data via React Query ─────────────────────────────────────────────
  const { data: weeks = [],           isLoading: weeksLoading }     = useQuery({ queryKey: ["planningWeeks"],        queryFn: () => base44.entities.PlanningWeeks.list("-created_date") });
  const { data: allAssignments = [],  isLoading: assignmentsLoading }= useQuery({ queryKey: ["planningAssignments"],  queryFn: () => base44.entities.PlanningAssignments.list() });
  const { data: assets = [] }                                         = useQuery({ queryKey: ["assets"],               queryFn: () => base44.entities.Assets.list() });
  const { data: incidents = [] }                                      = useQuery({ queryKey: ["incidents"],            queryFn: () => base44.entities.Incidents.list() });
  const { data: workOrders = [] }                                     = useQuery({ queryKey: ["workOrders"],           queryFn: () => base44.entities.WorkOrders.list() });
  const { data: layers = [] }                                         = useQuery({ queryKey: ["planningLayers"],       queryFn: () => base44.entities.PlanningLayers.list() });
  const { data: layerAssets = [] }                                    = useQuery({ queryKey: ["planningLayerAssets"],  queryFn: () => base44.entities.PlanningLayerAssets.list() });

  // ── Map workspace collection ────────────────────────────────────────────────
  const [mapWorkspaces, setMapWorkspaces] = useState([{ id: newMapId() }]);
  const addMap    = () => { if (mapWorkspaces.length < 4) setMapWorkspaces(prev => [...prev, { id: newMapId() }]); };
  const removeMap = (id) => { if (mapWorkspaces.length > 1) setMapWorkspaces(prev => prev.filter(m => m.id !== id)); };

  // ── Week modal ──────────────────────────────────────────────────────────────
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);

  // ── Shared lookups (read-only from map perspective) ─────────────────────────
  const assetsMap = useMemo(() => Object.fromEntries(assets.map(a => [a.id, a])), [assets]);

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

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveAssignmentMutation = useMutation({
    mutationFn: async ({ formData, existingId }) => {
      if (existingId) return base44.entities.PlanningAssignments.update(existingId, formData);
      // Check for existing assignment to the same week
      const existing = allAssignments.find(a => a.asset_id === formData.asset_id && a.planning_week_id === formData.planning_week_id);
      if (existing) return base44.entities.PlanningAssignments.update(existing.id, formData);
      return base44.entities.PlanningAssignments.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
      toast({ title: "Assignment saved" });
    },
    onError: err => toast({ title: err.message || "Failed to save assignment", variant: "destructive" }),
  });

  const createLayerMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.PlanningLayers.create({ ...data, is_active: true, created_by: user?.email });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planningLayers"] }); },
  });

  const deleteLayerMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningLayers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningLayers"] });
      queryClient.invalidateQueries({ queryKey: ["planningLayerAssets"] });
    },
  });

  const addToLayerMutation = useMutation({
    mutationFn: async ({ layerId, assetId }) => {
      const existing = layerAssets.find(la => la.planning_layer_id === layerId && la.asset_id === assetId);
      if (existing) return existing;
      return base44.entities.PlanningLayerAssets.create({ planning_layer_id: layerId, asset_id: assetId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planningLayerAssets"] }); },
  });

  const removeFromLayerMutation = useMutation({
    mutationFn: async ({ layerId, assetId }) => {
      const record = layerAssets.find(la => la.planning_layer_id === layerId && la.asset_id === assetId);
      if (record) await base44.entities.PlanningLayerAssets.delete(record.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planningLayerAssets"] }); },
  });

  const saveWeekMutation = useMutation({
    mutationFn: async ({ form, existingWeekId }) => {
      if (form.status === "Active" || form.is_active) {
        for (const w of weeks.filter(w => w.is_active && w.id !== existingWeekId)) {
          await base44.entities.PlanningWeeks.update(w.id, { is_active: false, status: w.status === "Active" ? "Draft" : w.status });
        }
      }
      return existingWeekId
        ? base44.entities.PlanningWeeks.update(existingWeekId, form)
        : base44.entities.PlanningWeeks.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      toast({ title: "Planning week saved" });
      setEditingWeek(null);
    },
  });

  const deleteWeekMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningWeeks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningWeeks"] });
      setEditingWeek(null);
    },
  });

  // ── Stable callbacks passed to map workspaces ────────────────────────────────
  const handleSaveAssignment = useCallback(async (formData, existingId) => {
    await saveAssignmentMutation.mutateAsync({ formData, existingId });
  }, [saveAssignmentMutation]);

  const handleCreateLayer = useCallback(async (data) => {
    await createLayerMutation.mutateAsync(data);
  }, [createLayerMutation]);

  const handleDeleteLayer = useCallback(async (id) => {
    await deleteLayerMutation.mutateAsync(id);
  }, [deleteLayerMutation]);

  const handleAddToLayer = useCallback(async (layerId, assetId) => {
    await addToLayerMutation.mutateAsync({ layerId, assetId });
  }, [addToLayerMutation]);

  const handleRemoveFromLayer = useCallback(async (layerId, assetId) => {
    await removeFromLayerMutation.mutateAsync({ layerId, assetId });
  }, [removeFromLayerMutation]);

  const isLoading = weeksLoading || assignmentsLoading;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">Planning Workbench</h1>
            <p className="text-[10px] text-slate-400">Operational map-based planning · {assets.length} assets · {allAssignments.length} assignments</p>
          </div>
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => { setEditingWeek(null); setWeekModalOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" /> New Week
          </Button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* LEFT: Map workspace zone — takes remaining space */}
        <div className="flex-1 overflow-hidden min-w-0">
          <MapWorkspaceContainer
            mapWorkspaces={mapWorkspaces}
            onAddMap={addMap}
            onRemoveMap={removeMap}
            allAssets={assets}
            allAssignments={allAssignments}
            layers={layers}
            layerAssets={layerAssets}
            weeks={weeks}
            incidents={incidents}
            workOrders={workOrders}
            incidentsByAsset={incidentsByAsset}
            workOrdersByAsset={workOrdersByAsset}
            onSaveAssignment={handleSaveAssignment}
            onCreateLayer={handleCreateLayer}
            onDeleteLayer={handleDeleteLayer}
            onAddToLayer={handleAddToLayer}
            onRemoveFromLayer={handleRemoveFromLayer}
          />
        </div>

        {/* RIGHT: Passive review panel — fixed width, isolated state */}
        <div className="w-72 shrink-0 overflow-hidden border-l border-slate-200">
          <PlanningReviewPanel
            weeks={weeks}
            allAssignments={allAssignments}
            assetsMap={assetsMap}
            incidentsByAsset={incidentsByAsset}
            workOrdersByAsset={workOrdersByAsset}
          />
        </div>
      </div>

      {/* Week modal */}
      <PlanningWeekModal
        open={weekModalOpen}
        onOpenChange={setWeekModalOpen}
        week={editingWeek}
        onSave={(form) => saveWeekMutation.mutateAsync({ form, existingWeekId: editingWeek?.id })}
        onDelete={(id) => deleteWeekMutation.mutateAsync(id)}
      />
    </div>
  );
}