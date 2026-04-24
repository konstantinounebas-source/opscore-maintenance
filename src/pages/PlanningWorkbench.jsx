import React, { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MapWorkspaceContainer from "@/components/workbench/MapWorkspaceContainer";
import PlanningReviewPanel from "@/components/workbench/PlanningReviewPanel";
import AssetPopup from "@/components/workbench/AssetPopup";
import { computePinColor, computePriorityBucket } from "@/components/planning/planningUtils";
import PlanningWeekModal from "@/components/planning/PlanningWeekModal";

let _mapIdCounter = 1;
function newMapId() { return `map-${_mapIdCounter++}`; }

export default function PlanningWorkbench() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Global data via React Query ─────────────────────────────────────────────
  const { data: weeks = [] }                                          = useQuery({ queryKey: ["planningWeeks"],        queryFn: () => base44.entities.PlanningWeeks.list("-created_date"), initialData: [] });
  const { data: allAssignments = [] }                                 = useQuery({ queryKey: ["planningAssignments"],  queryFn: () => base44.entities.PlanningAssignments.list(), initialData: [] });
  const { data: assets = [] }                                         = useQuery({ queryKey: ["assets"],               queryFn: () => base44.entities.Assets.list(), initialData: [] });
  const { data: incidents = [] }                                      = useQuery({ queryKey: ["incidents"],            queryFn: () => base44.entities.Incidents.list(), initialData: [] });
  const { data: workOrders = [] }                                     = useQuery({ queryKey: ["workOrders"],           queryFn: () => base44.entities.WorkOrders.list(), initialData: [] });
  const { data: planningTypes = [] }                                  = useQuery({ queryKey: ["planningTypes"],        queryFn: () => base44.entities.PlanningTypes.list(), initialData: [] });
  const { data: layers = [] }                                         = useQuery({ queryKey: ["planningLayers"],       queryFn: () => base44.entities.PlanningLayers.list(), initialData: [] });
  const { data: layerAssets = [] }                                    = useQuery({ queryKey: ["planningLayerAssets"],  queryFn: () => base44.entities.PlanningLayerAssets.list(), initialData: [] });
  const { data: mapLayerLinks = [] }                                  = useQuery({ queryKey: ["workbenchMapLayers"],   queryFn: () => base44.entities.WorkbenchMapLayers.list(), initialData: [] });

  // ── Map workspace collection ────────────────────────────────────────────────
  const [mapWorkspaces, setMapWorkspaces] = useState([{ id: newMapId() }]);
  const addMap    = () => { if (mapWorkspaces.length < 4) setMapWorkspaces(prev => [...prev, { id: newMapId() }]); };
  const removeMap = (id) => { if (mapWorkspaces.length > 1) setMapWorkspaces(prev => prev.filter(m => m.id !== id)); };

  // ── Week modal ──────────────────────────────────────────────────────────────
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);

  // ── Asset popup and assignment modal ────────────────────────────────────────
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState(null);
  const [photoViewerAsset, setPhotoViewerAsset] = useState(null);
  const [zoomToAsset, setZoomToAsset] = useState(null);

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
    mutationFn: async (id) => {
      await base44.entities.PlanningLayers.delete(id);
      // Also remove all map links for this layer
      const links = mapLayerLinks.filter(ml => ml.layer_id === id);
      await Promise.all(links.map(l => base44.entities.WorkbenchMapLayers.delete(l.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planningLayers"] });
      queryClient.invalidateQueries({ queryKey: ["planningLayerAssets"] });
      queryClient.invalidateQueries({ queryKey: ["workbenchMapLayers"] });
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

  // ── WorkbenchMapLayers mutations ────────────────────────────────────────────
  const addLayerToMapMutation = useMutation({
    mutationFn: async ({ mapId, layerId }) => {
      const existing = mapLayerLinks.find(ml => ml.map_id === mapId && ml.layer_id === layerId);
      if (existing) return existing;
      return base44.entities.WorkbenchMapLayers.create({ map_id: mapId, layer_id: layerId, is_enabled: true, display_order: mapLayerLinks.filter(ml => ml.map_id === mapId).length });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workbenchMapLayers"] }); },
  });

  const removeLayerFromMapMutation = useMutation({
    mutationFn: (linkId) => base44.entities.WorkbenchMapLayers.delete(linkId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workbenchMapLayers"] }); },
  });

  const toggleMapLayerMutation = useMutation({
    mutationFn: ({ linkId, isEnabled }) => base44.entities.WorkbenchMapLayers.update(linkId, { is_enabled: isEnabled }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["workbenchMapLayers"] }); },
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

  const handleAddLayerToMap = useCallback(async (mapId, layerId) => {
    await addLayerToMapMutation.mutateAsync({ mapId, layerId });
  }, [addLayerToMapMutation]);

  const handleRemoveLayerFromMap = useCallback(async (linkId) => {
    await removeLayerFromMapMutation.mutateAsync(linkId);
  }, [removeLayerFromMapMutation]);

  const handleToggleMapLayer = useCallback(async (linkId, isEnabled) => {
    await toggleMapLayerMutation.mutateAsync({ linkId, isEnabled });
  }, [toggleMapLayerMutation]);

  const isLoading = false; // Always have fallback data

  // ── Resizable right panel ────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(288); // px, ~w-72
  const [panelHidden, setPanelHidden] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const containerRef = useRef(null);
  const MIN_WIDTH = 60;   // ~5% of typical screen
  const MAX_WIDTH_FRAC = 0.40; // 40% of container

  const handleDragStart = (e) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    e.preventDefault();
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging.current) return;
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
    const maxWidth = containerWidth * MAX_WIDTH_FRAC;
    const delta = dragStartX.current - e.clientX; // dragging left = expand, right = shrink
    const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
    setPanelWidth(newWidth);
    if (newWidth <= MIN_WIDTH + 10) setPanelHidden(true);
    else setPanelHidden(false);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  const togglePanel = () => {
    if (panelHidden) {
      setPanelHidden(false);
      setPanelWidth(288);
    } else {
      setPanelHidden(true);
    }
  };

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
      <div ref={containerRef} className="flex flex-1 overflow-hidden gap-0 relative">
        {/* LEFT: Map workspace zone — takes remaining space */}
        <div className="flex-1 overflow-hidden min-w-0">
          <MapWorkspaceContainer
            mapWorkspaces={mapWorkspaces}
            onAddMap={addMap}
            onRemoveMap={removeMap}
            allAssets={assets}
            allAssignments={allAssignments}
            globalLayers={layers}
            mapLayerLinks={mapLayerLinks}
            layers={layers}
            layerAssets={layerAssets}
            weeks={weeks}
            incidents={incidents}
            workOrders={workOrders}
            incidentsByAsset={incidentsByAsset}
            workOrdersByAsset={workOrdersByAsset}
            planningTypes={planningTypes}
            onSaveAssignment={handleSaveAssignment}
           onCreateGlobalLayer={handleCreateLayer}
           onDeleteGlobalLayer={handleDeleteLayer}
           onAddLayerToMap={handleAddLayerToMap}
           onRemoveLayerFromMap={handleRemoveLayerFromMap}
           onToggleMapLayer={handleToggleMapLayer}
           onCreateLayer={handleCreateLayer}
           onDeleteLayer={handleDeleteLayer}
           onAddToLayer={handleAddToLayer}
           onRemoveFromLayer={handleRemoveFromLayer}
           zoomToAsset={zoomToAsset}
           onZoomCompleted={() => {
             setZoomToAsset(null);
           }}
          />
        </div>

        {/* Resize handle + toggle button */}
        <div
          className="relative shrink-0 flex items-center justify-center cursor-col-resize select-none z-10"
          style={{ width: 10 }}
          onMouseDown={handleDragStart}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-slate-200 hover:bg-indigo-400 transition-colors" />
          <button
            onClick={togglePanel}
            onMouseDown={e => e.stopPropagation()}
            className="absolute z-20 bg-white border border-slate-200 rounded-full shadow p-0.5 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            style={{ top: "50%" , transform: "translateY(-50%)" }}
            title={panelHidden ? "Show panel" : "Hide panel"}
          >
            {panelHidden
              ? <ChevronLeft className="h-3 w-3 text-slate-500" />
              : <ChevronRight className="h-3 w-3 text-slate-500" />
            }
          </button>
        </div>

        {/* RIGHT: Passive review panel — resizable */}
        <div
          className="shrink-0 overflow-hidden border-l border-slate-200 transition-all duration-150"
          style={{ width: panelHidden ? 0 : panelWidth, minWidth: panelHidden ? 0 : undefined }}
        >
          {!panelHidden && (
            <PlanningReviewPanel
              weeks={weeks}
              allAssignments={allAssignments}
              assetsMap={assetsMap}
              incidentsByAsset={incidentsByAsset}
              workOrdersByAsset={workOrdersByAsset}
              onZoomToAsset={(asset) => {
                setZoomToAsset(asset);
              }}
              onSelectAssetForPopup={(asset) => {
                setSelectedAsset(asset);
                setPopupPos({ x: 50, y: 50 });
              }}
            />
          )}
        </div>
      </div>

      {/* Asset Popup */}
      {selectedAsset && popupPos && (
        <AssetPopup
          asset={selectedAsset}
          popupPos={popupPos}
          assignment={allAssignments.find(a => a.asset_id === selectedAsset.id) || null}
          incidents={incidents || []}
          workOrders={workOrders || []}
          weeks={weeks || []}
          planningTypes={planningTypes || []}
          onClose={() => {
            setSelectedAsset(null);
            setPopupPos(null);
          }}
          onSaveAssignment={handleSaveAssignment}
          onZoomToAsset={(asset) => {
            setZoomToAsset(asset);
          }}
          onShowPhotos={(asset) => {
            setPhotoViewerAsset(asset);
          }}
        />
      )}

      {/* Photo Viewer Modal */}
      {photoViewerAsset && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPhotoViewerAsset(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl max-h-96 overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{photoViewerAsset.asset_id} - Φωτογραφίες</h2>
              <button 
                onClick={() => setPhotoViewerAsset(null)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-sm text-slate-500">
              {photoViewerAsset.evidence_types && photoViewerAsset.evidence_types.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {photoViewerAsset.evidence_types.map((type, idx) => (
                    <span key={idx} className="bg-slate-100 px-2 py-1 rounded text-xs">{type}</span>
                  ))}
                </div>
              ) : (
                <p>Δεν υπάρχουν φωτογραφίες για αυτό το στοιχείο</p>
              )}
            </div>
          </div>
        </div>
      )}

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