import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import MultiMapInstance from "./MultiMapInstance";
import MapFilterOverlay from "./MapFilterOverlay";
import MapSummaryStrip from "./MapSummaryStrip";
import AssignAssetModal from "./AssignAssetModal";
import PlanningAssignmentPanel from "./PlanningAssignmentPanel";
import LayersPanel from "./LayersPanel";
import { Loader2, Plus, X, PanelRightClose, PanelRightOpen, Layers, Pencil, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MIN_LEFT_PCT = 35;
const MIN_RIGHT_PCT = 20;

const MAP_BORDER = [
  "border-indigo-300", "border-emerald-300", "border-amber-300", "border-purple-300"
];
const MAP_BADGE = [
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-purple-100 text-purple-700 border-purple-200",
];

function defaultPanelState() {
  return {
    selectedWeekId: "",
    filterAssetStatus: "",
    filterAssignmentStatus: "",
    filterShelterType: "",
    filterCity: "",
    filterMunicipality: "",
    filterCrew: "",
    filterAssigned: "",
    assetSearch: "",
    selectedAssetId: null,
    markerColor: "",
    colorBy: "",
    filterLayerId: "",
    title: "", // custom user-defined map title
  };
}

function applyPanelFilters(assets, assignments, state, layers = []) {
  const weekAssignments = state.selectedWeekId
    ? assignments.filter(a => a.planning_week_id === state.selectedWeekId)
    : [];

  const assignmentByAsset = {};
  weekAssignments.forEach(a => { assignmentByAsset[a.asset_id] = a; });

  const searchVal = (state.assetSearch || "").trim().toLowerCase();

  // Build layer asset set if a layer filter is active
  const layerAssetIds = state.filterLayerId
    ? new Set((layers.find(l => l.id === state.filterLayerId)?.assetIds || []))
    : null;

  const filteredAssets = assets.filter(a => {
    // Layer filter
    if (layerAssetIds && !layerAssetIds.has(a.id)) return false;
    // Asset status
    if (state.filterAssetStatus && a.status !== state.filterAssetStatus) return false;
    // Shelter type
    if (state.filterShelterType && a.shelter_type !== state.filterShelterType) return false;
    // City
    if (state.filterCity && a.city !== state.filterCity) return false;
    // Municipality
    if (state.filterMunicipality && a.municipality !== state.filterMunicipality) return false;
    // Asset search (exact ID match or partial)
    if (searchVal) {
      const match =
        (a.active_shelter_id || "").toLowerCase() === searchVal ||
        (a.asset_id || "").toLowerCase() === searchVal ||
        (a.active_shelter_id || "").toLowerCase().includes(searchVal) ||
        (a.asset_id || "").toLowerCase().includes(searchVal) ||
        (a.city || "").toLowerCase().includes(searchVal);
      if (!match) return false;
    }
    // Assigned / Unassigned toggle
    if (state.filterAssigned === "Assigned" && !assignmentByAsset[a.id]) return false;
    if (state.filterAssigned === "Unassigned" && assignmentByAsset[a.id]) return false;

    // Assignment-specific filters (only apply when a week is selected)
    if (state.selectedWeekId) {
      const asgn = assignmentByAsset[a.id];
      if (state.filterAssignmentStatus && (!asgn || asgn.assignment_status !== state.filterAssignmentStatus)) return false;
      if (state.filterCrew && (!asgn || asgn.crew_id !== state.filterCrew)) return false;
    }
    return true;
  });

  const assetIdSet = new Set(filteredAssets.map(a => a.id));
  const filteredAssignments = weekAssignments.filter(a => assetIdSet.has(a.asset_id));

  return { filteredAssets, filteredAssignments, assignmentByAsset };
}

export default function MultiMapView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [splitPct, setSplitPct] = useState(62);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  // Dynamic panel count (1-4)
  const [panelCount, setPanelCount] = useState(4);
  const [panelStates, setPanelStates] = useState([
    defaultPanelState(), defaultPanelState(), defaultPanelState(), defaultPanelState(),
  ]);

  // Right-panel shared week selection
  const [rightSelectedWeekId, setRightSelectedWeekId] = useState("");
  // Right panel tab
  const [rightTab, setRightTab] = useState("assets"); // "assets" | "layers"
  // Active map panel index (for right-panel week sync indicator)
  const [activePanelIndex, setActivePanelIndex] = useState(null);

  // Panel title editing state
  const [editingTitleIdx, setEditingTitleIdx] = useState(null);
  const [editingTitleVal, setEditingTitleVal] = useState("");

  // ── Layers: persisted to backend entity ──────────────────────────────────────
  const { data: rawLayers = [] } = useQuery({
    queryKey: ["mapLayers"],
    queryFn: () => base44.entities.MapLayers.list("-created_date"),
    staleTime: 30000,
  });

  const createLayerMutation = useMutation({
    mutationFn: (data) => base44.entities.MapLayers.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mapLayers"] }),
  });
  const updateLayerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MapLayers.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mapLayers"] }),
  });
  const deleteLayerMutation = useMutation({
    mutationFn: (id) => base44.entities.MapLayers.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mapLayers"] }),
  });

  const handleCreateLayer = (data) => {
    createLayerMutation.mutate({ name: data.name, color: data.color, assignment_type: data.assignmentType || "", asset_ids: [], is_shared: true });
  };
  const handleDeleteLayer = (id) => deleteLayerMutation.mutate(id);
  const handleUpdateLayer = (id, data) => {
    const update = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.color !== undefined) update.color = data.color;
    updateLayerMutation.mutate({ id, data: update });
  };
  const handleAddAssetToLayer = (layerId, assetId) => {
    const layer = rawLayers.find(l => l.id === layerId);
    if (!layer) return;
    const ids = [...new Set([...(layer.asset_ids || []), assetId])];
    updateLayerMutation.mutate({ id: layerId, data: { asset_ids: ids } });
  };
  const handleRemoveAssetFromLayer = (layerId, assetId) => {
    const layer = rawLayers.find(l => l.id === layerId);
    if (!layer) return;
    const ids = (layer.asset_ids || []).filter(id => id !== assetId);
    updateLayerMutation.mutate({ id: layerId, data: { asset_ids: ids } });
  };

  // Normalize layers: map asset_ids → assetIds for compatibility with child components
  const enrichedLayers = useMemo(() => rawLayers.map(l => ({
    ...l,
    assetIds: l.asset_ids || [],
    assignmentType: l.assignment_type || "",
    assetCount: (l.asset_ids || []).length,
  })), [rawLayers]);

  // Assign modal state
  const [assignModal, setAssignModal] = useState({
    open: false, panelIndex: null, asset: null, existingAssignment: null, week: null
  });

  // Highlighted asset (synced between table and maps)
  const [highlightedAssetId, setHighlightedAssetId] = useState(null);

  const updatePanel = useCallback((index, updates) => {
    setPanelStates(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const addPanel = () => { if (panelCount < 4) setPanelCount(c => c + 1); };
  const removePanel = (idx) => {
    setPanelCount(c => Math.max(1, c - 1));
    setPanelStates(prev => { const next = [...prev]; next[idx] = defaultPanelState(); return next; });
  };

  // Shared data
  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Assets.list(),
    staleTime: 60000,
  });
  const { data: allAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["planningAssignments"],
    queryFn: () => base44.entities.PlanningAssignments.list(),
    staleTime: 30000,
  });
  const { data: weeks = [] } = useQuery({
    queryKey: ["planningWeeks"],
    queryFn: () => base44.entities.PlanningWeeks.list("-created_date"),
  });
  const { data: crews = [] } = useQuery({
    queryKey: ["crews"],
    queryFn: () => base44.entities.Crews.list(),
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incidents.list(),
  });
  const { data: workOrders = [] } = useQuery({
    queryKey: ["workOrders"],
    queryFn: () => base44.entities.WorkOrders.list(),
  });

  const isLoading = assetsLoading || assignmentsLoading;

  // Per-panel derived data (layer filter applied inside applyPanelFilters via assetSearch/filterLayerId — layer asset IDs passed to MultiMapInstance directly)
  const panelData = useMemo(() =>
    panelStates.map(state => applyPanelFilters(assets, allAssignments, state, layers)),
    [panelStates, assets, allAssignments, layers]
  );

  // Resizable divider
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(100 - MIN_RIGHT_PCT, Math.max(MIN_LEFT_PCT, pct)));
      if (rightCollapsed) setRightCollapsed(false);
    };
    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [rightCollapsed]);

  // Save panel title
  const handleSavePanelTitle = (idx) => {
    updatePanel(idx, { title: editingTitleVal.trim() });
    setEditingTitleIdx(null);
    setEditingTitleVal("");
  };

  // Handle asset click on map
  const handleAssetClick = useCallback((panelIndex, asset) => {
    setActivePanelIndex(panelIndex);
    const state = panelStates[panelIndex];
    if (state.selectedAssetId === asset.id) {
      updatePanel(panelIndex, { selectedAssetId: null });
      setHighlightedAssetId(null);
      return;
    }
    updatePanel(panelIndex, { selectedAssetId: asset.id });
    setHighlightedAssetId(asset.id);
    const week = weeks.find(w => w.id === state.selectedWeekId);
    const existingAssignment = panelData[panelIndex].assignmentByAsset[asset.id] || null;
    setAssignModal({ open: true, panelIndex, asset, existingAssignment, week });
  }, [panelStates, panelData, weeks, updatePanel]);

  const handleSaveAssignment = async (formData, existingId) => {
    if (existingId) {
      await base44.entities.PlanningAssignments.update(existingId, formData);
    } else {
      await base44.entities.PlanningAssignments.create(formData);
    }
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
  };

  const handleDeleteAssignment = async (id) => {
    await base44.entities.PlanningAssignments.delete(id);
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
  };

  // From right panel: assign asset to week
  const handleAssignFromTable = (asset) => {
    const week = weeks.find(w => w.id === rightSelectedWeekId);
    const existingAssignment = allAssignments.find(a => a.asset_id === asset.id && a.planning_week_id === rightSelectedWeekId) || null;
    setAssignModal({ open: true, panelIndex: null, asset, existingAssignment, week });
  };

  const handleRemoveFromTable = async (asgn) => {
    await base44.entities.PlanningAssignments.delete(asgn.id);
    queryClient.invalidateQueries({ queryKey: ["planningAssignments"] });
  };

  const handleOpenAsset = (asset) => {
    navigate(`/AssetDetail?id=${asset.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm text-slate-500">Loading planning data…</span>
      </div>
    );
  }

  // Grid layout based on panel count
  const getGridClass = (count) => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-2 grid-rows-1";
    return "grid-cols-2 grid-rows-2";
  };

  const activePanels = Array.from({ length: panelCount }, (_, i) => i);
  const effectiveSplit = rightCollapsed ? 100 : splitPct;

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-slate-100">

      {/* LEFT: Maps grid */}
      <div
        className={`grid ${getGridClass(panelCount)} gap-1.5 p-1.5 flex-shrink-0`}
        style={{ width: `${effectiveSplit}%`, overflow: "hidden" }}
      >
        {activePanels.map(i => {
          const { filteredAssets, filteredAssignments, assignmentByAsset } = panelData[i];
          const state = panelStates[i];

          return (
            <div
              key={i}
              className={`relative rounded-lg overflow-hidden border-2 ${MAP_BORDER[i]} bg-white`}
              style={{ isolation: "isolate", minHeight: 0, height: "100%" }}
            >
              {/* Map label badge + editable title */}
              <div className={`absolute top-1.5 left-1.5 z-[600] flex items-center gap-1 group`}>
                {editingTitleIdx === i ? (
                  <div className="flex items-center gap-1 bg-white/95 border border-slate-300 rounded-lg shadow-md px-1.5 py-0.5">
                    <input
                      autoFocus
                      value={editingTitleVal}
                      onChange={e => setEditingTitleVal(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSavePanelTitle(i); if (e.key === "Escape") setEditingTitleIdx(null); }}
                      className="text-[10px] font-semibold outline-none bg-transparent w-32 text-slate-800"
                      placeholder={`Map ${i + 1} title...`}
                    />
                    <button onClick={() => handleSavePanelTitle(i)} className="text-emerald-500 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setEditingTitleIdx(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm cursor-pointer ${MAP_BADGE[i]}`}
                    onClick={() => { setEditingTitleIdx(i); setEditingTitleVal(panelStates[i].title || ""); }}
                    title="Click to rename this map"
                  >
                    {panelStates[i].title || `Map ${i + 1}`}
                    <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Remove panel button (only when >1 panel) */}
              {panelCount > 1 && (
                <button
                  onClick={() => removePanel(i)}
                  className="absolute top-1.5 right-1.5 z-[600] w-5 h-5 rounded-full bg-white/90 border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 flex items-center justify-center shadow-sm transition-colors"
                  title="Remove map"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Filter overlay */}
              <MapFilterOverlay
                state={state}
                onUpdate={(updates) => updatePanel(i, updates)}
                assets={assets}
                crews={crews}
                layers={enrichedLayers}
              />

              {/* Map */}
              <MultiMapInstance
                assets={filteredAssets}
                assignments={filteredAssignments}
                selectedAssetId={highlightedAssetId}
                onSelectAsset={(asset) => handleAssetClick(i, asset)}
                markerColor={state.markerColor}
                colorBy={state.colorBy}
                layers={enrichedLayers}
                filterLayerId={state.filterLayerId}
              />

              {/* Bottom summary strip (replaces old color legend) */}
              <MapSummaryStrip
                assets={filteredAssets}
                assignments={filteredAssignments}
                selectedWeekId={state.selectedWeekId}
              />
            </div>
          );
        })}

        {/* Add map button */}
        {panelCount < 4 && (
          <div className="relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-center" style={{ minHeight: 100 }}>
            <button
              onClick={addPanel}
              className="flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 group-hover:border-indigo-400 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Add Map</span>
            </button>
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div
        onMouseDown={onMouseDown}
        className="w-1.5 flex-shrink-0 bg-slate-300 hover:bg-indigo-400 active:bg-indigo-500 cursor-col-resize transition-colors relative group flex items-center justify-center"
      >
        <button
          onClick={() => setRightCollapsed(v => !v)}
          className="absolute z-10 w-5 h-8 bg-white border border-slate-300 rounded-full flex items-center justify-center shadow-sm hover:bg-indigo-50 hover:border-indigo-300 transition-colors pointer-events-auto"
          title={rightCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {rightCollapsed
            ? <PanelRightOpen className="w-3 h-3 text-slate-500" />
            : <PanelRightClose className="w-3 h-3 text-slate-500" />
          }
        </button>
      </div>

      {/* RIGHT: Unified panel with tabs */}
      {!rightCollapsed && (
        <div
          className="flex-1 overflow-hidden border-l border-slate-200 flex flex-col"
          style={{ minWidth: `${MIN_RIGHT_PCT}%` }}
        >
          {/* Tab switcher */}
          <div className="flex border-b border-slate-200 bg-white shrink-0 flex-col">
            <div className="flex">
              <button
                onClick={() => setRightTab("assets")}
                className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${rightTab === "assets" ? "text-indigo-700 border-b-2 border-indigo-500 bg-indigo-50" : "text-slate-400 hover:text-slate-600"}`}
              >
                Assets
              </button>
              <button
                onClick={() => setRightTab("layers")}
                className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${rightTab === "layers" ? "text-indigo-700 border-b-2 border-indigo-500 bg-indigo-50" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Layers className="w-3 h-3" /> Layers {enrichedLayers.length > 0 && <span className="text-[9px]">({enrichedLayers.length})</span>}
              </button>
            </div>
            {/* Active map context indicator */}
            {activePanelIndex !== null && panelStates[activePanelIndex] && (
              <div
                className={`px-2.5 py-1 text-[9px] font-semibold flex items-center gap-1.5 border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${MAP_BADGE[activePanelIndex]}`}
                onClick={() => {
                  const weekId = panelStates[activePanelIndex].selectedWeekId;
                  if (weekId) setRightSelectedWeekId(weekId);
                }}
                title="Click to sync right panel to this map's week"
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${MAP_BORDER[activePanelIndex].replace("border-","bg-")}`} />
                Active: {panelStates[activePanelIndex].title || `Map ${activePanelIndex + 1}`}
                {panelStates[activePanelIndex].selectedWeekId && (
                  <span className="ml-auto text-slate-500 font-normal">
                    {weeks.find(w => w.id === panelStates[activePanelIndex].selectedWeekId)?.week_code || ""}
                    {" · "}
                    <span className="underline">Sync week ↓</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === "assets" && (
              <PlanningAssignmentPanel
                assets={assets}
                allAssignments={allAssignments}
                weeks={weeks}
                selectedWeekId={rightSelectedWeekId}
                onSelectWeek={setRightSelectedWeekId}
                highlightedAssetId={highlightedAssetId}
                onHighlightAsset={setHighlightedAssetId}
                onAssign={handleAssignFromTable}
                onEditAssignment={(asgn) => {
                  const asset = assets.find(a => a.id === asgn.asset_id);
                  const week = weeks.find(w => w.id === asgn.planning_week_id);
                  setAssignModal({ open: true, panelIndex: null, asset, existingAssignment: asgn, week });
                }}
                onRemoveAssignment={handleRemoveFromTable}
                onOpenAsset={handleOpenAsset}
                layers={enrichedLayers}
              />
            )}
            {rightTab === "layers" && (
              <LayersPanel
                layers={enrichedLayers}
                assets={assets}
                onCreateLayer={handleCreateLayer}
                onDeleteLayer={handleDeleteLayer}
                onUpdateLayer={handleUpdateLayer}
                onAddAsset={handleAddAssetToLayer}
                onRemoveAsset={handleRemoveAssetFromLayer}
              />
            )}
          </div>
        </div>
      )}

      {/* Assign Asset Modal */}
      <AssignAssetModal
        open={assignModal.open}
        onOpenChange={(v) => {
          setAssignModal(prev => ({ ...prev, open: v }));
          if (!v && assignModal.panelIndex !== null) {
            updatePanel(assignModal.panelIndex, { selectedAssetId: null });
          }
        }}
        asset={assignModal.asset}
        week={assignModal.week}
        weeks={weeks}
        existingAssignment={assignModal.existingAssignment}
        incidents={incidents}
        workOrders={workOrders}
        onSave={handleSaveAssignment}
        onDelete={handleDeleteAssignment}
        onWeekCreated={() => queryClient.invalidateQueries({ queryKey: ["planningWeeks"] })}
      />
    </div>
  );
}